const getCoverThumbnailUrl = (attachment) => attachment?.data?.thumbnailUrls?.outside360 || null;
export default getCoverThumbnailUrl;
