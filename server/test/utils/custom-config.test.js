const path = require('path');

const { expect } = require('chai');

describe('custom config', () => {
  it('resolves the upload base path before Sails is lifted', () => {
    const customConfigPath = require.resolve('../../config/custom');
    const previousBaseUrl = process.env.BASE_URL;

    process.env.BASE_URL = 'http://localhost:3008';
    delete require.cache[customConfigPath];

    try {
      // The config must be loaded after BASE_URL is set for this isolated module-load check.
      // eslint-disable-next-line global-require
      const { custom } = require('../../config/custom');

      expect(custom.uploadsBasePath).to.equal(path.resolve(__dirname, '../..'));
    } finally {
      delete require.cache[customConfigPath];
      if (previousBaseUrl === undefined) {
        delete process.env.BASE_URL;
      } else {
        process.env.BASE_URL = previousBaseUrl;
      }
    }
  });
});
