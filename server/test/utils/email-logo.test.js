const fs = require('fs');
const os = require('os');
const path = require('path');

const { expect } = require('chai');

const { prepareEmailLogo } = require('../../utils/email-logo');

describe('email logo', () => {
  let temporaryDirectory;
  let logoPath;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'planka-email-logo-'));
    logoPath = path.join(temporaryDirectory, 'logo192.png');
    fs.writeFileSync(logoPath, 'logo');
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('does not attach the logo when the email does not use it', () => {
    const html = '<html><body><span>B</span></body></html>';

    expect(prepareEmailLogo(html, logoPath)).to.deep.equal({
      html,
      attachments: undefined,
    });
  });

  it('embeds the logo when the email contains the logo placeholder', () => {
    const result = prepareEmailLogo('<img src="{{logo_url}}">', logoPath);

    expect(result.html).to.equal('<img src="cid:logo@planka">');
    expect(result.attachments).to.deep.equal([
      {
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo@planka',
      },
    ]);
  });

  it('removes the placeholder without creating a broken inline image when the file is missing', () => {
    const result = prepareEmailLogo('<img src="{{logo_url}}">', `${logoPath}.missing`);

    expect(result).to.deep.equal({
      html: '<img src="">',
      attachments: undefined,
    });
  });
});
