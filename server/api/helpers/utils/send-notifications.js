/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { execFile } = require('child_process');
const util = require('util');

const promisifyExecFile = util.promisify(execFile);

module.exports = {
  inputs: {
    services: {
      type: 'json',
      required: true,
    },
    title: {
      type: 'string',
      required: true,
    },
    bodyByFormat: {
      type: 'json',
      required: true,
    },
  },

  async fn(inputs) {
    const pythonExecutable = `${sails.config.appPath}/.venv/bin/python3`;
    const pythonScript = `${sails.config.appPath}/utils/send_notifications.py`;
    const args = [
      pythonScript,
      JSON.stringify(inputs.services),
      inputs.title,
      JSON.stringify(inputs.bodyByFormat),
    ];

    try {
      const { stdout, stderr } = await promisifyExecFile(pythonExecutable, args);

      // Log apenas erros críticos
      if (stderr && stderr.includes('ERROR')) {
        console.error('[send-notifications] Error:', stderr);
      }

      // Log simples de sucesso
      if (stdout.includes('Success:')) {
        console.log('✅ Email enviado com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error.message);
      throw error;
    }
  },
};
