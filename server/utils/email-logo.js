const fs = require('fs');

const LOGO_PLACEHOLDER = '{{logo_url}}';
const LOGO_CID = 'logo@planka';

const prepareEmailLogo = (html, logoPath) => {
  if (!html.includes(LOGO_PLACEHOLDER)) {
    return {
      html,
      attachments: undefined,
    };
  }

  if (!fs.existsSync(logoPath)) {
    return {
      html: html.replace(LOGO_PLACEHOLDER, ''),
      attachments: undefined,
    };
  }

  return {
    html: html.replace(LOGO_PLACEHOLDER, `cid:${LOGO_CID}`),
    attachments: [
      {
        filename: 'logo.png',
        path: logoPath,
        cid: LOGO_CID,
      },
    ],
  };
};

module.exports = {
  prepareEmailLogo,
};
