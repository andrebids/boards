/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const parseRange = (rangeHeader, sizeInBytes) => {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) {
    return false;
  }

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return false;
    }
    start = Math.max(sizeInBytes - suffixLength, 0);
    end = sizeInBytes - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : sizeInBytes - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= sizeInBytes ||
    end < start
  ) {
    return false;
  }

  return {
    start,
    end: Math.min(end, sizeInBytes - 1),
  };
};

const prepareFileStream = async ({
  req,
  res,
  fileManager,
  path,
  contentType,
  disposition = 'inline',
  cacheControl = 'private, max-age=900',
}) => {
  const sizeInBytes = await fileManager.getSizeInBytes(path);
  if (!Number.isInteger(sizeInBytes)) {
    const error = new Error('File does not exist');
    error.code = 'FILE_NOT_FOUND';
    throw error;
  }

  const range = parseRange(req.headers.range, sizeInBytes);
  res.type(contentType);
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', cacheControl);
  res.set('Content-Disposition', disposition);

  if (range === false) {
    res.status(416);
    res.set('Content-Range', `bytes */${sizeInBytes}`);
    res.set('Content-Length', '0');
    return {
      handled: true,
      stream: null,
    };
  }

  if (range) {
    res.status(206);
    res.set('Content-Range', `bytes ${range.start}-${range.end}/${sizeInBytes}`);
    res.set('Content-Length', String(range.end - range.start + 1));
  } else {
    res.set('Content-Length', String(sizeInBytes));
  }

  if (req.method === 'HEAD') {
    return {
      handled: true,
      stream: null,
    };
  }

  return {
    handled: false,
    stream: await fileManager.read(path, range || undefined),
  };
};

module.exports = {
  parseRange,
  prepareFileStream,
};
