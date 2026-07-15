import { scheduleChatParticipantMuteExpiration } from './useChatParticipantMuteState';

describe('chat participant mute expiration', () => {
  test('schedules one timeout and expires when the target time is reached', () => {
    let now = 1000;
    let scheduledCallback;
    const onExpire = jest.fn();
    const setTimeout = jest.fn((callback) => {
      scheduledCallback = callback;
      return 7;
    });
    const clearTimeout = jest.fn();

    const cancel = scheduleChatParticipantMuteExpiration(2000, onExpire, {
      now: () => now,
      setTimeout,
      clearTimeout,
    });

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][1]).toBe(1025);
    expect(onExpire).not.toHaveBeenCalled();

    now = 2000;
    scheduledCallback();

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    cancel();
    expect(clearTimeout).toHaveBeenCalledWith(7);
  });

  test('expires immediately when the target time has already passed', () => {
    const onExpire = jest.fn();
    const setTimeout = jest.fn();

    scheduleChatParticipantMuteExpiration(999, onExpire, {
      now: () => 1000,
      setTimeout,
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(setTimeout).not.toHaveBeenCalled();
  });
});
