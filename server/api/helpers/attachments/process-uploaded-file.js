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
const videoThumbnailGenerator = require('./video-thumbnail-generator');

module.exports = {
  inputs: {
    file: {
      type: 'json',
      required: true,
    },
  },

  async fn(inputs) {
    const fileManager = sails.hooks['file-manager'].getInstance();
    sails.log.info('[UPLOAD][PROCESS] start', {
      filename: inputs && inputs.file && inputs.file.filename,
      type: inputs && inputs.file && inputs.file.type,
      size: inputs && inputs.file && inputs.file.size,
    });

    const { id: fileReferenceId } = await FileReference.create().fetch();

    const dirPathSegment = `${sails.config.custom.attachmentsPathSegment}/${fileReferenceId}`;
    try {
      const filename = filenamify(inputs.file.filename);

      const mimeType = mime.getType(filename) || inputs.file.type;
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
      // The local file manager returns the final local path. S3 does not, so keep using the
      // upload's temporary file until all processing (including video frame extraction) is done.
      const sourceFilePath = filePath || inputs.file.fd;
      sails.log.info('[UPLOAD][PROCESS] moved', {
        fileReferenceId,
        filename,
        dirPathSegment,
        hasPath: !!filePath,
      });

      const data = {
        fileReferenceId,
        filename,
        mimeType,
        sizeInBytes,
        encoding,
        image: null,
        video: null,
      };

      // Sharp não suporta PSD, AI, EPS e outros formatos de design - excluir para evitar falhas
      const formatsExcludedFromSharp = [
        'image/svg+xml',
        'application/pdf',
        'application/x-photoshop',
        'image/vnd.adobe.photoshop',
        'application/illustrator',
        'image/vnd.adobe.illustrator',
        'application/postscript',
        'application/eps',
        'application/x-illustrator',
      ];
      if (!formatsExcludedFromSharp.includes(mimeType)) {
        let image = sharp(buffer || sourceFilePath, {
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
            sails.log.warn('[UPLOAD][PROCESS] thumbnail generation failed, cleaned up', {
              err: error && error.message,
            });
          }
        }
      }

      // Garantir que data.image seja sempre inicializado
      if (!data.image) {
        data.image = null;
      }

      // Verificar se é vídeo e processar thumbnails
      if (mimeType && mimeType.startsWith('video/')) {
        try {
          const outputDir = `${dirPathSegment}/video-thumbnails`;

          const videoResult = await videoThumbnailGenerator.fn({
            videoPath: sourceFilePath,
            outputDir,
          });

          data.video = {
            duration: videoResult.metadata.duration,
            width: videoResult.metadata.width,
            height: videoResult.metadata.height,
            format: videoResult.metadata.format,
            thumbnails: videoResult.thumbnails,
          };
        } catch (error) {
          sails.log.error('[UPLOAD][VIDEO] thumbnail generation failed', {
            filename,
            mimeType,
            error: error.message,
          });
          data.video = null;
        }
      }

      if (!filePath) {
        await rimraf(inputs.file.fd);
      }

      // Garantir que data.video seja sempre inicializado
      if (!data.video) {
        data.video = null;
      }

      // Retornar dados do anexo
      const result = {
        fileReferenceId: data.fileReferenceId,
        filename,
        mimeType,
        sizeInBytes: data.sizeInBytes,
        encoding: data.encoding,
        image: data.image,
        video: data.video,
        hasImage: data.image !== null,
        hasVideo: data.video !== null,
        imageData: data.image,
        videoData: data.video,
      };

      sails.log.info('[UPLOAD][PROCESS] done', {
        fileReferenceId: result.fileReferenceId,
        filename: result.filename,
        mimeType: result.mimeType,
      });
      return result;
    } catch (error) {
      await Promise.allSettled([
        fileManager.deleteDir(dirPathSegment),
        rimraf(inputs.file.fd),
        FileReference.destroyOne({ id: fileReferenceId, total: 0 }),
      ]);
      throw error;
    }
  },
};
