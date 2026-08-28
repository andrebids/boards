import fs from 'fs';
import path from 'path';

const readSource = (fileName) =>
  fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'chat', 'MessageList', fileName),
    'utf8',
  );

describe('chat image attachment loading', () => {
  test('covers each image with the existing loader until it loads or fails', () => {
    const component = readSource('MessageAttachments.jsx');
    const styles = readSource('MessageList.module.scss');

    expect(component).toMatch(/import \{ Loader \} from ['"]semantic-ui-react['"];/);
    expect(component).toMatch(/className=\{styles\.imageLoadingOverlay\}/);
    expect(component).toMatch(/onLoad=\{handleLoad\}/);
    expect(component).toMatch(/onError=\{handleLoad\}/);
    expect(styles).toMatch(/\.imageLoadingOverlay \{[\s\S]*?inset: 0;[\s\S]*?position: absolute;/);
  });
});
