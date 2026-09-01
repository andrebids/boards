import getTaskKeyboardMove from './keyboard-move';

const tasks = [
  { id: 'a', taskListId: 'list', parentTaskId: null },
  { id: 'b', taskListId: 'list', parentTaskId: null },
  { id: 'b1', taskListId: 'list', parentTaskId: 'b' },
  { id: 'c', taskListId: 'list', parentTaskId: null },
];

describe('task keyboard move', () => {
  test('moves between siblings', () => {
    expect(getTaskKeyboardMove(tasks, 'b', 'up')).toEqual({
      taskListId: 'list',
      parentTaskId: null,
      index: 0,
    });
    expect(getTaskKeyboardMove(tasks, 'b', 'down')).toEqual({
      taskListId: 'list',
      parentTaskId: null,
      index: 2,
    });
  });

  test('indents under the previous sibling and appends after its children', () => {
    expect(getTaskKeyboardMove(tasks, 'c', 'in')).toEqual({
      taskListId: 'list',
      parentTaskId: 'b',
      index: 1,
    });
  });

  test('outdents immediately after its parent', () => {
    expect(getTaskKeyboardMove(tasks, 'b1', 'out')).toEqual({
      taskListId: 'list',
      parentTaskId: null,
      index: 2,
    });
  });

  test('returns null when the requested move is not available', () => {
    expect(getTaskKeyboardMove(tasks, 'a', 'up')).toBeNull();
    expect(getTaskKeyboardMove(tasks, 'a', 'in')).toBeNull();
    expect(getTaskKeyboardMove(tasks, 'a', 'out')).toBeNull();
  });
});
