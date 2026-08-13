const { expect } = require('chai');

const {
  buildItems,
  parseArguments,
  sameImportedItems,
} = require('../../scripts/import-ai-development-gantt');

describe('AI development Gantt import', () => {
  const userIdByPerson = {
    Christopher: '1',
    André: '2',
    Carlos: '3',
  };

  it('builds the complete corrected import', () => {
    const items = buildItems(userIdByPerson);

    expect(items).to.have.length(16);
    expect(items.filter(({ startDate }) => startDate)).to.have.length(10);
    expect(items.filter(({ startDate }) => !startDate)).to.have.length(6);
    expect(items.find(({ task }) => task === 'Make AI videos robust')).to.include({
      startDate: '2026-08-31',
      endDate: '2026-09-04',
      expectedDurationDays: 5,
    });
    expect(items.some(({ task }) => task === 'Prism: merge structure with Simu Studio')).to.equal(
      true,
    );
    expect(items.some(({ task }) => task.includes('strtuture'))).to.equal(false);
  });

  it('parses a safe dry-run command', () => {
    expect(
      parseArguments([
        '--board-id',
        '123',
        '--person',
        'Christopher=chris@example.com',
        '--person',
        'André=andre',
        '--person',
        'Carlos=carlos@example.com',
        '--dry-run',
      ]),
    ).to.deep.equal({
      apply: false,
      boardId: '123',
      personIdentifiers: {
        Christopher: 'chris@example.com',
        André: 'andre',
        Carlos: 'carlos@example.com',
      },
    });
  });

  it('recognizes an already imported data set independently of row order', () => {
    const items = buildItems(userIdByPerson);
    const storedRows = items.map((item) => ({
      task: item.task,
      item_type: item.itemType,
      group_name: item.group,
      status: item.status,
      start_date: item.startDate ? new Date(`${item.startDate}T00:00:00Z`) : null,
      end_date: item.endDate ? new Date(`${item.endDate}T00:00:00Z`) : null,
      expected_duration_days: item.expectedDurationDays,
      user_id: item.userId,
    }));

    expect(sameImportedItems(items, storedRows.reverse())).to.equal(true);
  });
});
