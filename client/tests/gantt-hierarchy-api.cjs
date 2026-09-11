// Run with node --no-experimental-websocket on Node 22 (legacy Socket.IO client).
// Local integration check. Uses disposable projects and real API/Socket.IO requests.
// TEST_USERNAME/TEST_PASSWORD or TEST_TOKEN are required. KEEP_GANTT_FIXTURE=1 retains
// the final example for browser inspection and prints its project ID for cleanup.
const assert = require('node:assert/strict');
const io = require('sails.io.js')(require('socket.io-client'));

const base = process.env.TEST_BASE_URL || 'http://localhost:3008';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local testing only');
io.sails.autoConnect = false;
io.sails.useCORSRouteToGetCookie = false;
io.sails.environment = 'production';
let token = process.env.TEST_TOKEN;
let socket;
const projects = [];

const request = async (method, path, data, expected = 200) => {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: data && JSON.stringify(data),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(body)}`);
  return body;
};

const createPlan = async () => {
  const { item: project } = await request('POST', '/projects', { type: 'private', name: `Gantt hierarchy QA ${Date.now()}` });
  projects.push(project.id);
  const { item: plan } = await request('POST', `/projects/${project.id}/gantt-plan`, {});
  return { project, plan };
};

const event = (name) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Missing socket event: ${name}`)), 15000);
  const handler = (payload) => { clearTimeout(timer); socket.off(name, handler); resolve(payload); };
  socket.on(name, handler);
});

(async () => {
  try {
    if (!token) token = (await request('POST', '/access-tokens', {
      emailOrUsername: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD,
    })).item;
    const { project, plan } = await createPlan();
    const savedToken = token;
    token = undefined;
    await request('POST', `/gantt-plans/${plan.id}/items`, { task: 'Unauthorized' }, 401);
    token = savedToken;
    console.log(`Testing project ${project.id}`);
    socket = io.sails.connect(process.env.TEST_SOCKET_URL || base, { reconnection: false });
    socket.on('connect_error', (error) => console.error('Socket connection:', error.message));
    await event('connect');
    await new Promise((resolve, reject) => socket.request({
      method: 'get', url: `/api/projects/${project.id}/gantt-plan`,
      headers: { Authorization: `Bearer ${token}` },
    }, (body, response) => response.statusCode === 200 ? resolve(body) : reject(new Error(JSON.stringify(body)))));

    const create = async (task, parentId, extra = {}) => (await request('POST', `/gantt-plans/${plan.id}/items`, {
      task, parentId, startDate: '2026-09-07', endDate: '2026-09-09', expectedDurationDays: 3, ...extra,
    })).item;
    const group = await create('QA 3D Program', null, { itemType: 'summary' });
    const parent = await create('QA Prism', group.id);
    const childEvent = event('ganttItemCreate');
    const child = await create('QA Subtask', parent.id, { endDate: '2026-09-11', expectedDurationDays: 5 });
    assert.equal((await childEvent).item.parentId, parent.id);
    const other = await create('QA Other task', group.id);
    const invalid = await request('POST', `/gantt-plans/${plan.id}/items`, { task: 'Fourth level', parentId: child.id }, 422);
    assert.equal(invalid.message, 'Invalid Gantt hierarchy');
    await request('PATCH', `/gantt-items/${parent.id}`, { parentId: child.id, version: parent.version }, 422);
    await request('PATCH', `/gantt-items/${parent.id}`, { parentId: parent.id, version: parent.version }, 422);
    await request('PATCH', `/gantt-items/${parent.id}`, { parentId: other.id, version: parent.version }, 422);
    const foreign = await createPlan();
    const foreignParent = (await request('POST', `/gantt-plans/${foreign.plan.id}/items`, { task: 'Other plan' })).item;
    await request('PATCH', `/gantt-items/${child.id}`, { parentId: foreignParent.id, version: child.version }, 422);
    const changedEvent = event('ganttItemUpdate');
    const moved = (await request('PATCH', `/gantt-items/${child.id}`, { parentId: other.id, version: child.version })).item;
    assert.equal((await changedEvent).item.parentId, other.id);
    await request('PATCH', `/gantt-items/${child.id}`, { parentId: parent.id, version: child.version }, 409);
    await request('PATCH', `/gantt-items/${child.id}`, { parentId: parent.id, version: moved.version });

    // Concurrent opposite moves must not produce a cycle.
    const a = await create('Race A', null);
    const b = await create('Race B', null);
    const race = await Promise.all([[a, b], [b, a]].map(async ([from, to]) => {
      const response = await fetch(`${base}/api/gantt-items/${from.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ parentId: to.id, version: from.version }),
      });
      return response.status;
    }));
    assert.deepEqual(race.sort(), [200, 422]);

    await request('PATCH', `/gantt-items/${other.id}/dependencies`, { predecessorIds: [child.id] });
    const deletedEvent = event('ganttItemDelete');
    const removed = await request('DELETE', `/gantt-items/${group.id}`);
    assert.deepEqual(new Set(removed.included.deletedItemIds), new Set([group.id, parent.id, child.id, other.id]));
    assert.deepEqual((await deletedEvent).included.deletedItemIds, removed.included.deletedItemIds);
    const snapshot = await request('GET', `/projects/${project.id}/gantt-plan`);
    assert(!snapshot.included.ganttItems.some(({ id }) => removed.included.deletedItemIds.includes(id)));
    assert.equal(snapshot.included.ganttLinks.length, 0);

    const fixtureGroup = await create('QA 3D Program', null, { itemType: 'summary' });
    const fixtureParent = await create('QA Prism', fixtureGroup.id);
    await create('QA Subtask', fixtureParent.id, { endDate: '2026-09-11', expectedDurationDays: 5 });
    const undated = await create('QA Parent without dates', fixtureGroup.id, { startDate: null, endDate: null });
    await create('QA Scheduled child', undated.id);
    if (process.env.KEEP_GANTT_FIXTURE === '1') {
      projects.splice(projects.indexOf(project.id), 1);
      console.log(`Browser fixture: ${base}/projects/${project.id}/gantt`);
    }
    console.log('Gantt API + socket hierarchy checks passed');
  } finally {
    if (socket?.isConnected()) socket.disconnect();
    else socket?._raw?.disconnect();
    for (const id of projects) await request('DELETE', `/projects/${id}`);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
