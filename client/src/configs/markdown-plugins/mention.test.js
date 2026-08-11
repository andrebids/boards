import MarkdownIt from 'markdown-it';
import imsize from '@diplodoc/transform/lib/plugins/imsize';

import mention from './mention';

const createMarkdown = () =>
  new MarkdownIt({ breaks: true, linkify: true })
    .use(imsize, { enableInlineStyling: true })
    .use(mention);

describe('mention markdown plugin', () => {
  test('preserves an inline image next to a mention and text', () => {
    const html = createMarkdown().render(
      '![Captura](https://example.com/capture.png =204x) @[Catarina](user-1) texto',
    );

    expect(html).toContain('<img src="https://example.com/capture.png" alt="Captura" width="204"');
    expect(html).toContain('<span class="mention" data-user-id="user-1">@Catarina</span> texto');
    expect(html).not.toContain('![Captura]');
  });

  test('preserves the surrounding markdown tokens', () => {
    const html = createMarkdown().render(
      '**Antes** @[Catarina](user-1) [depois](https://example.com)',
    );

    expect(html).toContain('<strong>Antes</strong>');
    expect(html).toContain('<span class="mention" data-user-id="user-1">@Catarina</span>');
    expect(html).toContain('<a href="https://example.com">depois</a>');
  });
});
