/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const extractFrame = (videoPath, timestamp, folder, filename) =>
  new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename,
        folder,
      })
      .on('end', resolve)
      .on('error', reject);
  });

module.exports = {
  inputs: {
    videoPath: {
      type: 'string',
      required: true,
    },
    outputDir: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const { videoPath, outputDir } = inputs;
    const temporaryDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'planka-video-thumbnail-'),
    );

    try {
      const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });

      const duration = Number(metadata.format.duration);
      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === 'video',
      );

      if (!Number.isFinite(duration) || duration <= 0 || !videoStream) {
        throw new Error('O ficheiro não contém um fluxo de vídeo válido');
      }

      const timestamp =
        duration <= 3 ? duration / 2 : Math.min(duration / 2, 5);
      const fallbackTimestamp = Math.min(duration / 2, 1);
      const tempFilename = 'frame.png';
      const tempFramePath = path.join(temporaryDir, tempFilename);

      try {
        await extractFrame(videoPath, timestamp, temporaryDir, tempFilename);
      } catch (error) {
        if (timestamp === fallbackTimestamp) {
          throw error;
        }

        await extractFrame(
          videoPath,
          fallbackTimestamp,
          temporaryDir,
          tempFilename,
        );
      }

      await fs.access(tempFramePath);

      const frameBuffer = await fs.readFile(tempFramePath);
      const outside360Buffer = await sharp(frameBuffer)
        .resize(360, 360, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png({
          quality: 75,
          force: false,
        })
        .toBuffer();

      const outside720Buffer = await sharp(frameBuffer)
        .resize(720, 720, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png({
          quality: 75,
          force: false,
        })
        .toBuffer();

      const fileManager = sails.hooks['file-manager'].getInstance();
      const thumbnail360Path = `${outputDir}/frame-0-360.png`;
      const thumbnail720Path = `${outputDir}/frame-0-720.png`;

      await fileManager.save(thumbnail360Path, outside360Buffer, 'image/png');
      await fileManager.save(thumbnail720Path, outside720Buffer, 'image/png');

      return {
        thumbnails: [
          {
            frame360: thumbnail360Path,
            frame720: thumbnail720Path,
          },
        ],
        metadata: {
          duration,
          width: videoStream.width || null,
          height: videoStream.height || null,
          format: metadata.format.format_name,
        },
      };
    } finally {
      await fs.rm(temporaryDir, { recursive: true, force: true });
    }
  },
};
