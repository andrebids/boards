import fs from 'fs';
import path from 'path';

test('omits the optional sender for non-general conversation rows instead of passing false', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/chat/ConversationList/ConversationList.jsx'),
    'utf8',
  );

  expect(source).toMatch(/sender=\{\s*isGeneral\s*\? members\.find\([\s\S]*?\)\s*: undefined\s*\}/);
  expect(source).not.toMatch(/sender=\{\s*isGeneral\s*&&/);
});
