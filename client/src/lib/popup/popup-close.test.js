import shouldClosePopup from './popup-close';

describe('shouldClosePopup', () => {
  test('keeps the popup mounted while a nested alert dialog handles confirmation', () => {
    const event = {
      target: {
        closest: jest.fn(() => ({})),
      },
    };

    expect(shouldClosePopup(event)).toBe(false);
    expect(event.target.closest).toHaveBeenCalledWith('[role="alertdialog"]');
  });

  test('closes the popup for ordinary outside events', () => {
    const event = {
      target: {
        closest: jest.fn(() => null),
      },
    };

    expect(shouldClosePopup(event)).toBe(true);
  });
});
