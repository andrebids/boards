import fs from 'fs';
import path from 'path';

const readChatFile = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'chat', ...segments), 'utf8');

const readLayer = (source, name) => {
  const match = source.match(new RegExp(`--chat-layer-${name}:\\s*(\\d+);`));

  return match ? Number(match[1]) : null;
};

describe('chat layering', () => {
  test('keeps every chat surface above the application overlays in a stable order', () => {
    const theme = readChatFile('theme.scss');
    const dock = readLayer(theme, 'dock');
    const panel = readLayer(theme, 'panel');
    const launcher = readLayer(theme, 'launcher');
    const popover = readLayer(theme, 'popover');
    const preview = readLayer(theme, 'preview');

    expect(dock).toBeGreaterThan(10021);
    expect(panel).toBeGreaterThan(dock);
    expect(launcher).toBeGreaterThan(panel);
    expect(popover).toBeGreaterThan(launcher);
    expect(preview).toBeGreaterThan(popover);
  });

  test('uses the shared layers on fixed chat surfaces and portals', () => {
    expect(readChatFile('ChatDock', 'ChatDock.module.scss')).toMatch(
      /z-index:\s*var\(--chat-layer-dock\)/,
    );
    expect(readChatFile('ChatPanel', 'ChatPanel.module.scss')).toMatch(
      /z-index:\s*var\(--chat-layer-panel\)/,
    );
    expect(readChatFile('ChatLauncher', 'ChatLauncher.module.scss')).toMatch(
      /z-index:\s*var\(--chat-layer-launcher\)/,
    );
    expect(readChatFile('ConversationActions', 'ConversationActions.module.scss')).toMatch(
      /z-index:\s*var\(--chat-layer-popover\)/,
    );
    expect(readChatFile('MessageComposer', 'MessageComposer.jsx')).toMatch(
      /zIndex:\s*'var\(--chat-layer-popover,\s*10033\)'/,
    );

    const messageListStyles = readChatFile('MessageList', 'MessageList.module.scss');
    expect(messageListStyles).toMatch(
      /\.floatingReactionEmojiMenu[\s\S]*z-index:\s*var\(--chat-layer-popover\)/,
    );
    expect(messageListStyles).toMatch(
      /\.previewBackdrop[\s\S]*z-index:\s*var\(--chat-layer-preview\)/,
    );
  });
});
