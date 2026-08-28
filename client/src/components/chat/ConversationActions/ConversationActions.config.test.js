import fs from 'fs';
import path from 'path';

const componentPath = path.join(
  process.cwd(),
  'src',
  'components',
  'chat',
  'ConversationActions',
  'ConversationActions.jsx',
);
const chatWindowPath = path.join(
  process.cwd(),
  'src',
  'components',
  'chat',
  'ChatWindow',
  'ChatWindow.jsx',
);

describe('ConversationActions', () => {
  test('uses the shared danger alert dialog before leaving a group', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/AlertDialog/);
    expect(source).not.toMatch(/window\.confirm/);
    expect(source).toMatch(/tone="danger"/);
  });

  test('opens the existing group editor from the owner actions menu', () => {
    const actionsSource = fs.readFileSync(componentPath, 'utf8');
    const chatWindowSource = fs.readFileSync(chatWindowPath, 'utf8');

    expect(actionsSource).toMatch(/participant\?\.role === 'owner'/);
    expect(actionsSource).toMatch(/openGroupManager\(conversationId\)/);
    expect(actionsSource).toMatch(/t\('chat\.manageGroup'\)/);
    expect(chatWindowSource).toMatch(/groupManagerConversationId === id/);
  });

  test('offers the pinned toggle for every conversation', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).not.toMatch(/isPinnable/);
    expect(source).toMatch(/isPinned: !isPinned/);
    expect(source).toMatch(/t\(isPinned \? 'chat\.unpin' : 'chat\.pin'\)/);
  });
});
