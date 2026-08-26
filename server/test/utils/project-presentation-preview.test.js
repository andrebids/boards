const { expect } = require('chai');

const enqueue = require('../../api/helpers/project-presentation-preview/enqueue');
const applyPreview = require('../../api/helpers/project-presentation-preview/apply-preview');

describe('Project presentation preview queue', () => {
  let previousSails;
  let queries;

  beforeEach(() => {
    previousSails = global.sails;
    queries = [];
    global.sails = {
      sendNativeQuery: async (query, values) => {
        queries.push({ query, values });
        return { rows: [{ id: 1 }] };
      },
    };
  });

  afterEach(() => {
    global.sails = previousSails;
  });

  it('replaces a queued preview with the newest immutable PPTX version', async () => {
    const job = await enqueue.fn({
      presentationId: 'presentation-1',
      sourceFilename: 'presentation-new.pptx',
    });

    expect(job).to.deep.equal({ id: 1 });
    expect(queries).to.have.lengthOf(1);
    expect(queries[0].query).to.include('ON CONFLICT (presentation_id) DO UPDATE');
    expect(queries[0].query).to.include('attempts = 0');
    expect(queries[0].values).to.deep.equal(['presentation-1', 'presentation-new.pptx']);
  });
});

describe('Project presentation preview updates', () => {
  let previousGlobals;
  let queries;
  let broadcasts;

  beforeEach(() => {
    previousGlobals = {
      ProjectPresentation: global.ProjectPresentation,
      _: global._,
      sails: global.sails,
    };
    queries = [];
    broadcasts = [];
    global._ = require('lodash'); // eslint-disable-line global-require
    global.ProjectPresentation = {
      qm: {
        getOneById: async () => ({
          id: 'presentation-1',
          documentData: { filename: 'presentation-new.pptx' },
          cryptpadEditKey: 'edit-secret',
          cryptpadViewKey: 'view-secret',
        }),
      },
    };
    global.sails = {
      sendNativeQuery: async (query, values) => {
        queries.push({ query, values });
        return { rowCount: 1 };
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
    };
  });

  afterEach(() => {
    Object.assign(global, previousGlobals);
  });

  it('publishes a ready preview without CryptPad keys', async () => {
    await applyPreview.fn({
      presentationId: 'presentation-1',
      sourceFilename: 'presentation-new.pptx',
      preview: {
        status: 'ready',
        sourceFilename: 'presentation-new.pptx',
        filename: 'preview-presentation-new.jpg',
      },
    });

    expect(queries[0].values[1]).to.equal('presentation-new.pptx');
    expect(broadcasts).to.have.lengthOf(1);
    expect(broadcasts[0][2].item).to.not.have.any.keys('cryptpadEditKey', 'cryptpadViewKey');
  });

  it('does not overwrite the preview after another PPTX version becomes current', async () => {
    global.ProjectPresentation.qm.getOneById = async () => ({
      id: 'presentation-1',
      documentData: { filename: 'presentation-new.pptx' },
    });

    const result = await applyPreview.fn({
      presentationId: 'presentation-1',
      sourceFilename: 'presentation-old.pptx',
      preview: { status: 'ready', sourceFilename: 'presentation-old.pptx' },
    });

    expect(result).to.be.null;
    expect(queries).to.deep.equal([]);
    expect(broadcasts).to.deep.equal([]);
  });
});
