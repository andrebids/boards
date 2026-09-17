import createPresenceTracker from './presence-tracker';
import { PresenceStatuses } from '../constants/Enums';

const createFakeTarget = () => {
  const listeners = new Map();

  return {
    visibilityState: 'visible',
    addEventListener: (type, listener) => {
      listeners.set(type, listener);
    },
    removeEventListener: type => {
      listeners.delete(type);
    },
    emit: type => {
      const listener = listeners.get(type);

      if (listener) {
        listener();
      }
    },
    has: type => listeners.has(type),
  };
};

describe('presence tracker', () => {
  let documentRef;
  let onChange;
  let tracker;

  beforeEach(() => {
    jest.useFakeTimers();

    documentRef = createFakeTarget();
    onChange = jest.fn();

    tracker = createPresenceTracker({
      onChange,
      idleAfter: 1000,
      documentRef,
      windowRef: createFakeTarget(),
    });
  });

  afterEach(() => {
    tracker.stop();
    jest.useRealTimers();
  });

  test('reports online as soon as it starts on a visible tab', () => {
    tracker.start();

    expect(onChange).toHaveBeenCalledWith(PresenceStatuses.ONLINE);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('goes idle after the inactivity window and comes back on activity', () => {
    tracker.start();
    jest.advanceTimersByTime(1000);

    expect(onChange).toHaveBeenLastCalledWith(PresenceStatuses.IDLE);

    documentRef.emit('mousemove');

    expect(onChange).toHaveBeenLastCalledWith(PresenceStatuses.ONLINE);
  });

  test('goes idle immediately when the tab is hidden, without waiting', () => {
    tracker.start();

    documentRef.visibilityState = 'hidden';
    documentRef.emit('visibilitychange');

    expect(onChange).toHaveBeenLastCalledWith(PresenceStatuses.IDLE);

    documentRef.emit('mousemove');

    expect(onChange).toHaveBeenLastCalledWith(PresenceStatuses.IDLE);
  });

  test('does not report the same status twice', () => {
    tracker.start();

    documentRef.emit('mousemove');
    documentRef.emit('keydown');

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('starts idle when the tab is already hidden', () => {
    documentRef.visibilityState = 'hidden';
    tracker.start();

    expect(onChange).toHaveBeenCalledWith(PresenceStatuses.IDLE);
  });

  test('stops listening and cancels the timer', () => {
    tracker.start();
    tracker.stop();

    expect(documentRef.has('mousemove')).toBe(false);

    jest.advanceTimersByTime(5000);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
