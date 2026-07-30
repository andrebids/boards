const { expect } = require('chai');

const { parseRange } = require('../../utils/stream-file');

describe('File streaming byte ranges', () => {
  it('returns no range when the header is absent', () => {
    expect(parseRange(undefined, 1000)).to.equal(null);
  });

  it('parses bounded and open-ended ranges', () => {
    expect(parseRange('bytes=100-199', 1000)).to.deep.equal({
      start: 100,
      end: 199,
    });
    expect(parseRange('bytes=900-', 1000)).to.deep.equal({
      start: 900,
      end: 999,
    });
  });

  it('parses suffix ranges and clamps them to the file size', () => {
    expect(parseRange('bytes=-100', 1000)).to.deep.equal({
      start: 900,
      end: 999,
    });
    expect(parseRange('bytes=-2000', 1000)).to.deep.equal({
      start: 0,
      end: 999,
    });
  });

  it('rejects malformed, multiple, and unsatisfiable ranges', () => {
    expect(parseRange('items=0-10', 1000)).to.equal(false);
    expect(parseRange('bytes=0-10,20-30', 1000)).to.equal(false);
    expect(parseRange('bytes=1000-', 1000)).to.equal(false);
    expect(parseRange('bytes=200-100', 1000)).to.equal(false);
  });
});
