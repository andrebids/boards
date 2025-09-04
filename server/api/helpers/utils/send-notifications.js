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

    console.log('--- [send-notifications] Attempting to send notification ---');
    console.log(`Executing: ${pythonExecutable}`);
    console.log('With arguments:', JSON.stringify(args, null, 2));

    try {
      const { stdout, stderr } = await promisifyExecFile(pythonExecutable, args);

      console.log('[send-notifications] Python script stdout:', stdout);

      if (stderr) {
        console.error('[send-notifications] Python script stderr:', stderr);
      }

      console.log('--- [send-notifications] Notification command executed ---');
    } catch (error) {
      console.error('--- [send-notifications] CRITICAL: Error executing Python script ---');
      console.error(error);
      throw error;
    }
  },
};
