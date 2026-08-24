import fs from 'fs';
import path from 'path';

const readSource = (fileName) => fs.readFileSync(path.resolve(__dirname, fileName), 'utf8');

describe('VideoPlayer loop control', () => {
  it('uses distinct repeat icons for the disabled and enabled states', () => {
    const source = readSource('./VideoPlayer.jsx');

    expect(source).toMatch(/import \{ RepeatIcon, RepeatOnIcon \} from '@vidstack\/react\/icons';/);
    expect(source).toContain('const LoopIcon = isLooping ? RepeatOnIcon : RepeatIcon;');
    expect(source).not.toContain('defaultLayoutIcons.PlayButton.Replay');
    expect(source).toContain('aria-pressed={isLooping}');
  });

  it('distinguishes the enabled state from keyboard focus without relying only on color', () => {
    const styles = readSource('./VideoPlayer.module.scss');
    const enabledState = styles.match(/\.loopButton\[aria-pressed='true'\] \{([^}]+)\}/)?.[1];

    expect(enabledState).toContain('background:');
    expect(styles).toContain('.loopButton:focus-visible');
  });
});
