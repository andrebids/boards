import fs from 'fs';
import path from 'path';

const componentPath = path.join(process.cwd(), 'src', 'components', 'chat', 'MessageList', 'MessageList.jsx');

describe('MessageList', () => {
  test('uses the shared danger dialog before deleting a message', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/import \{ AlertDialog \} from '\.\.\/\.\.\/\.\.\/lib\/custom-ui';/);
    expect(source).toMatch(/setPendingDeleteMessageId\(message\.id\);/);
    expect(source).not.toMatch(/window\.confirm\(t\('chat\.confirmDeleteMessage'\)\)/);
    expect(source).toMatch(/<AlertDialog[\s\S]*tone="danger"[\s\S]*onConfirm=\{handleDeleteMessageConfirm\}/);
  });
});
