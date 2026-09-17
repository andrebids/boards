/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * Regenera os thumbnails de video que sairam pretos.
 *
 * O gerador antigo tirava sempre o frame do meio do video, o que dava uma
 * imagem completamente preta em videos cujo meio esta escuro (decoracao
 * luminosa que acende e apaga, por exemplo). Este script percorre os anexos em
 * disco, mede o thumbnail existente e, quando esta praticamente preto, volta a
 * extrair sondando varios instantes e fica com o frame que tem mais conteudo.
 *
 * Uso (dentro do container do servidor):
 *   node scripts/video-thumbnail-regenerate.js          # so relata
 *   node scripts/video-thumbnail-regenerate.js --apply  # reescreve
 */

const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const ATTACHMENTS_DIR =
  process.env.ATTACHMENTS_DIR || '/app/private/attachments';

const THUMBNAILS_DIRNAME = 'video-thumbnails';
const CANDIDATE_FRACTIONS = [0.5, 0.25, 0.75, 0.1, 0.9];
const GOOD_ENOUGH_MEAN = 8;
const BLANK_MEAN = 1;

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.webm',
  '.ogg',
  '.ogv',
  '.m4v',
  '.avi',
  '.mkv',
]);

const extractFrame = (videoPath, timestamp, folder, filename) =>
  new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({ timestamps: [timestamp], filename, folder })
      .on('end', resolve)
      .on('error', reject);
  });

const measure = async (buffer) => {
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

const probeDuration = (videoPath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(Number(result.format.duration));
      }
    });
  });

const pickBestFrame = async (videoPath, duration, temporaryDir) => {
  let best = null;

  for (let index = 0; index < CANDIDATE_FRACTIONS.length; index += 1) {
    const timestamp = Math.min(
      duration * CANDIDATE_FRACTIONS[index],
      duration <= 3 ? duration / 2 : 5,
    );

    const filename = `frame-${index}.png`;

    try {
      // eslint-disable-next-line no-await-in-loop
      await extractFrame(videoPath, timestamp, temporaryDir, filename);
      // eslint-disable-next-line no-await-in-loop
      const buffer = await fs.readFile(path.join(temporaryDir, filename));
      // eslint-disable-next-line no-await-in-loop
      const { mean, score } = await measure(buffer);

      if (!best || score > best.score) {
        best = { buffer, mean, score, timestamp };
      }

      if (mean >= GOOD_ENOUGH_MEAN) {
        break;
      }
    } catch (error) {
      /* candidato falhou, tenta o seguinte */
    }
  }

  return best;
};

const findSourceVideo = async (attachmentDir) => {
  const entries = await fs.readdir(attachmentDir, { withFileTypes: true });

  const match = entries.find(
    (entry) =>
      entry.isFile() &&
      VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
  );

  return match ? path.join(attachmentDir, match.name) : null;
};

const run = async () => {
  const apply = process.argv.includes('--apply');
  const dirs = await fs.readdir(ATTACHMENTS_DIR, { withFileTypes: true });

  let checked = 0;
  let black = 0;
  let fixed = 0;
  let stillBlack = 0;

  for (const dir of dirs) {
    if (!dir.isDirectory()) {
      continue; // eslint-disable-line no-continue
    }

    const attachmentDir = path.join(ATTACHMENTS_DIR, dir.name);
    const thumbnailsDir = path.join(attachmentDir, THUMBNAILS_DIRNAME);
    const thumbnail360 = path.join(thumbnailsDir, 'frame-0-360.png');

    let existing;
    try {
      // eslint-disable-next-line no-await-in-loop
      existing = await fs.readFile(thumbnail360);
    } catch (error) {
      continue; // eslint-disable-line no-continue
    }

    checked += 1;

    // eslint-disable-next-line no-await-in-loop
    const { mean } = await measure(existing);

    if (mean >= BLANK_MEAN) {
      continue; // eslint-disable-line no-continue
    }

    black += 1;

    // eslint-disable-next-line no-await-in-loop
    const videoPath = await findSourceVideo(attachmentDir);

    if (!videoPath) {
      console.log(`${dir.name}: thumbnail preto, video de origem nao encontrado`);
      continue; // eslint-disable-line no-continue
    }

    // eslint-disable-next-line no-await-in-loop
    const temporaryDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'planka-thumb-fix-'),
    );

    try {
      // eslint-disable-next-line no-await-in-loop
      const duration = await probeDuration(videoPath);
      // eslint-disable-next-line no-await-in-loop
      const best = await pickBestFrame(videoPath, duration, temporaryDir);

      if (!best || best.mean < BLANK_MEAN) {
        stillBlack += 1;
        console.log(
          `${dir.name}: ${path.basename(videoPath)} — todos os instantes sao pretos, deixado como esta`,
        );
        continue; // eslint-disable-line no-continue
      }

      console.log(
        `${dir.name}: ${path.basename(videoPath)} — novo frame a ${best.timestamp.toFixed(2)}s (media ${best.mean.toFixed(1)})${apply ? '' : '  [simulacao]'}`,
      );

      if (apply) {
        const resize = (size) =>
          sharp(best.buffer)
            .resize(size, size, { fit: 'inside', withoutEnlargement: true })
            .png({ quality: 75, force: false })
            .toBuffer();

        // eslint-disable-next-line no-await-in-loop
        const [buffer360, buffer720] = await Promise.all([
          resize(360),
          resize(720),
        ]);

        // eslint-disable-next-line no-await-in-loop
        await fs.writeFile(thumbnail360, buffer360);
        // eslint-disable-next-line no-await-in-loop
        await fs.writeFile(
          path.join(thumbnailsDir, 'frame-0-720.png'),
          buffer720,
        );
      }

      fixed += 1;
    } catch (error) {
      console.log(`${dir.name}: falhou — ${error.message}`);
    } finally {
      // eslint-disable-next-line no-await-in-loop
      await fs.rm(temporaryDir, { recursive: true, force: true });
    }
  }

  console.log(
    `\nthumbnails verificados: ${checked} | pretos: ${black} | ${apply ? 'corrigidos' : 'corrigiveis'}: ${fixed} | sem frame utilizavel: ${stillBlack}`,
  );
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
