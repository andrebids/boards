const { expect } = require('chai');

const { isVideoFile } = require('../../utils/video-file');

describe('Video file detection', () => {
  it('accepts standard video MIME types', () => {
    expect(isVideoFile('upload.bin', 'video/mp4')).to.equal(true);
    expect(isVideoFile('upload.bin', 'video/x-matroska')).to.equal(true);
  });

  it('recognizes video extensions when browsers send a generic MIME type', () => {
    ['clip.mov', 'clip.mkv', 'clip.avi', 'clip.m2ts', 'clip.mxf'].forEach((filename) => {
      expect(isVideoFile(filename, 'application/octet-stream')).to.equal(true);
    });
  });

  it('does not classify unrelated files as video', () => {
    expect(isVideoFile('document.pdf', 'application/pdf')).to.equal(false);
  });
});
