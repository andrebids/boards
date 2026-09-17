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

// Fracoes da duracao a sondar, por ordem. A primeira e o meio do video, que era
// o unico instante usado antes; as outras so sao extraidas quando esse sai vazio.
const CANDIDATE_FRACTIONS = [0.5, 0.25, 0.75, 0.1, 0.9];

// Acima desta media de canal considera-se o frame bom e para-se a sondagem.
const GOOD_ENOUGH_MEAN = 8;

// Abaixo desta media o frame e praticamente preto e nao serve de thumbnail.
const BLANK_MEAN = 1;

const scoreFrame = async (buffer) => {
  try {
    const { channels } = await sharp(buffer).stats();

    return {
      mean: Math.max(...channels.map((channel) => channel.mean)),
      score: Math.max(
        ...channels.map((channel) => channel.mean + (channel.stdev || 0)),
      ),
    };
  } catch (error) {
    return { mean: 0, score: -1 };
  }
};

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

      // Alguns videos tem o meio preto (por exemplo decoracao luminosa que
      // acende e apaga), o que dava um thumbnail totalmente preto. Sondam-se
      // varios instantes e fica o que tem mais conteudo.
      let best = null;
      let lastError = null;

      for (let index = 0; index < CANDIDATE_FRACTIONS.length; index += 1) {
        const timestamp = Math.min(
          duration * CANDIDATE_FRACTIONS[index],
          duration <= 3 ? duration / 2 : 5,
        );

        const tempFilename = `frame-${index}.png`;
        const tempFramePath = path.join(temporaryDir, tempFilename);

        try {
          // eslint-disable-next-line no-await-in-loop
          await extractFrame(videoPath, timestamp, temporaryDir, tempFilename);
          // eslint-disable-next-line no-await-in-loop
          const buffer = await fs.readFile(tempFramePath);
          // eslint-disable-next-line no-await-in-loop
          const { mean, score } = await scoreFrame(buffer);

          if (!best || score > best.score) {
            best = { buffer, mean, score, timestamp };
          }

          if (mean >= GOOD_ENOUGH_MEAN) {
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (!best) {
        throw lastError || new Error('Nao foi possivel extrair um frame');
      }

      if (best.mean < BLANK_MEAN) {
        sails.log.warn('[VIDEO][THUMBNAIL] todos os frames sondados sao pretos', {
          videoPath,
          duration,
        });
      }

      const frameBuffer = best.buffer;
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
