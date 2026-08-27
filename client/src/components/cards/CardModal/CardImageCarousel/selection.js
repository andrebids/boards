import { AttachmentTypes } from '../../../../constants/Enums';
import { isLocalId } from '../../../../utils/local-id';

const getAttachmentTimestamp = (attachment) => {
  const timestamp = attachment.createdAt?.getTime?.() ?? new Date(attachment.createdAt).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const isVideoAttachment = (attachment) =>
  Boolean(
    attachment.data?.video ||
      (attachment.data?.mimeType && attachment.data.mimeType.startsWith('video/')),
  );

export const isPersistedAttachment = (attachment) =>
  Boolean(
    attachment &&
      attachment.isPersisted !== false &&
      (attachment.isPersisted === true ||
        (typeof attachment.id === 'string' && !isLocalId(attachment.id))),
  );

export const isCoverableAttachment = (attachment) =>
  Boolean(
    isPersistedAttachment(attachment) &&
      attachment.type === AttachmentTypes.FILE &&
      attachment.data?.image &&
      !isVideoAttachment(attachment),
  );

export const isDownloadableAttachment = (attachment) =>
  Boolean(
    isPersistedAttachment(attachment) &&
      attachment.type === AttachmentTypes.FILE &&
      attachment.data?.url,
  );

export const getCarouselAttachments = (attachments, coverAttachmentId) => {
  const coverAttachment = attachments.find((attachment) => attachment.id === coverAttachmentId);

  if (!coverAttachment) {
    return attachments;
  }

  return [
    coverAttachment,
    ...attachments.filter((attachment) => attachment.id !== coverAttachment.id),
  ];
};

const getDefaultMedia = (attachments, coverAttachmentId) => {
  const coverAttachment = attachments.find((attachment) => attachment.id === coverAttachmentId);

  if (coverAttachment) {
    return coverAttachment;
  }

  return attachments.reduce(
    (latest, attachment) =>
      !latest || getAttachmentTimestamp(attachment) > getAttachmentTimestamp(latest)
        ? attachment
        : latest,
    null,
  );
};

export const getNewlyAddedMedia = (attachments, previousAttachmentIds, currentUserId) => {
  const previousIds = new Set(previousAttachmentIds);

  return attachments.reduce(
    (newlyAddedMedia, attachment) =>
      attachment.creatorUserId === currentUserId && !previousIds.has(attachment.id)
        ? attachment
        : newlyAddedMedia,
    null,
  );
};

export default getDefaultMedia;
