const { expect } = require('chai');

const {
  getTaskContentValues,
  getTaskNameFromContent,
  remapTaskAttachmentUrls,
} = require('../../utils/task-content');

describe('Task rich content', () => {
  it('creates a plain task name from Markdown content', () => {
    expect(
      getTaskNameFromContent(
        '## Preparar **ficheiro**\n- Rever com @[Ana](user-1)\n![proposta.png](/attachments/12/download/proposta.png)',
      ),
    ).to.equal('Preparar ficheiro Rever com @Ana proposta.png');
  });

  it('normalizes rich content and supports the legacy name input', () => {
    expect(getTaskContentValues({ content: '  **Nova** tarefa  ' })).to.deep.equal({
      content: '**Nova** tarefa',
      name: 'Nova tarefa',
    });
    expect(getTaskContentValues({ name: 'Tarefa antiga' })).to.deep.equal({
      content: 'Tarefa antiga',
      name: 'Tarefa antiga',
    });
    expect(getTaskContentValues({ content: '---' })).to.equal(null);
  });

  it('remaps only internal attachment URLs', () => {
    const content = [
      '![local](/attachments/12/download/local.png)',
      '![absolute](https://boards.example.com/attachments/13/download/absolute.png)',
      '[external](https://example.com/attachments/12/download/file.png)',
    ].join('\n');

    expect(remapTaskAttachmentUrls(content, { 12: '112', 13: '113' })).to.equal(
      [
        '![local](/attachments/112/download/local.png)',
        '![absolute](https://boards.example.com/attachments/13/download/absolute.png)',
        '[external](https://example.com/attachments/12/download/file.png)',
      ].join('\n'),
    );
  });
});
