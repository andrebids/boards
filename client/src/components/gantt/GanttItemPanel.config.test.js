import fs from 'fs';
import path from 'path';

const componentPath = path.join(process.cwd(), 'src', 'components', 'gantt', 'GanttItemPanel.jsx');

describe('GanttItemPanel', () => {
  test('uses the shared danger alert dialog before deleting a task', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/AlertDialog/);
    expect(source).not.toMatch(/window\.confirm/);
    expect(source).toMatch(/tone="danger"/);
  });
});
