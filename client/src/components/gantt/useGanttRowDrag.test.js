import React from 'react';
import { renderToString } from 'react-dom/server';
import useGanttRowDrag from './useGanttRowDrag';

// The browser checks exercise SVAR's real ID codec. This test supplies plain fixture IDs.
jest.mock('@svar-ui/lib-dom', () => ({ getID: (node) => node.id }));

const mountProtocol = (overrides = {}) => {
  const items = ['a', 'b'].map((id, index) => ({
    id,
    task: id,
    itemType: 'task',
    parentId: null,
    ganttPlanId: 'p',
    position: 65536 * (index + 1),
    version: 1,
  }));
  const a = { id: 'a', text: 'a', parent: 0, $level: 1 };
  const b = { id: 'b', text: 'b', parent: 0, $level: 1 };
  const root = { id: 0, data: [a, b] };
  const guards = {};
  const listeners = {};
  const exec = jest.fn();
  const options = {
    items,
    readonly: false,
    onMove: jest.fn(),
    onReset: jest.fn(),
    ...overrides,
  };
  let drag;
  function Harness() {
    drag = useGanttRowDrag(options);
    return null;
  }
  // Render real React hooks once; no DOM effects are needed to exercise the native event protocol.
  renderToString(React.createElement(Harness));
  drag.init({
    getTask: (id) => ({ a, b, 0: root })[id],
    exec,
    intercept: (name, callback) => {
      guards[name] = callback;
    },
    on: (name, callback) => {
      listeners[name] = callback;
    },
  });
  const start = () =>
    drag.onPointerDown({
      button: 0,
      clientX: 100,
      target: { closest: () => ({ id: 'b' }) },
    });
  // SVAR has moved B under A in its temporary tree. The application must only save at drop.
  const nest = () => {
    b.parent = 'a';
    b.$level = 2;
    a.data = [b];
    root.data = [a];
  };
  return { drag, start, nest, guards, listeners, exec, ...options };
};

test('leaves the native drag destination and preview unchanged', async () => {
  const fixture = mountProtocol();
  fixture.start();
  const move = Object.freeze({
    id: 'b',
    target: 'a',
    mode: 'before',
    inProgress: true,
  });
  expect(fixture.guards['move-task'](move)).toBe(true);
  expect(fixture.guards['drag-task']({ id: 'b', top: 0, inProgress: true })).toBe(true);
  await fixture.listeners['move-task'](move);
  expect(fixture.exec).not.toHaveBeenCalled();
  expect(fixture.onMove).not.toHaveBeenCalled();
});

test.each(['ArrowLeft', 'ArrowRight'])('uses native indentation for %s', (key) => {
  const fixture = mountProtocol();
  fixture.drag.onKeyDown({
    altKey: true,
    key,
    target: { closest: () => ({ id: 'b' }) },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  });
  expect(fixture.exec).toHaveBeenCalledWith('indent-task', {
    id: 'b',
    mode: key === 'ArrowRight',
  });
});

test('saves once at drop, never during preview, and blocks another move while saving', async () => {
  let resolveSave;
  const onMove = jest.fn(
    () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
  );
  const fixture = mountProtocol({ onMove });
  fixture.start();
  fixture.nest();
  await fixture.listeners['move-task']({ id: 'b', inProgress: true });
  expect(onMove).not.toHaveBeenCalled();
  const saving = fixture.listeners['move-task']({ id: 'b', inProgress: false });
  expect(onMove).toHaveBeenCalledWith('b', {
    parentId: 'a',
    position: 65536,
    version: 1,
  });
  expect(fixture.guards['move-task']({ id: 'a', target: 'b', mode: 'child' })).toBe(false);
  resolveSave();
  await saving;
  expect(onMove).toHaveBeenCalledTimes(1);
  expect(fixture.onReset).toHaveBeenCalledTimes(1);
});

test.each(['keydown', 'blur', 'pointercancel'])(
  'cancels %s without saving the temporary tree',
  async (type) => {
    const fixture = mountProtocol();
    fixture.start();
    fixture.nest();
    fixture.drag.onCancel({ type, key: 'Escape' });
    await fixture.listeners['move-task']({ id: 'b', inProgress: false });
    expect(fixture.onMove).not.toHaveBeenCalled();
    expect(fixture.onReset).toHaveBeenCalledTimes(1);
  },
);

test('denies readonly moves and discards a native drop without saving', async () => {
  const fixture = mountProtocol({ readonly: true });
  expect(fixture.guards['move-task']({ id: 'b', target: 'a', mode: 'child' })).toBe(false);
  await fixture.listeners['move-task']({ id: 'b', inProgress: false });
  expect(fixture.onMove).not.toHaveBeenCalled();
});

test('a drop back in the same visual position does not reorder hidden unscheduled siblings', async () => {
  const items = ['a', 'b', 'hidden'].map((id, index) => ({
    id,
    itemType: 'task',
    parentId: null,
    ganttPlanId: 'p',
    position: (index + 1) * 65536,
    version: 1,
  }));
  const fixture = mountProtocol({ items });
  fixture.start();
  await fixture.listeners['drag-task']({ id: 'b', top: 42, inProgress: false });
  expect(fixture.onMove).not.toHaveBeenCalled();
});

test('resets the preview and unlocks interaction even if persistence rejects', async () => {
  const fixture = mountProtocol({
    onMove: jest.fn().mockRejectedValue(new Error('save failed')),
  });
  fixture.nest();
  await expect(fixture.listeners['move-task']({ id: 'b', inProgress: false })).rejects.toThrow(
    'save failed',
  );
  expect(fixture.onReset).toHaveBeenCalledTimes(1);
  expect(fixture.guards['move-task']({ id: 'b', target: 'a', mode: 'after' })).toBe(true);
});

test.each([
  [1, 2, 20, 'child'],
  [2, 1, -20, 'outdent'],
])(
  'keeps the clone anchored to its initial level %i when SVAR moves it to %i',
  (from, to, shift, kind) => {
    const a = { id: 'a', text: 'A', parent: 0, $level: 1 };
    const b = {
      id: 'b',
      text: 'B',
      parent: from === 2 ? 'a' : 0,
      $level: from,
    };
    const root = { id: 0, data: from === 2 ? [a] : [a, b] };
    a.data = from === 2 ? [b] : [];
    const items = [a, b].map((task) => ({
      id: task.id,
      parentId: task.parent || null,
      itemType: 'task',
      ganttPlanId: 'p',
    }));
    const listeners = {};
    const exec = jest.fn();
    const onMove = jest.fn();
    const previews = [];
    function Harness() {
      const phase = React.useRef(0);
      const drag = useGanttRowDrag({
        items,
        readonly: false,
        onMove,
        onReset: jest.fn(),
      });
      previews.push(drag.preview);
      // Same-component render updates exercise real preview state without adding a DOM dependency.
      const step = phase.current;
      phase.current += 1;
      if (step === 0) {
        drag.init({
          getTask: (id) => ({ a, b, 0: root })[id],
          exec,
          intercept: () => {},
          on: (name, callback) => {
            listeners[name] = callback;
          },
        });
        drag.onPointerDown({
          button: 0,
          clientX: 100,
          target: { closest: () => ({ id: 'b' }) },
        });
      }
      if (step < 2) {
        const level = step === 0 ? to : from;
        b.parent = level === 2 ? 'a' : 0;
        b.$level = level;
        a.data = level === 2 ? [b] : [];
        root.data = level === 2 ? [a] : [a, b];
        listeners['drag-task']({ id: 'b', top: 42, inProgress: true });
      } else if (step === 2) {
        drag.onCancel({ type: 'keydown', key: 'Escape' });
      }
      return null;
    }
    renderToString(React.createElement(Harness));
    expect(previews).toEqual([
      null,
      expect.objectContaining({ kind, level: to, shift }),
      expect.objectContaining({ kind: 'order', level: from, shift: 0 }),
      null,
    ]);
    expect(exec).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  },
);
