import { useCallback, useEffect, useRef, useState } from 'react';
// Reuse the ID codec shipped with the installed SVAR Gantt, including its string-ID prefix.
// eslint-disable-next-line import/no-extraneous-dependencies
import { getID } from '@svar-ui/lib-dom';
import { isValidParent } from './ganttHierarchy';
import getGanttRowMoveChanges, { getGanttRowDropIntent } from './ganttRowMove';

export default function useGanttRowDrag({ items, readonly, onMove, onReset, containerRef }) {
  const options = useRef();
  options.current = { items, readonly, onMove, onReset };
  const apiRef = useRef(null);
  const gesture = useRef(null);
  const saving = useRef(false);
  const indenting = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!preview?.parentId || !['child', 'outdent'].includes(preview.kind)) return undefined;
    const rows = Array.from(
      containerRef?.current?.querySelectorAll('.wx-table [role="row"][data-id]') || [],
    ).filter((row) => getID(row) === preview.parentId);
    rows.forEach((row) => row.setAttribute('data-gantt-drop-parent', 'true'));
    return () => rows.forEach((row) => row.removeAttribute('data-gantt-drop-parent'));
  }, [containerRef, preview]);

  const getIntent = useCallback((id) => {
    const api = apiRef.current;
    const task = api.getTask(id);
    return getGanttRowDropIntent(
      options.current.items,
      task,
      api.getTask(task.parent || 0),
      gesture.current ? gesture.current.x - gesture.current.startX : 0,
    );
  }, []);

  const updatePreview = useCallback(() => {
    const drag = gesture.current;
    if (!drag?.active || drag.cancelled) return;
    const intent = getIntent(drag.id);
    const task = apiRef.current.getTask(drag.id);
    const parent = intent.parentId && apiRef.current.getTask(intent.parentId);
    let kind = 'order';
    if (intent.parentId !== (drag.parent || null)) {
      kind = intent.level < task.$level || !intent.parentId ? 'outdent' : 'child';
    }
    if (!intent.valid || drag.invalid) kind = 'invalid';
    const next = {
      kind,
      parentId: intent.parentId,
      parentName: parent?.text,
      // SVAR's DOM clone keeps its initial indentation while the live task changes level.
      shift: intent.valid ? (intent.level - drag.level) * 20 : 0,
      level: intent.valid ? intent.level : task.$level,
    };
    setPreview((previous) =>
      previous && Object.keys(next).every((key) => previous[key] === next[key]) ? previous : next,
    );
  }, [getIntent]);

  const finish = useCallback(
    async (id) => {
      const api = apiRef.current;
      const drag = gesture.current;
      if (drag) drag.active = false;
      setPreview(null);
      let task = api.getTask(id);
      if (!task || drag?.cancelled || drag?.invalid || options.current.readonly || saving.current) {
        gesture.current = null;
        options.current.onReset();
        return;
      }
      // SVAR owns dragging and tree moves. Only translate a sideways drop into its
      // existing indent command, once, after the native drag has finished.
      const intent = getIntent(id);
      if (!intent.valid) {
        gesture.current = null;
        options.current.onReset();
        return;
      }
      if (intent.mode !== undefined) {
        indenting.current = true;
        try {
          await api.exec('indent-task', { id, mode: intent.mode });
        } finally {
          indenting.current = false;
        }
        task = api.getTask(id);
      }
      gesture.current = null;
      if (drag?.invalid) {
        options.current.onReset();
        return;
      }
      const siblings = api.getTask(task.parent || 0).data || [];
      const index = siblings.findIndex((row) => row.id === id);
      const beforeId = siblings[index + 1]?.id;
      if (drag && drag.parent === task.parent && drag.beforeId === beforeId) {
        options.current.onReset();
        return;
      }
      const changes = getGanttRowMoveChanges(
        options.current.items,
        id,
        task.parent || null,
        beforeId,
      );
      if (changes) {
        saving.current = true;
        setIsSaving(true);
        try {
          await options.current.onMove(id, changes);
        } finally {
          saving.current = false;
          setIsSaving(false);
          options.current.onReset();
        }
      } else options.current.onReset();
    },
    [getIntent],
  );

  const init = useCallback(
    (api) => {
      apiRef.current = api;
      api.intercept('move-task', (event) => {
        const { current } = options;
        if (event.inProgress === false) return true; // Native end event only clears its preview.
        if (current.readonly || saving.current || gesture.current?.cancelled) return false;
        const item = current.items.find((entry) => entry.id === event.id);
        const target = api.getTask(event.target);
        const parentId = event.mode === 'child' ? target?.id : target?.parent || null;
        const valid = Boolean(
          item &&
            target &&
            ['before', 'after', 'child'].includes(event.mode) &&
            isValidParent(current.items, item, parentId),
        );
        if (gesture.current) gesture.current.invalid = !valid;
        return valid;
      });
      api.on('move-task', async (event) => {
        if (!event.inProgress && !indenting.current) await finish(event.id);
      });
      api.intercept('drag-task', (event) => {
        if (event.top === undefined) return true;
        if (event.inProgress === false) return true;
        if (options.current.readonly || saving.current || gesture.current?.cancelled) return false;
        return true;
      });
      api.on('drag-task', async (event) => {
        if (event.top === undefined) return;
        if (event.inProgress === false) await finish(event.id);
        else if (gesture.current) {
          gesture.current.active = true;
          updatePreview();
        }
      });
    },
    [finish, updatePreview],
  );

  const cancel = useCallback((event) => {
    if (event.type === 'keydown' && event.key !== 'Escape') return;
    if (!gesture.current) return;
    gesture.current.cancelled = true;
    setPreview(null);
  }, []);

  useEffect(() => {
    const recordDrop = (event) => {
      if (gesture.current) gesture.current.x = event.changedTouches?.[0]?.clientX ?? event.clientX;
    };
    const observeMove = (event) => {
      if (!gesture.current) return;
      gesture.current.x = event.touches?.[0]?.clientX ?? event.clientX;
      updatePreview();
    };
    // Observe for visual feedback only. SVAR still owns hit testing and movement.
    document.addEventListener('mousemove', observeMove, true);
    document.addEventListener('touchmove', observeMove, true);
    // Capture the release before SVAR's window handler; leave all movement to SVAR.
    document.addEventListener('mouseup', recordDrop, true);
    document.addEventListener('touchend', recordDrop, true);
    document.addEventListener('keydown', cancel, true);
    window.addEventListener('blur', cancel);
    document.addEventListener('touchcancel', cancel);
    return () => {
      document.removeEventListener('mousemove', observeMove, true);
      document.removeEventListener('touchmove', observeMove, true);
      document.removeEventListener('mouseup', recordDrop, true);
      document.removeEventListener('touchend', recordDrop, true);
      document.removeEventListener('keydown', cancel, true);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('touchcancel', cancel);
    };
  }, [cancel, updatePreview]);

  const onPointerDown = useCallback((event) => {
    if (
      options.current.readonly ||
      saving.current ||
      (event.button !== undefined && event.button !== 0)
    )
      return;
    const row = event.target.closest('.wx-table [data-id]');
    const task = row && apiRef.current?.getTask(getID(row));
    if (!task) return;
    const x = event.touches?.[0]?.clientX ?? event.clientX;
    const siblings = apiRef.current.getTask(task.parent || 0).data || [];
    const index = siblings.findIndex((entry) => entry.id === task.id);
    gesture.current = {
      id: task.id,
      level: task.$level,
      startX: x,
      x,
      parent: task.parent,
      beforeId: siblings[index + 1]?.id,
    };
  }, []);

  const onKeyDown = useCallback((event) => {
    if (!event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))
      return;
    const row = event.target.closest('.wx-table [data-id]');
    const api = apiRef.current;
    const task = row && api?.getTask(getID(row));
    if (!task || options.current.readonly || saving.current) return;
    event.preventDefault();
    event.stopPropagation();
    gesture.current = null;
    const siblings = api.getTask(task.parent || 0).data || [];
    const index = siblings.findIndex((entry) => entry.id === task.id);
    const previous = siblings[index - 1];
    const next = siblings[index + 1];
    let move;
    if (event.key === 'ArrowUp' && previous) move = { target: previous.id, mode: 'before' };
    if (event.key === 'ArrowDown' && next) move = { target: next.id, mode: 'after' };
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      api.exec('indent-task', {
        id: task.id,
        mode: event.key === 'ArrowRight',
      });
      return;
    }
    if (move) api.exec('move-task', { id: task.id, ...move });
  }, []);

  return { init, onPointerDown, onKeyDown, onCancel: cancel, isSaving, preview };
}
