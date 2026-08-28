import confirmLeaveGroup from './leave-group';

describe('confirmLeaveGroup', () => {
  test('does not leave when the confirmation is cancelled', () => {
    const onConfirm = jest.fn();

    const didConfirm = confirmLeaveGroup(() => false, 'Leave?', onConfirm);

    expect(didConfirm).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('leaves after confirmation', () => {
    const confirm = jest.fn(() => true);
    const onConfirm = jest.fn();

    const didConfirm = confirmLeaveGroup(confirm, 'Leave?', onConfirm);

    expect(confirm).toHaveBeenCalledWith('Leave?');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(didConfirm).toBe(true);
  });
});
