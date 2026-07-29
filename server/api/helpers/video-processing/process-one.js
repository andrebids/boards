/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');
const ffmpeg = require('fluent-ffmpeg');

const videoThumbnailGenerator = require('../attachments/video-thumbnail-generator');

const PLAYBACK_FILENAME = 'playback.mp4';
const PLAYBACK_MIME_TYPE = 'video/mp4';

const probe = (filePath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) {
        reject(error);
      } else {
        resolve(metadata);
      }
    });
  });

const getRotation = (videoStream) => {
  const sideData = (videoStream.side_data_list || []).find((item) =>
    Number.isFinite(Number(item.rotation)),
  );
  const value = sideData ? sideData.rotation : videoStream.tags && videoStream.tags.rotate;
  const rotation = Number(value) || 0;

  return ((rotation % 360) + 360) % 360;
};

const isRemuxCompatible = (metadata, videoStream, audioStream, rotation) => {
  const formatNames = String(metadata.format && metadata.format.format_name).split(',');

  return (
    formatNames.some((formatName) =>
      ['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2'].includes(formatName),
    ) &&
    videoStream.codec_name === 'h264' &&
    ['yuv420p', 'yuvj420p'].includes(videoStream.pix_fmt) &&
    (!audioStream || audioStream.codec_name === 'aac') &&
    rotation === 0 &&
    videoStream.width <= 1920 &&
    videoStream.height <= 1920 &&
    videoStream.width % 2 === 0 &&
    videoStream.height % 2 === 0
  );
};

const runFfmpeg = (inputPath, outputPath, shouldRemux) =>
  new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .output(outputPath)
      .outputOptions(['-map 0:v:0', '-map 0:a:0?', '-sn', '-dn', '-movflags +faststart']);

    if (shouldRemux) {
      command.outputOptions(['-c copy']);
    } else {
      command
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .videoFilters({
          filter: 'scale',
          options: {
            w: 'min(1920,iw)',
            h: 'min(1920,ih)',
            force_original_aspect_ratio: 'decrease',
            force_divisible_by: 2,
          },
        })
        .outputOptions([
          '-preset medium',
          '-crf 23',
          '-pix_fmt yuv420p',
          '-metadata:s:v:0 rotate=0',
        ]);
    }

    command.on('end', resolve).on('error', reject).run();
  });

const createPlaybackFile = async (inputPath, outputPath, shouldRemux) => {
  try {
    await runFfmpeg(inputPath, outputPath, shouldRemux);
  } catch (error) {
    if (!shouldRemux) {
      throw error;
    }

    await fsPromises.rm(outputPath, { force: true });
    await runFfmpeg(inputPath, outputPath, false);
  }
};

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
    const basePath = `${sails.config.custom.attachmentsPathSegment}/${job.fileReferenceId}`;
    const temporaryDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'planka-video-process-'));
    const sourcePath = path.join(temporaryDir, path.basename(job.sourceFilename));
    const playbackPath = path.join(temporaryDir, PLAYBACK_FILENAME);

    try {
      const sourceStream = await fileManager.read(`${basePath}/${job.sourceFilename}`);
      await pipeline(sourceStream, fs.createWriteStream(sourcePath));

      const sourceMetadata = await probe(sourcePath);
      const videoStream = sourceMetadata.streams.find((stream) => stream.codec_type === 'video');
      const audioStream = sourceMetadata.streams.find((stream) => stream.codec_type === 'audio');
      if (!videoStream) {
        const error = new Error('The uploaded file does not contain a video stream');
        error.code = 'NO_VIDEO_STREAM';
        throw error;
      }

      const rotation = getRotation(videoStream);
      await createPlaybackFile(
        sourcePath,
        playbackPath,
        isRemuxCompatible(sourceMetadata, videoStream, audioStream, rotation),
      );

      const outputDir = `${basePath}/video-thumbnails`;
      const thumbnailResult = await videoThumbnailGenerator.fn({
        videoPath: playbackPath,
        outputDir,
      });
      const playbackSize = (await fsPromises.stat(playbackPath)).size;
      await fileManager.saveFromPath(
        `${basePath}/video/${PLAYBACK_FILENAME}`,
        playbackPath,
        PLAYBACK_MIME_TYPE,
      );

      const playbackMetadata = await probe(playbackPath);
      const playbackVideoStream = playbackMetadata.streams.find(
        (stream) => stream.codec_type === 'video',
      );
      const playbackAudioStream = playbackMetadata.streams.find(
        (stream) => stream.codec_type === 'audio',
      );
      const videoData = {
        status: 'ready',
        duration: Number(playbackMetadata.format.duration) || thumbnailResult.metadata.duration,
        width: playbackVideoStream.width,
        height: playbackVideoStream.height,
        rotation: 0,
        format: playbackMetadata.format.format_name,
        videoCodec: playbackVideoStream.codec_name,
        audioCodec: playbackAudioStream ? playbackAudioStream.codec_name : null,
        playback: {
          filename: PLAYBACK_FILENAME,
          mimeType: PLAYBACK_MIME_TYPE,
          sizeInBytes: playbackSize,
        },
        thumbnails: thumbnailResult.thumbnails,
        errorCode: null,
      };

      await sails.helpers.videoProcessing.updateConsumers.with({
        fileReferenceId: job.fileReferenceId,
        videoData,
      });
      return videoData;
    } finally {
      await fsPromises.rm(temporaryDir, {
        recursive: true,
        force: true,
      });
    }
  },
};
