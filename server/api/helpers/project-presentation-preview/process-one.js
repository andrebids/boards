/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { pipeline } = require('stream/promises');
const { promisify } = require('util');

const getPresentationFilePath = require('../../../utils/project-presentation-file-path');

const execFileAsync = promisify(execFile);
const PREVIEW_MIME_TYPE = 'image/jpeg';
const PREVIEW_WIDTH = 544;

const runCommand = (command, args, timeout) =>
  execFileAsync(command, args, {
    timeout,
    maxBuffer: 1024 * 1024,
  });

module.exports = {
  inputs: {
    job: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const { job } = inputs;
    const fileManager = sails.hooks['file-manager'].getInstance();
    const temporaryDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'planka-presentation-preview-'),
    );
    const sourceFilename = path.basename(job.sourceFilename);
    const sourcePath = path.join(temporaryDir, sourceFilename);
    const pdfPath = path.join(temporaryDir, `${path.parse(sourceFilename).name}.pdf`);
    const previewPath = path.join(temporaryDir, 'preview.jpg');
    const timeout = sails.config.custom.projectPresentationPreviewCommandTimeoutMs;

    try {
      const sourceStream = await fileManager.read(
        getPresentationFilePath(job.presentationId, sourceFilename),
      );
      await pipeline(sourceStream, fs.createWriteStream(sourcePath));

      await runCommand(
        'soffice',
        ['--headless', '--convert-to', 'pdf', '--outdir', temporaryDir, sourcePath],
        timeout,
      );
      await runCommand(
        'pdftoppm',
        [
          '-f',
          '1',
          '-singlefile',
          '-jpeg',
          '-scale-to-x',
          String(PREVIEW_WIDTH),
          '-scale-to-y',
          '-1',
          pdfPath,
          path.join(temporaryDir, 'preview'),
        ],
        timeout,
      );

      const previewFilename = path.basename(
        getPresentationFilePath.getPreviewFilePath(job.presentationId, sourceFilename),
      );
      const previewSize = (await fsPromises.stat(previewPath)).size;
      await fileManager.saveFromPath(
        getPresentationFilePath.getPreviewFilePath(job.presentationId, sourceFilename),
        previewPath,
        PREVIEW_MIME_TYPE,
      );

      return {
        status: 'ready',
        sourceFilename,
        filename: previewFilename,
        mimeType: PREVIEW_MIME_TYPE,
        sizeInBytes: previewSize,
      };
    } finally {
      await fsPromises.rm(temporaryDir, { recursive: true, force: true });
    }
  },
};
