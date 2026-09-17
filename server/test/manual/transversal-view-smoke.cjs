/* Run only in the local development server container:
 * TRANSVERSAL_SMOKE=local node test/manual/transversal-view-smoke.cjs
 * Add --keep for browser QA, then --cleanup to remove only the recorded fixtures.
 * Credentials are random, used in memory, and never printed or saved.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const knex = require('knex');
const fetch = require('node-fetch');
const config = require('../../db/knexfile');
const migration = require('../../db/migrations/20260917000000_add_project_transversal_view');

assert.equal(process.env.TRANSVERSAL_SMOKE, 'local', 'Explicit local test opt-in required');
assert.ok(['postgres', 'localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
const db = knex(config);
const manifestPath = '/tmp/planka-transversal-smoke.json';
let fixtures = { users: [], projects: [], boards: [], lists: [], cards: [] };
let ownsFixtures = false;

async function cleanup() {
  for (const projectId of fixtures.projects) {
    const project = await db('project').where({ id: projectId }).first();
    assert.ok(!project || project.name.startsWith('QA transversal '), 'Refuse cleanup outside fixtures');
  }
  await db.transaction(async (tx) => {
    await tx('card_membership').whereIn('card_id', fixtures.cards).del();
    await tx('card').whereIn('id', fixtures.cards).del();
    await tx('list').whereIn('id', fixtures.lists).del();
    await tx('board_membership').whereIn('board_id', fixtures.boards).del();
    await tx('board').whereIn('id', fixtures.boards).del();
    await tx('project_manager').whereIn('project_id', fixtures.projects).del();
    await tx('project').whereIn('id', fixtures.projects).del();
    await tx('session').whereIn('user_id', fixtures.users).del();
    await tx('user_account').whereIn('id', fixtures.users).del();
  });
  if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
}

async function request(path, token, expected = 200, method = 'GET', data) {
  const response = await fetch(`http://127.0.0.1:1337/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3008',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  assert.equal(response.status, expected, `${method} ${path}: unexpected status`);
  return response.json();
}

async function insert(table, values, bucket) {
  const [row] = await db(table).insert({ ...values, created_at: new Date(), updated_at: new Date() }).returning('id');
  if (bucket) fixtures[bucket].push(row.id);
  return { ...values, ...row };
}

async function run() {
  if (process.argv.includes('--cleanup')) {
    fixtures = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    ownsFixtures = true;
    await cleanup();
    console.log('Removed only the recorded transversal QA fixtures.');
    return;
  }
  assert.ok(!fs.existsSync(manifestPath), 'Clean up the previous fixture first');
  ownsFixtures = true;

  // Temp table shadows project on this connection; no real project is altered.
  await db.transaction(async (tx) => {
    await tx.raw('CREATE TEMP TABLE project (id bigint PRIMARY KEY) ON COMMIT DROP');
    await tx('project').insert({ id: '1' });
    await migration.up(tx);
    const row = await tx('project').first();
    assert.equal(row.transversal_mode, 'disabled');
    assert.deepEqual(row.transversal_user_ids, []);
    await migration.down(tx);
    assert.deepEqual(await tx('project').first(), { id: '1' });
  });
  console.log('PASS migration defaults and reversal on isolated temporary table');

  const suffix = crypto.randomBytes(5).toString('hex');
  const accounts = [];
  for (const role of ['manager', 'viewer', 'other']) {
    const password = crypto.randomBytes(24).toString('base64url');
    const user = await insert('user_account', {
      email: `transversal-${suffix}-${role}@example.invalid`,
      password: await bcrypt.hash(password, 10),
      role: 'boardUser', name: `QA ${role}`, language: 'pt-PT',
      subscribe_to_own_cards: false, subscribe_to_card_when_commenting: false,
      turn_off_recent_card_highlighting: false, enable_favorites_by_default: false,
      default_editor_mode: 'wysiwyg', default_home_view: 'groupedProjects',
      default_projects_order: 'byDefault', is_sso_user: false, is_deactivated: false,
    }, 'users');
    const { item: token } = await request('/access-tokens', null, 200, 'POST', { emailOrUsername: user.email, password });
    accounts.push({ user, token });
  }
  const [manager, viewer, other] = accounts;
  const project = await insert('project', {
    name: `QA transversal ${suffix}`, is_hidden: false, is_archived: false,
  }, 'projects');
  await insert('project_manager', { project_id: project.id, user_id: manager.user.id });
  const browserAdmin = await db('user_account').where({ role: 'admin', name: 'Admin User', is_deactivated: false }).first('id');
  if (browserAdmin) await insert('project_manager', { project_id: project.id, user_id: browserAdmin.id });
  const boardRows = [];
  for (const [index, name] of ['Manchester', 'Barcarès', 'Privado'].entries()) {
    const board = await insert('board', {
      project_id: project.id, name, position: index + 1, default_view: 'kanban', default_card_type: 'project',
      limit_card_types_to_default_one: false, always_display_card_creator: false,
      progress_bar_enabled: false, progress_bar_percentage: 0,
    }, 'boards');
    boardRows.push(board);
    await insert('board_membership', {
      project_id: project.id, board_id: board.id,
      user_id: index === 2 ? other.user.id : viewer.user.id, role: 'viewer', can_comment: false,
    });
    for (const [j, name2] of ['PRODUCTION', index === 1 ? '  logistique  ' : 'LOGISTIQUE', 'INSTALLATION'].entries()) {
      const list = await insert('list', { board_id: board.id, name: name2, type: 'active', position: j + 1 }, 'lists');
      for (let n = 0; n < (index === 0 && j === 1 ? 51 : 1); n += 1) {
        await insert('card', {
          board_id: board.id, list_id: list.id, type: 'project', position: n + 1,
          name: `${name} — ${j === 1 ? 'Preparar transporte' : name2} ${n + 1}`,
          description: 'Disposable local QA fixture', comments_total: 0,
          creator_user_id: manager.user.id, due_date: '2026-09-25T12:00:00Z',
        }, 'cards');
      }
    }
    const archive = await insert('list', { board_id: board.id, name: 'ARQUIVO OCULTO', type: 'archive' }, 'lists');
    await insert('list', { board_id: board.id, type: 'trash' }, 'lists');
    await insert('card', { board_id: board.id, list_id: archive.id, type: 'project', name: 'Archived', comments_total: 0 }, 'cards');
  }

  const base = `/projects/${project.id}/transversal`;
  await request(`${base}/options`, null, 401);
  await request(`${base}/options`, viewer.token, 404);
  await request(`/projects/${project.id}`, viewer.token, 403, 'PATCH', { transversalMode: 'all' });
  await request(`/projects/${project.id}`, manager.token, 200, 'PATCH', {
    transversalMode: 'selected', transversalUserIds: [viewer.user.id],
  });
  let result = await request(`${base}/options`, viewer.token);
  assert.equal(result.items.length, 3);
  assert.deepEqual(result.included.boards.map((board) => board.name).sort(), ['Barcarès', 'Manchester']);
  assert.ok(!JSON.stringify(result).includes('ARQUIVO'));
  await request(`${base}/options`, other.token, 404);
  await request(`${base}/options`, manager.token, 404);
  await request(`${base}/options?boardId=${boardRows[2].id}`, viewer.token, 404);
  await request(`${base}/cards?stage=logistique&boardId=${boardRows[2].id}`, viewer.token, 404);
  result = await request(`${base}/cards?stage=logistique`, viewer.token);
  assert.equal(result.items.length, 50);
  assert.ok(result.nextCursor);
  assert.ok(result.items.every((card) => card.boardId !== boardRows[2].id && card.description === undefined));
  const page2 = await request(`${base}/cards?stage=logistique&after=${result.nextCursor}`, viewer.token);
  assert.equal(page2.items.length, 2);
  assert.equal(page2.nextCursor, null);
  assert.equal(new Set([...result.items, ...page2.items].map((card) => card.id)).size, 52);
  assert.equal((await request(`${base}/cards?stage=missing`, viewer.token)).items.length, 0);
  const source = result.items[0];
  await insert('card_membership', { card_id: source.id, user_id: viewer.user.id });
  const withMember = await request(`${base}/cards?stage=logistique`, viewer.token);
  assert.deepEqual(withMember.items[0].members, [{ id: viewer.user.id, name: viewer.user.name }]);
  const sourceList = await db('list').where({ id: source.listId }).first();
  await db('list').where({ id: sourceList.id }).update({ name: 'TRANSPORTE QA' });
  assert.equal((await request(`${base}/cards?stage=logistique`, viewer.token)).items.length, 1);
  assert.ok((await request(`${base}/options`, viewer.token)).items.some((stage) => stage.key === 'transporte qa'));
  const destination = await db('list').where({ board_id: source.boardId, name: 'INSTALLATION' }).first();
  await db('card').where({ id: source.id }).update({ list_id: destination.id });
  assert.ok((await request(`${base}/cards?stage=installation`, viewer.token)).items.some((card) => card.id === source.id));
  await db('card').where({ id: source.id }).update({ list_id: sourceList.id });
  await db('list').where({ id: sourceList.id }).update({ name: sourceList.name });
  const temporaryList = await insert('list', {
    board_id: source.boardId, name: 'TEMP QA', type: 'active', position: 100,
  }, 'lists');
  assert.ok((await request(`${base}/options`, viewer.token)).items.some((stage) => stage.key === 'temp qa'));
  await db('list').where({ id: temporaryList.id }).del();
  assert.ok(!(await request(`${base}/options`, viewer.token)).items.some((stage) => stage.key === 'temp qa'));
  await request(`/projects/${project.id}`, manager.token, 422, 'PATCH', {
    transversalUserIds: ['1'],
  });
  await request(`/projects/${project.id}`, manager.token, 200, 'PATCH', { transversalMode: 'all' });
  assert.equal((await request(`${base}/options`, other.token)).included.boards.length, 1);
  await request(`/projects/${project.id}`, manager.token, 200, 'PATCH', {
    transversalMode: 'selected', transversalUserIds: [],
  });
  await request(`${base}/options`, viewer.token, 404);
  await request(`/projects/${project.id}`, manager.token, 200, 'PATCH', {
    transversalUserIds: [viewer.user.id],
  });
  await db('board_membership').where({ user_id: viewer.user.id, project_id: project.id }).del();
  await request(`${base}/options`, viewer.token, 404);
  await request(`/projects/${project.id}`, manager.token, 200, 'PATCH', { transversalMode: 'disabled' });
  await request(`${base}/cards?stage=logistique`, manager.token, 404);
  console.log('PASS live API: authentication, manager-only settings, selected/all/disabled, board isolation, filters, archive exclusion, pagination, members, source changes and revoked membership');

  if (process.argv.includes('--keep')) {
    // Keep disabled so browser QA can exercise the actual settings flow.
    fs.writeFileSync(manifestPath, JSON.stringify(fixtures));
    console.log(`Browser QA fixture: http://localhost:3008/projects/${project.id}`);
  } else await cleanup();
}

run().catch(async (error) => {
  console.error(error.message);
  if (ownsFixtures && !process.argv.includes('--cleanup')) {
    try { await cleanup(); } catch (cleanupError) {
      fs.writeFileSync(manifestPath, JSON.stringify(fixtures));
      console.error(`Fixture cleanup pending: ${cleanupError.message}`);
    }
  }
  process.exitCode = 1;
}).finally(() => db.destroy());
