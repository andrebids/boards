/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fsPromises = require('fs').promises;
const { rimraf } = require('rimraf');
const { getEncoding } = require('istextorbinary');
const mime = require('mime');
const sharp = require('sharp');

const filenamify = require('../../../utils/filenamify');
const { MAX_SIZE_IN_BYTES_TO_GET_ENCODING } = require('../../../constants');

module.exports = {
  inputs: {
    file: {
      type: 'json',
      required: true,
    },
  },

  async fn(inputs) {
    const fileManager = sails.hooks['file-manager'].getInstance();
    sails.log.info('[UPLOAD][PROCESS] start', { filename: inputs && inputs.file && inputs.file.filename, type: inputs && inputs.file && inputs.file.type, size: inputs && inputs.file && inputs.file.size });

    const { id: fileReferenceId } = await FileReference.create().fetch();

    const dirPathSegment = `${sails.config.custom.attachmentsPathSegment}/${fileReferenceId}`;
    const filename = filenamify(inputs.file.filename);

    const mimeType = mime.getType(filename);
    const sizeInBytes = inputs.file.size;

    let buffer;
    let encoding = null;

    if (sizeInBytes <= MAX_SIZE_IN_BYTES_TO_GET_ENCODING) {
      try {
        buffer = await fsPromises.readFile(inputs.file.fd);
      } catch (error) {
        /* empty */
      }

      if (buffer) {
        encoding = getEncoding(buffer);
      }
    }

    const filePath = await fileManager.move(
      inputs.file.fd,
      `${dirPathSegment}/${filename}`,
      inputs.file.type,
    );
    sails.log.info('[UPLOAD][PROCESS] moved', { fileReferenceId, filename, dirPathSegment, hasPath: !!filePath });

    const data = {
      fileReferenceId,
      filename,
      mimeType,
      sizeInBytes,
      encoding,
      image: null,
      video: null,
    };

    if (!['image/svg+xml', 'application/pdf'].includes(mimeType)) {
      let image = sharp(buffer || filePath, {
        animated: true,
      });

      let metadata;
      try {
        metadata = await image.metadata();
      } catch (error) {
        /* empty */
      }

      if (metadata) {
        let { width, pageHeight: height = metadata.height } = metadata;
        if (metadata.orientation && metadata.orientation > 4) {
          [image, width, height] = [image.rotate(), height, width];
        }

        const thumbnailsPathSegment = `${dirPathSegment}/thumbnails`;
        const thumbnailsExtension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;

        try {
          const outside360Buffer = await image
            .resize(360, 360, {
              fit: 'outside',
              withoutEnlargement: true,
            })
            .png({
              quality: 75,
              force: false,
            })
            .toBuffer();

          await fileManager.save(
            `${thumbnailsPathSegment}/outside-360.${thumbnailsExtension}`,
            outside360Buffer,
            inputs.file.type,
          );

          const outside720Buffer = await image
            .resize(720, 720, {
              fit: 'outside',
              withoutEnlargement: true,
            })
            .png({
              quality: 75,
              force: false,
            })
            .toBuffer();

          await fileManager.save(
            `${thumbnailsPathSegment}/outside-720.${thumbnailsExtension}`,
            outside720Buffer,
            inputs.file.type,
          );

          data.image = {
            width,
            height,
            thumbnailsExtension,
          };
        } catch (error) {
          await fileManager.deleteDir(thumbnailsPathSegment);
          sails.log.warn('[UPLOAD][PROCESS] thumbnail generation failed, cleaned up', { err: error && error.message });
        }
      }
    }

    if (!filePath) {
      await rimraf(inputs.file.fd);
    }

    // Garantir que data.image seja sempre inicializado
    if (!data.image) {
      data.image = null;
    }

    // Verificar se é vídeo e processar thumbnails
    const videoMimeTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
    if (videoMimeTypes.includes(mimeType)) {
      try {
        const videoHelper = require('./video-thumbnail-generator');
        const outputDir = `${dirPathSegment}/video-thumbnails`;

        const videoResult = await videoHelper.fn({
          videoPath: filePath,
          outputDir: outputDir,
          filename: filename
        });

        data.video = {
          duration: videoResult.metadata.duration,
          width: videoResult.metadata.width,
          height: videoResult.metadata.height,
          format: videoResult.metadata.format,
          thumbnails: videoResult.thumbnails
        };
      } catch (error) {
        console.error('❌ [process-uploaded-file] Erro ao processar vídeo:', error.message);
        data.video = null;
      }
    }

    // Garantir que data.video seja sempre inicializado
    if (!data.video) {
      data.video = null;
    }

    // Retornar dados do anexo
    const result = {
      fileReferenceId: data.fileReferenceId,
      filename: filename,
      mimeType: mimeType,
      sizeInBytes: data.sizeInBytes,
      encoding: data.encoding,
      image: data.image,
      video: data.video,
      hasImage: data.image !== null,
      hasVideo: data.video !== null,
      imageData: data.image,
      videoData: data.video
    };

    sails.log.info('[UPLOAD][PROCESS] done', { fileReferenceId: result.fileReferenceId, filename: result.filename, mimeType: result.mimeType });
    return result;
  },
};
