const assert = require('node:assert/strict');

const UserModel = require('../../api/models/User');
const isAdminOrProjectOwner = require('../../api/helpers/users/is-admin-or-project-owner');
const create = require('../../api/controllers/organization-default-labels/create');
const update = require('../../api/controllers/organization-default-labels/update');
const remove = require('../../api/controllers/organization-default-labels/delete');
const reorder = require('../../api/controllers/organization-default-labels/reorder');

describe('Organization default label write permissions', () => {
  let previousGlobals;
  let writes;
  let broadcasts;
  let reads;
  const label = { id: '10', name: 'Priority', color: 'berry-red', position: 1 };

  beforeEach(() => {
    previousGlobals = { User: global.User, sails: global.sails };
    global.User = UserModel;
    writes = [];
    broadcasts = [];
    reads = 0;
    const write =
      (operation) =>
      async (...args) => {
        writes.push({ operation, args });
        return label;
      };
    global.sails = {
      models: {
        organizationdefaultlabel: {
          qm: {
            getAll: async () => {
              reads += 1;
              return [label];
            },
            createOne: write('create'),
            updateOne: write('update'),
            deleteOne: write('delete'),
            reorder: write('reorder'),
          },
        },
      },
      helpers: {
        users: {
          isAdminOrProjectOwner: (record) => isAdminOrProjectOwner.fn({ record }),
        },
        organizationDefaultLabels: {
          broadcastToAdmins: async (...args) => broadcasts.push(args),
        },
      },
      log: { info: () => {}, warn: () => {} },
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([key, value]) => {
      if (value === undefined) delete global[key];
      else global[key] = value;
    });
  });

  [
    ['create', create, { name: label.name, color: label.color, position: label.position }],
    ['update', update, { id: label.id, name: label.name }],
    ['delete', remove, { id: label.id }],
    ['reorder', reorder, { order: [{ id: label.id, position: label.position }] }],
  ].forEach(([operation, controller, inputs]) => {
    Object.values(UserModel.Roles).forEach((role) => {
      it(`${role}: ${operation} ${role === UserModel.Roles.ADMIN ? 'allowed' : 'forbidden'}`, async () => {
        const currentUser = { id: '1', email: 'test@example.invalid', role };
        const run = controller.fn.call({ req: { currentUser } }, inputs);
        if (role === UserModel.Roles.ADMIN) {
          const result = await run;
          assert.deepEqual(result, operation === 'reorder' ? { items: [label] } : { item: label });
          assert.equal(writes.length, 1);
          assert.equal(writes[0].operation, operation);
          assert.equal(broadcasts.length, 1);
        } else {
          await assert.rejects(run, { notEnoughRights: 'Not enough rights' });
          assert.equal(reads, 0);
          assert.deepEqual(writes, []);
          assert.deepEqual(broadcasts, []);
        }
      });
    });
  });
});
