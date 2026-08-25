const getAttachmentTimestamp = (attachment) => {
  const timestamp = attachment.createdAt?.getTime?.() ?? new Date(attachment.createdAt).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
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
