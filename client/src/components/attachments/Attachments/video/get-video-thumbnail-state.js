const getVideoThumbnailState = ({ status, thumbnailUrl, hasError }) => {
  if (status === 'pending' || status === 'processing') {
    return 'processing';
  }

  if (status === 'failed' || hasError) {
    return 'error';
  }

  return thumbnailUrl ? 'ready' : 'unavailable';
};

export default getVideoThumbnailState;
