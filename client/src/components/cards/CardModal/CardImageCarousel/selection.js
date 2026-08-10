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

export default getDefaultMedia;
