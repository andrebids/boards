import { useEffect, useState } from 'react';

import api, { socket } from '../../../api';
import { createDashboardTaskListSnapshot, reduceDashboardTaskListEvent } from './dashboardTaskList';

const EMPTY_SNAPSHOT = { taskList: null, tasks: [] };
const SOCKET_EVENTS = [
  'taskListUpdate',
  'taskListDelete',
  'taskCreate',
  'taskUpdate',
  'taskDelete',
];

const useDashboardTaskList = (cardId, taskListId) => {
  const [state, setState] = useState({
    ...EMPTY_SNAPSHOT,
    error: false,
    isLoading: false,
  });

  useEffect(() => {
    if (!cardId || !taskListId) {
      setState({ ...EMPTY_SNAPSHOT, error: false, isLoading: false });
      return undefined;
    }

    let isCancelled = false;

    const load = async () => {
      setState((previous) => ({ ...previous, error: false, isLoading: true }));

      try {
        const body = await api.getSubscribedCard(cardId);

        if (!isCancelled) {
          setState({
            ...createDashboardTaskListSnapshot(body, taskListId),
            error: false,
            isLoading: false,
          });
        }
      } catch {
        if (!isCancelled) {
          setState({ ...EMPTY_SNAPSHOT, error: true, isLoading: false });
        }
      }
    };

    const handlers = SOCKET_EVENTS.map((eventName) => {
      const handler = ({ item }) => {
        if (!item) {
          return;
        }

        setState((previous) => ({
          ...previous,
          ...reduceDashboardTaskListEvent(
            { taskList: previous.taskList, tasks: previous.tasks },
            eventName,
            item,
          ),
        }));
      };

      socket.on(eventName, handler);
      return [eventName, handler];
    });

    socket.on('reconnect', load);
    load();

    return () => {
      isCancelled = true;
      socket.off('reconnect', load);
      handlers.forEach(([eventName, handler]) => socket.off(eventName, handler));
    };
  }, [cardId, taskListId]);

  return state;
};

export default useDashboardTaskList;
