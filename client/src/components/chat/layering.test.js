import fs from 'fs';
import path from 'path';

const readChatFile = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'chat', ...segments), 'utf8');

const readLayer = (source, name) => {
  const match = source.match(new RegExp(`--chat-layer-${name}:\\s*(\\d+);`));

  return match ? Number(match[1]) : null;
};

// Read only the declarations before any nested rule, so child offsets cannot satisfy a parent check.
const readDeclarations = (source, className) => {
  const block = source.match(new RegExp(`\\.${className}\\s*\\{([^{}]*)`))?.[1] || '';
  return Object.fromEntries(
    [...block.matchAll(/([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
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
    expect(readChatFile('MessageComposer', 'MessageComposer.jsx')).toMatch(/<MessageTextInput\b/);
    expect(readChatFile('MessageList', 'MessageEditor.jsx')).toMatch(/<MessageTextInput\b/);
    const textInput = readChatFile('MessageComposer', 'MessageTextInput.jsx');
    expect(textInput).toMatch(/suggestionsPortalHost=\{document\.body\}/);
    expect(textInput).toMatch(/zIndex:\s*'var\(--chat-layer-popover,\s*10033\)'/);

    const messageListStyles = readChatFile('MessageList', 'MessageList.module.scss');
    expect(messageListStyles).toMatch(
      /\.floatingReactionEmojiMenu[\s\S]*z-index:\s*var\(--chat-layer-popover\)/,
    );
    expect(messageListStyles).toMatch(
      /\.previewBackdrop[\s\S]*z-index:\s*var\(--chat-layer-preview\)/,
    );
  });

  test('keeps the compact panel bottom-anchored and viewport-bounded on desktop and mobile', () => {
    const panelStyles = readChatFile('ChatPanel', 'ChatPanel.module.scss');
    const [desktopStyles, mobileStyles] = panelStyles.split(
      '@media only screen and (max-width: 767px)',
    );
    const panel = readDeclarations(desktopStyles, 'panel');
    const discovery = readDeclarations(desktopStyles, 'discoveryPanel');

    expect(panel).toMatchObject({
      position: 'fixed',
      bottom: '84px',
      right: '24px',
      width: '380px',
      'max-height': 'min(640px, calc(100dvh - 96px))',
    });
    expect(discovery).toEqual({ height: 'auto' });
    expect(panel.top).toBeUndefined();

    // Keep long lists scrollable inside the viewport cap rather than expanding the panel.
    expect(readDeclarations(desktopStyles, 'content')).toMatchObject({
      'min-height': '0',
      overflow: 'hidden',
    });
    expect(panelStyles).toMatch(/\.discoveryContent\s*\{[^{}]*overflow-y:\s*auto;/);

    const mobilePanel = readDeclarations(mobileStyles, 'panel');
    expect(mobilePanel).toMatchObject({
      bottom: '76px',
      height: 'auto',
      left: '12px',
      right: '12px',
      width: 'auto',
      top: '16px',
      'max-height': 'calc(100dvh - 92px)',
    });
    expect(readDeclarations(mobileStyles, 'discoveryPanel')).toEqual({ top: 'auto' });

    const [desktopLauncherStyles, mobileLauncherStyles] = readChatFile(
      'ChatLauncher',
      'ChatLauncher.module.scss',
    ).split('@media only screen and (max-width: 767px)');
    const launcher = readDeclarations(desktopLauncherStyles, 'launcher');
    const mobileLauncher = readDeclarations(mobileLauncherStyles, 'launcher');
    expect(
      parseFloat(panel.bottom) - parseFloat(launcher.bottom) - parseFloat(launcher.height),
    ).toBe(8);
    expect(
      parseFloat(mobilePanel.bottom) -
        parseFloat(mobileLauncher.bottom) -
        parseFloat(launcher.height),
    ).toBe(8);
  });
});
