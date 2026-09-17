/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import categoriseAttachment from './categorise-attachment';
import { AttachmentTypes, MediaTypeFilters } from '../constants/Enums';

const file = data => ({ type: AttachmentTypes.FILE, data });

describe('categoriseAttachment', () => {
  it('categorises links', () => {
    expect(
      categoriseAttachment({
        type: AttachmentTypes.LINK,
        data: { url: 'https://example.com' },
      })
    ).toBe(MediaTypeFilters.LINKS);
  });

  it('categorises images by their image metadata', () => {
    expect(
      categoriseAttachment(
        file({ extension: 'png', image: { width: 10, height: 10 } })
      )
    ).toBe(MediaTypeFilters.IMAGES);
  });

  it('categorises videos by metadata or mime type', () => {
    expect(categoriseAttachment(file({ extension: 'mp4', video: {} }))).toBe(
      MediaTypeFilters.VIDEOS
    );

    expect(
      categoriseAttachment(file({ extension: 'mov', mimeType: 'video/quicktime' }))
    ).toBe(MediaTypeFilters.VIDEOS);
  });

  it('categorises known document extensions', () => {
    ['pdf', 'DOCX', 'csv', 'json'].forEach(extension => {
      expect(categoriseAttachment(file({ extension }))).toBe(
        MediaTypeFilters.DOCUMENTS
      );
    });
  });

  it('falls back to others', () => {
    expect(categoriseAttachment(file({ extension: 'zip' }))).toBe(
      MediaTypeFilters.OTHERS
    );

    expect(categoriseAttachment(file({}))).toBe(MediaTypeFilters.OTHERS);
    expect(categoriseAttachment({ type: AttachmentTypes.FILE })).toBe(
      MediaTypeFilters.OTHERS
    );
  });
});
