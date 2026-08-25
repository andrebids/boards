const { formatTextWithMentions } = require('./mentions');

const MAX_TASK_NAME_LENGTH = 1024;

const getTaskNameFromContent = (content) =>
  formatTextWithMentions(String(content || ''))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '')
    .replace(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/gm, '')
    .replace(/[`*_~>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TASK_NAME_LENGTH);

const getTaskContentValues = ({ content, name }) => {
  const sourceContent = content === undefined || content === null ? name : content;
  const normalizedContent = String(sourceContent || '').trim();
  const normalizedName = getTaskNameFromContent(normalizedContent);

  return normalizedName
    ? {
        content: normalizedContent,
        name: normalizedName,
      }
    : null;
};

const remapTaskAttachmentUrls = (content, attachmentIdMap) =>
  String(content || '').replace(
    /(^|[("'=\s])\/attachments\/(\d+)(?=\/)/g,
    (match, prefix, attachmentId) =>
      attachmentIdMap[attachmentId]
        ? `${prefix}/attachments/${attachmentIdMap[attachmentId]}`
        : match,
  );

module.exports = {
  getTaskContentValues,
  getTaskNameFromContent,
  remapTaskAttachmentUrls,
};
