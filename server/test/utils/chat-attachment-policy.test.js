const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { expect } = require('chai');

const {
  ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENT_MAX_BYTES,
  validateChatAttachment,
} = require('../../utils/chat-attachment-policy');

const makeCentralDirectoryEntry = (filename) => {
  const encodedFilename = Buffer.from(filename);
  const entry = Buffer.alloc(46 + encodedFilename.length);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(encodedFilename.length, 28);
  encodedFilename.copy(entry, 46);
  return entry;
};

const makeOoxmlFile = (folder, extraEntries = []) => {
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);

  const centralDirectory = Buffer.concat([
    makeCentralDirectoryEntry('[Content_Types].xml'),
    makeCentralDirectoryEntry(`${folder}/document.xml`),
    ...extraEntries.map(makeCentralDirectoryEntry),
  ]);
  const endRecord = Buffer.alloc(22);
  const entryCount = 2 + extraEntries.length;
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(entryCount, 8);
  endRecord.writeUInt16LE(entryCount, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localHeader.length, 16);

  return Buffer.concat([localHeader, centralDirectory, endRecord]);
};

describe('Chat attachment policy', () => {
  let tempDirectory;
  let fileCounter;

  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planka-chat-attachment-'));
    fileCounter = 0;
  });

  afterEach(async () => {
    await fs.rm(tempDirectory, { force: true, recursive: true });
  });

  const validateBuffer = async (filename, buffer, size = buffer.length) => {
    fileCounter += 1;
    const fd = path.join(tempDirectory, `upload-${fileCounter}`);
    await fs.writeFile(fd, buffer);
    return validateChatAttachment({ fd, filename, size });
  };

  it('allows expected document and text formats when their content matches', async () => {
    expect(await validateBuffer('brief.pdf', Buffer.from('%PDF-1.7\ncontent'))).to.include({
      extension: 'pdf',
      isValid: true,
    });
    expect(await validateBuffer('notes.txt', Buffer.from('Safe plain text\n'))).to.include({
      extension: 'txt',
      isValid: true,
    });
    expect(await validateBuffer('proposal.docx', makeOoxmlFile('word'))).to.include({
      extension: 'docx',
      isValid: true,
    });
  });

  it('rejects executable, script, archive and macro-enabled extensions', async () => {
    const results = await Promise.all(
      ['payload.exe', 'script.js', 'archive.zip', 'invoice.docm'].map((filename) =>
        validateBuffer(filename, Buffer.from('MZ executable content')),
      ),
    );

    results.forEach((result) => {
      expect(result).to.deep.equal({ isValid: false, reason: 'extensionNotAllowed' });
    });

    expect(ALLOWED_EXTENSIONS).not.to.include.members(['exe', 'js', 'zip', 'docm']);
  });

  it('rejects dangerous double extensions', async () => {
    expect(await validateBuffer('invoice.exe.pdf', Buffer.from('%PDF-1.7\ncontent'))).to.deep.equal(
      {
        isValid: false,
        reason: 'extensionNotAllowed',
      },
    );
  });

  it('rejects files renamed to an allowed extension when their signature does not match', async () => {
    expect(await validateBuffer('payload.pdf', Buffer.from('MZ\0binary'))).to.deep.equal({
      isValid: false,
      reason: 'contentMismatch',
    });
    expect(
      await validateBuffer('picture.png', Buffer.from([0xff, 0xd8, 0xff, 0xdb])),
    ).to.deep.equal({
      isValid: false,
      reason: 'contentMismatch',
    });
    expect(
      await validateBuffer('macro.docx', makeOoxmlFile('word', ['word/vbaProject.bin'])),
    ).to.deep.equal({
      isValid: false,
      reason: 'contentMismatch',
    });
  });

  it('rejects any attachment larger than 25 MiB', async () => {
    const pdf = Buffer.from('%PDF-1.7\ncontent');

    expect(await validateBuffer('brief.pdf', pdf, CHAT_ATTACHMENT_MAX_BYTES)).to.include({
      extension: 'pdf',
      isValid: true,
    });
    expect(await validateBuffer('brief.pdf', pdf, CHAT_ATTACHMENT_MAX_BYTES + 1)).to.deep.equal({
      isValid: false,
      reason: 'attachmentTooLarge',
    });
  });
});
