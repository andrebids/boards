const { expect } = require('chai');

const getFilePath = require('../../utils/project-presentation-file-path');

describe('Project presentation file path', () => {
  let previousSails;

  beforeEach(() => {
    previousSails = global.sails;
    global.sails = {
      config: {
        custom: {
          attachmentsPathSegment: 'private/attachments',
        },
      },
    };
  });

  afterEach(() => {
    global.sails = previousSails;
  });

  it('stores a presentation inside the persistent attachments tree', () => {
    expect(getFilePath('presentation-1')).to.equal(
      'private/attachments/project-presentations/presentation-1/presentation.pptx',
    );
  });

  it('supports an immutable versioned file for a replacement upload', () => {
    expect(getFilePath('presentation-1', 'presentation-2.pptx')).to.equal(
      'private/attachments/project-presentations/presentation-1/presentation-2.pptx',
    );
  });
});
