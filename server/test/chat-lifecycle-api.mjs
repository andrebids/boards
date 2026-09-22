// Run only against the disposable QA instance created for this worktree.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const io = require('sails.io.js')(require('socket.io-client'));
io.sails.autoConnect = false;
io.sails.useCORSRouteToGetCookie = false;
io.sails.environment = 'production';

const base = 'http://127.0.0.1:1338/api';
const tokens = {};
async function request(
  who,
  path,
  data,
  method = data === undefined ? 'GET' : 'POST',
  status = 200,
) {
  if (method === 'POST' && path.endsWith('/messages'))
    data = { ...data, clientMessageId: randomUUID() };
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(15000),
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens[who] && { Authorization: `Bearer ${tokens[who]}` }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${path}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}
for (const [who, email] of [
  ['a', 'qa@example.test'],
  ['b', 'qab@example.test'],
  ['c', 'qac@example.test'],
]) {
  tokens[who] = (
    await request(who, '/access-tokens', { emailOrUsername: email, password: 'qa-chat-test-only' })
  ).item;
}
const users = {};
for (const who of ['a', 'b', 'c']) users[who] = (await request(who, '/users/me')).item;
const project = (await request('a', '/projects', { type: 'shared', name: `QA Chat ${Date.now()}` }))
  .item;
for (const who of ['b', 'c'])
  await request('a', `/projects/${project.id}/project-managers`, { userId: users[who].id });
const createGroup = async (title, who = ['b', 'c']) =>
  (
    await request('a', `/projects/${project.id}/chat-conversations/groups`, {
      title,
      userIds: who.map((id) => users[id].id),
    })
  ).item;
const messages = async (who, id, query = '') =>
  (await request(who, `/chat-conversations/${id}/messages${query}`)).items;
const list = async (who) =>
  (await request(who, `/projects/${project.id}/chat-conversations`)).items;
const group = await createGroup('QA Lifecycle');
const first = (
  await request('b', `/chat-conversations/${group.id}/messages`, { text: 'Historical baseline' })
).item;
const second = (
  await request('b', `/chat-conversations/${group.id}/messages`, { text: 'Will be edited later' })
).item;
await request('a', `/chat-conversations/${group.id}/leave`, {});
assert.equal((await list('a')).find(({ id }) => id === group.id).isHistorical, true);
await request('b', `/chat-messages/${second.id}`, { text: 'Post-exit edit' }, 'PATCH');
const later = (
  await request('b', `/chat-conversations/${group.id}/messages`, { text: 'Post-exit new message' })
).item;
assert.deepEqual(
  (await messages('a', group.id)).map(({ id }) => id),
  [first.id],
);
assert.equal((await messages('a', group.id, '?limit=1'))[0].id, first.id);
const form = new FormData();
form.append(
  'file',
  new Blob(['QA attachment after departure'], { type: 'text/plain' }),
  'qa-after-exit.txt',
);
const upload = await fetch(`${base}/chat-messages/${first.id}/attachments`, {
  signal: AbortSignal.timeout(15000),
  method: 'POST',
  headers: { Authorization: `Bearer ${tokens.b}` },
  body: form,
});
const uploadText = await upload.text();
assert.equal(upload.status, 200, uploadText);
const attachment = JSON.parse(uploadText).item;
await request('a', `/chat-message-attachments/${attachment.id}/download`, undefined, 'GET', 404);
assert.equal((await messages('a', group.id))[0].attachments.length, 0);
await request(
  'a',
  `/chat-conversations/${group.id}/messages?aroundId=${later.id}`,
  undefined,
  'GET',
  404,
);
await request('a', `/chat-conversations/${group.id}/messages`, { text: 'must fail' }, 'POST', 403);
await request('a', `/chat-conversations/${group.id}/read`, { messageId: later.id }, 'POST', 404);
await request('a', `/chat-conversations/${group.id}/history`, { hideConversation: true }, 'DELETE');
assert.equal(
  (await list('a')).some(({ id }) => id === group.id),
  false,
);
await request('b', `/chat-conversations/${group.id}/participants`, { userIds: [users.a.id] });
assert.equal((await list('a')).find(({ id }) => id === group.id).isHistorical, false);
assert.equal(
  (await messages('a', group.id)).some(({ id }) => id === later.id),
  true,
);
await request(
  'b',
  `/chat-conversations/${group.id}/participants/${users.a.id}`,
  undefined,
  'DELETE',
);
await request('c', `/chat-conversations/${group.id}/leave`, {});
assert.equal((await list('b')).find(({ id }) => id === group.id).canWrite, false);
await request('b', `/chat-conversations/${group.id}`, { title: 'Single member readable' }, 'PATCH');
await request('b', `/chat-conversations/${group.id}/messages`, { text: 'must fail' }, 'POST', 403);
await request('b', `/chat-conversations/${group.id}/leave`, {});
assert.ok((await list('b')).find(({ id }) => id === group.id).archivedAt);
const empty = await createGroup('QA Empty', ['b']);
await request('a', `/chat-conversations/${empty.id}/leave`, {});
assert.deepEqual(await messages('a', empty.id), []);
await request('a', `/chat-conversations/${empty.id}/history`, { hideConversation: true }, 'DELETE');
assert.equal(
  (await list('a')).some(({ id }) => id === empty.id),
  false,
);
const concurrent = await createGroup('QA Concurrent');
const cleared = await createGroup('QA Private clear');
const beforeClear = (
  await request('b', `/chat-conversations/${cleared.id}/messages`, { text: 'Hidden only for a' })
).item;
await request('a', `/chat-conversations/${cleared.id}/history`, {}, 'DELETE');
assert.deepEqual(await messages('a', cleared.id), []);
assert.equal((await messages('b', cleared.id))[0].id, beforeClear.id);
const afterClear = (
  await request('b', `/chat-conversations/${cleared.id}/messages`, { text: 'After private clear' })
).item;
await request('a', `/chat-conversations/${cleared.id}/leave`, {});
const duringAbsence = (
  await request('b', `/chat-conversations/${cleared.id}/messages`, { text: 'During absence' })
).item;
assert.deepEqual(
  (await messages('a', cleared.id)).map(({ id }) => id),
  [afterClear.id],
);
await request('b', `/chat-conversations/${cleared.id}/participants`, { userIds: [users.a.id] });
assert.deepEqual(
  (await messages('a', cleared.id)).map(({ id }) => id),
  [duringAbsence.id, afterClear.id],
);
console.log(
  'HTTP lifecycle, historical attachments and empty-group checks passed; testing sockets.',
);
const sockets = [0, 1].map(() =>
  io.sails.connect('http://127.0.0.1:1338', { reconnection: false }),
);
const received = [];
const socketRequest = (socket, path, data, method = 'get') =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Socket timeout: ${path}`)), 15000);
    socket.request(
      { method, url: `/api${path}`, data, headers: { Authorization: `Bearer ${tokens.c}` } },
      (body, response) => {
        clearTimeout(timeout);
        if (response.statusCode >= 400) reject(new Error(`${path}: ${response.statusCode}`));
        else resolve(body);
      },
    );
  });
try {
  for (const socket of sockets) {
    await socketRequest(socket, `/chat-conversations/${concurrent.id}/subscribe`, {}, 'post');
    socket.on('chatMessageCreate', (event) => received.push(event));
    socket.on('chatConversationUpdate', (event) => {
      if (event.item.lastMessage) received.push(event);
    });
  }
  const [exitResult] = await Promise.all([
    request('c', `/chat-conversations/${concurrent.id}/leave`, {}),
    request('a', `/chat-conversations/${concurrent.id}/messages`, { text: 'Concurrent message' }),
  ]);
  for (const message of await messages('c', concurrent.id)) {
    assert.ok(
      exitResult.item.historyVisibleThroughMessageId &&
        BigInt(message.id) <= BigInt(exitResult.item.historyVisibleThroughMessageId),
    );
  }
  received.length = 0;
  await request('a', `/chat-conversations/${concurrent.id}/messages`, {
    text: 'Never delivered to departed sockets',
  });
  for (const socket of sockets)
    await socketRequest(socket, `/chat-conversations/${concurrent.id}/messages`);
  assert.deepEqual(received, []);
  await Promise.all([
    request('a', `/chat-conversations/${concurrent.id}/leave`, {}),
    request('b', `/chat-conversations/${concurrent.id}/leave`, {}),
  ]);
  assert.ok((await list('a')).find(({ id }) => id === concurrent.id).archivedAt);
} finally {
  sockets.forEach((socket) => socket.disconnect());
}
const browserGroup = await createGroup('QA Browser');
await request('b', `/chat-conversations/${browserGroup.id}/messages`, {
  text: 'Mensagem de teste: o histórico deve permanecer depois da saída.',
});
console.log(
  JSON.stringify({
    passed: true,
    projectId: project.id,
    browserGroupId: browserGroup.id,
    userIds: Object.fromEntries(Object.entries(users).map(([key, user]) => [key, user.id])),
  }),
);
