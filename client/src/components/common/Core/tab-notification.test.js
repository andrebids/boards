import { getTabBadgeText, getTabTitle } from './tab-notification';

describe('tab notification', () => {
  test('formats the unread message count for the compact favicon badge', () => {
    expect(getTabBadgeText(1)).toBe('1');
    expect(getTabBadgeText(9)).toBe('9');
    expect(getTabBadgeText(10)).toBe('9+');
  });

  test('prefixes the browser tab title only while messages are unread', () => {
    expect(getTabTitle('Board | Project', 0)).toBe('Board | Project');
    expect(getTabTitle('Board | Project', 3)).toBe('(3) Board | Project');
  });
});
