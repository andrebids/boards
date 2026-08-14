/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/* eslint-disable no-await-in-loop, no-restricted-syntax */

const knex = require('knex');

const knexConfig = require('../db/knexfile');
const { differenceInDays, parseDate } = require('../utils/gantt-dates');

const SOURCE_ITEMS = [
  [
    'Christopher',
    'Finish chatbot v1 (general, 3D, 2D, postcard)',
    'Simu Studio',
    '2026-08-10',
    '2026-08-14',
    'inProgress',
  ],
  ['Christopher', 'Decor Pipeline', 'Simu Studio', '2026-08-17', '2026-08-21', 'notStarted'],
  ['Christopher', 'Finish ruler system', 'Simu Studio', '2026-08-24', '2026-08-28', 'notStarted'],
  ['Christopher', 'Make AI videos robust', 'Simu Studio', '2026-08-31', '2026-09-04', 'notStarted'],
  ['Christopher', 'Sales Rep homepage', 'Simu Studio', null, null, 'notStarted'],
  ['Christopher', 'API to get stock', 'Simu Studio', null, null, 'notStarted'],
  ['André', 'Ticket System', 'Misc', null, null, 'notStarted'],
  ['André', 'Boards V2', 'Misc', null, null, 'notStarted'],
  ['André', 'InDesign plugin', 'Misc', null, null, 'notStarted'],
  ['André', 'Logo and Simu project forms', 'Simu Studio', null, null, 'notStarted'],
  [
    'Carlos',
    'Prism: finish and test the tree tool',
    '3D Program',
    '2026-08-12',
    '2026-08-17',
    'inProgress',
  ],
  [
    'Carlos',
    'Prism: prepare tests and apply feedback',
    '3D Program',
    '2026-08-17',
    '2026-08-21',
    'notStarted',
  ],
  [
    'Carlos',
    'Prism: extra animations like Champagne',
    '3D Program',
    '2026-08-24',
    '2026-08-26',
    'notStarted',
  ],
  [
    'Carlos',
    'Prism: garlands, comets and hanging motif tools',
    '3D Program',
    '2026-08-27',
    '2026-09-02',
    'notStarted',
  ],
  [
    'Carlos',
    'Prism: make download available from AI website',
    '3D Program',
    '2026-09-03',
    '2026-09-07',
    'notStarted',
  ],
  [
    'Carlos',
    'Prism: merge structure with Simu Studio',
    'Simu Studio',
    '2026-09-07',
    '2026-09-11',
    'notStarted',
  ],
];

const REQUIRED_PEOPLE = [...new Set(SOURCE_ITEMS.map(([person]) => person))];

const parseArguments = (argv) => {
  const options = {
    apply: false,
    boardId: null,
    personIdentifiers: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--apply') {
      options.apply = true;
    } else if (argument === '--dry-run') {
      options.apply = false;
    } else if (argument === '--board-id') {
      options.boardId = argv[index + 1];
      index += 1;
    } else if (argument === '--person') {
      const mapping = argv[index + 1] || '';
      const separatorIndex = mapping.indexOf('=');
      if (separatorIndex < 1 || separatorIndex === mapping.length - 1) {
        throw new Error('Use --person "Nome=email-ou-username".');
      }

      options.personIdentifiers[mapping.slice(0, separatorIndex)] = mapping.slice(
        separatorIndex + 1,
      );
      index += 1;
    } else {
      throw new Error(`Argumento desconhecido: ${argument}`);
    }
  }

  if (!/^\d+$/.test(options.boardId || '')) {
    throw new Error('Indique um board válido com --board-id <id>.');
  }

  const missingPeople = REQUIRED_PEOPLE.filter((person) => !options.personIdentifiers[person]);
  if (missingPeople.length > 0) {
    throw new Error(
      `Faltam identificadores: ${missingPeople.join(', ')}. Use --person "Nome=email-ou-username".`,
    );
  }

  return options;
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
};

const buildItems = (userIdByPerson) =>
  SOURCE_ITEMS.map(([person, task, group, startDate, endDate, status]) => {
    if ((startDate || endDate) && (!parseDate(startDate) || !parseDate(endDate))) {
      throw new Error(`Datas inválidas na tarefa "${task}".`);
    }

    const expectedDurationDays = startDate ? differenceInDays(startDate, endDate) + 1 : 1;
    if (expectedDurationDays < 1) {
      throw new Error(`Intervalo inválido na tarefa "${task}".`);
    }

    return {
      person,
      userId: userIdByPerson[person],
      task,
      group,
      itemType: 'task',
      status,
      startDate,
      endDate,
      expectedDurationDays,
    };
  });

const makeSignature = (item) =>
  JSON.stringify([
    item.task,
    item.itemType,
    item.group,
    item.status,
    normalizeDate(item.startDate),
    normalizeDate(item.endDate),
    Number(item.expectedDurationDays),
    String(item.userId),
  ]);

const sameImportedItems = (expectedItems, storedRows) => {
  if (storedRows.length !== expectedItems.length) {
    return false;
  }

  const expectedSignatures = expectedItems.map(makeSignature).sort();
  const storedSignatures = storedRows
    .map((row) =>
      makeSignature({
        task: row.task,
        itemType: row.item_type,
        group: row.group_name,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        expectedDurationDays: row.expected_duration_days,
        userId: row.user_id,
      }),
    )
    .sort();

  return expectedSignatures.every((signature, index) => signature === storedSignatures[index]);
};

const resolveUsers = async (db, personIdentifiers) => {
  const userByPerson = {};

  for (const person of REQUIRED_PEOPLE) {
    const identifier = personIdentifiers[person];
    const users = await db('user_account')
      .select('id', 'email', 'username', 'name')
      .whereRaw('LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)', [identifier, identifier]);

    if (users.length !== 1) {
      throw new Error(
        `O identificador "${identifier}" de ${person} encontrou ${users.length} utilizadores.`,
      );
    }

    [userByPerson[person]] = users;
  }

  return userByPerson;
};

const getProjectMemberUserIds = async (db, projectId) => {
  const result = await db.raw(
    `SELECT user_id FROM project_manager WHERE project_id = ?
     UNION
     SELECT user_id FROM board_membership WHERE project_id = ?`,
    [projectId, projectId],
  );

  return new Set(result.rows.map(({ user_id: userId }) => String(userId)));
};

const importGantt = async (db, options) => {
  const board = await db('board').where({ id: options.boardId }).first();
  if (!board) {
    throw new Error(`Board ${options.boardId} não encontrado.`);
  }

  const project = await db('project').where({ id: board.project_id }).first();
  const userByPerson = await resolveUsers(db, options.personIdentifiers);
  const projectMemberUserIds = await getProjectMemberUserIds(db, board.project_id);
  const nonMembers = REQUIRED_PEOPLE.filter(
    (person) => !projectMemberUserIds.has(String(userByPerson[person].id)),
  );
  if (nonMembers.length > 0) {
    throw new Error(`Utilizadores fora do projeto: ${nonMembers.join(', ')}.`);
  }

  const userIdByPerson = Object.fromEntries(
    Object.entries(userByPerson).map(([person, user]) => [person, String(user.id)]),
  );
  const items = buildItems(userIdByPerson);
  const groups = [...new Set(items.map(({ group }) => group))];
  const importedRecords = [
    ...groups.map((group) => ({
      task: group,
      itemType: 'summary',
      group: null,
      status: null,
      startDate: null,
      endDate: null,
      expectedDurationDays: 1,
      userId: null,
    })),
    ...items,
  ];
  let plan = await db('gantt_plan').where({ project_id: board.project_id }).first();

  if (plan && options.apply) {
    plan = await db('gantt_plan').where({ id: plan.id }).forUpdate().first();
  }

  if (plan) {
    const storedResult = await db.raw(
      `SELECT item.task, item.item_type, parent.task AS group_name, item.status,
              item.start_date, item.end_date, item.expected_duration_days,
              assignee.user_id
       FROM gantt_item item
       LEFT JOIN gantt_item parent ON parent.id = item.parent_id
       LEFT JOIN gantt_item_assignee assignee ON assignee.gantt_item_id = item.id
       WHERE item.gantt_plan_id = ?`,
      [plan.id],
    );
    const storedRows = storedResult.rows;

    if (storedRows.length > 0) {
      if (!sameImportedItems(importedRecords, storedRows)) {
        throw new Error(
          `O Gantt já contém ${storedRows.length} registos diferentes; importação abortada.`,
        );
      }

      if (options.apply && !plan.is_enabled) {
        await db('gantt_plan').where({ id: plan.id }).update({ is_enabled: true });
      }

      return {
        mode: options.apply ? 'apply' : 'dry-run',
        outcome: 'already-imported',
        board: { id: String(board.id), name: board.name },
        project: { id: String(project.id), name: project.name },
        itemCount: items.length,
        summaryCount: groups.length,
      };
    }
  }

  const preview = {
    mode: options.apply ? 'apply' : 'dry-run',
    outcome: options.apply ? 'imported' : 'ready',
    board: { id: String(board.id), name: board.name },
    project: { id: String(project.id), name: project.name },
    users: Object.fromEntries(
      Object.entries(userByPerson).map(([person, user]) => [
        person,
        { id: String(user.id), email: user.email, username: user.username },
      ]),
    ),
    itemCount: items.length,
    summaryCount: groups.length,
    scheduledItemCount: items.filter(({ startDate }) => startDate).length,
    unscheduledItemCount: items.filter(({ startDate }) => !startDate).length,
    items: items.map(({ userId, ...item }) => item),
  };

  if (!options.apply) {
    return preview;
  }

  if (!plan) {
    [plan] = await db('gantt_plan')
      .insert({
        project_id: board.project_id,
        is_enabled: true,
        default_zoom_level: 'week',
      })
      .returning(['id', 'project_id', 'is_enabled']);
  } else if (!plan.is_enabled) {
    await db('gantt_plan').where({ id: plan.id }).update({ is_enabled: true });
  }

  let position = 0;
  for (const group of groups) {
    position += 65535;
    const [summary] = await db('gantt_item')
      .insert({
        gantt_plan_id: plan.id,
        task: group,
        item_type: 'summary',
        expected_duration_days: 1,
        position,
      })
      .returning('id');

    for (const item of items.filter((candidate) => candidate.group === group)) {
      position += 65535;
      const [createdItem] = await db('gantt_item')
        .insert({
          gantt_plan_id: plan.id,
          parent_id: summary.id,
          task: item.task,
          item_type: 'task',
          status: item.status,
          start_date: item.startDate,
          end_date: item.endDate,
          expected_duration_days: item.expectedDurationDays,
          position,
        })
        .returning('id');

      await db('gantt_item_assignee').insert({
        gantt_item_id: createdItem.id,
        user_id: item.userId,
      });
    }
  }

  return preview;
};

const run = async () => {
  const options = parseArguments(process.argv.slice(2));
  const database = knex(knexConfig);

  try {
    const result = options.apply
      ? await database.transaction((transaction) => importGantt(transaction, options))
      : await importGantt(database, options);

    console.log(JSON.stringify(result, null, 2)); // eslint-disable-line no-console
  } finally {
    await database.destroy();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message); // eslint-disable-line no-console
    process.exitCode = 1;
  });
}

module.exports = {
  SOURCE_ITEMS,
  buildItems,
  makeSignature,
  parseArguments,
  sameImportedItems,
};
