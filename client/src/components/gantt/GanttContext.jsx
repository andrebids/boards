/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import PropTypes from 'prop-types';

import api, { socket } from '../../api';
import { ganttStateReducer, initialGanttState } from './ganttState';

const GanttContext = createContext(null);

export const useGantt = () => {
  const value = useContext(GanttContext);

  if (!value) {
    throw new Error('useGantt must be used inside ProjectGanttProvider');
  }

  return value;
};

export const ProjectGanttProvider = React.memo(({ projectId, children }) => {
  const [state, dispatch] = useReducer(ganttStateReducer, {
    ...initialGanttState,
    isLoading: Boolean(projectId),
  });
  const { plan, items, links, users, canEdit, isLoading, error } = state;

  const load = useCallback(async () => {
    if (!projectId) {
      dispatch({ type: 'loaded', payload: initialGanttState });
      return;
    }

    dispatch({ type: 'loadStarted' });

    try {
      const body = await api.getProjectGanttPlan(projectId);
      dispatch({
        type: 'loaded',
        payload: {
          plan: body.item || null,
          items: body.included?.ganttItems || [],
          links: body.included?.ganttLinks || [],
          users: body.included?.users || [],
          canEdit: Boolean(body.meta?.canEdit),
        },
      });
    } catch (nextError) {
      dispatch({ type: 'loadFailed', error: nextError });
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handlePlanUpdate = ({ item }) => {
      if (item?.projectId === projectId) {
        dispatch({ type: 'planUpdated', plan: item });
      }
    };
    const handleItemCreate = ({ item }) => {
      dispatch({ type: 'itemCreated', item });
    };
    const handleItemUpdate = ({ item }) => {
      dispatch({ type: 'itemUpdated', item });
    };
    const handleItemDelete = ({ item, included }) => {
      const deletedItemIds = new Set(included?.deletedItemIds || [item.id]);
      dispatch({ type: 'itemsDeleted', itemIds: [...deletedItemIds] });
    };
    const handleLinksUpdate = ({ items: nextLinks }) =>
      dispatch({ type: 'linksUpdated', links: nextLinks });

    socket.on('ganttPlanUpdate', handlePlanUpdate);
    socket.on('ganttItemCreate', handleItemCreate);
    socket.on('ganttItemUpdate', handleItemUpdate);
    socket.on('ganttItemDelete', handleItemDelete);
    socket.on('ganttLinksUpdate', handleLinksUpdate);

    return () => {
      socket.off('ganttPlanUpdate', handlePlanUpdate);
      socket.off('ganttItemCreate', handleItemCreate);
      socket.off('ganttItemUpdate', handleItemUpdate);
      socket.off('ganttItemDelete', handleItemDelete);
      socket.off('ganttLinksUpdate', handleLinksUpdate);
    };
  }, [projectId]);

  const activate = useCallback(async () => {
    const body = await api.createProjectGanttPlan(projectId);
    dispatch({
      type: 'loaded',
      payload: {
        ...state,
        plan: body.item,
        items: body.included?.ganttItems || items,
        links: body.included?.ganttLinks || links,
        canEdit: Boolean(body.meta?.canEdit),
      },
    });
    return body.item;
  }, [items, links, projectId, state]);

  const disable = useCallback(async () => {
    if (!plan) {
      return null;
    }

    const body = await api.disableGanttPlan(plan.id);
    dispatch({ type: 'planUpdated', plan: body.item });
    return body.item;
  }, [plan]);

  const updatePlan = useCallback(
    async (data) => {
      const body = await api.updateGanttPlan(plan.id, data);
      dispatch({ type: 'planUpdated', plan: body.item });
      return body.item;
    },
    [plan],
  );

  const createItem = useCallback(
    async (data) => {
      const { predecessorIds = [], ...itemData } = data;
      const body = await api.createGanttItem(plan.id, { ...itemData, predecessorIds });
      dispatch({ type: 'itemCreated', item: body.item });
      if (body.included?.ganttLinks) {
        dispatch({ type: 'linksUpdated', links: body.included.ganttLinks });
      }
      return body.item;
    },
    [plan],
  );

  const updateItem = useCallback(
    async (id, data) => {
      try {
        const { predecessorIds, ...itemData } = data;
        const body = await api.updateGanttItem(id, itemData);
        dispatch({ type: 'itemUpdated', item: body.item });
        if (predecessorIds) {
          const linksBody = await api.updateGanttItemDependencies(id, predecessorIds);
          dispatch({ type: 'linksUpdated', links: linksBody.items });
        }
        return body.item;
      } catch (nextError) {
        await load();
        throw nextError;
      }
    },
    [load],
  );

  const deleteItem = useCallback(async (id) => {
    const body = await api.deleteGanttItem(id);
    const deletedItemIds = new Set(body.included?.deletedItemIds || [id]);
    dispatch({ type: 'itemsDeleted', itemIds: [...deletedItemIds] });
    return body.item;
  }, []);

  const getSourceTasks = useCallback(
    async (filters = {}) => {
      if (!plan) {
        return { items: [], included: { boards: [] }, meta: { canImport: false } };
      }
      return api.getGanttSourceTasks(plan.id, filters);
    },
    [plan],
  );

  const importSourceTasks = useCallback(
    async (sources) => {
      const { taskIds, cardIds = [] } = Array.isArray(sources)
        ? { taskIds: sources }
        : sources;
      const body = await api.importGanttSourceTasks(plan.id, taskIds, cardIds);
      dispatch({ type: 'itemsImported', items: body.items });
      return body;
    },
    [plan],
  );

  const linkedItemsByTaskId = useMemo(
    () =>
      Object.fromEntries(
        items.filter(({ sourceTaskId }) => sourceTaskId).map((item) => [item.sourceTaskId, item]),
      ),
    [items],
  );

  const value = useMemo(
    () => ({
      plan,
      items,
      links,
      users,
      canEdit,
      isLoading,
      error,
      activate,
      disable,
      updatePlan,
      createItem,
      updateItem,
      deleteItem,
      getSourceTasks,
      importSourceTasks,
      linkedItemsByTaskId,
      reload: load,
    }),
    [
      plan,
      items,
      links,
      users,
      canEdit,
      isLoading,
      error,
      activate,
      disable,
      updatePlan,
      createItem,
      updateItem,
      deleteItem,
      getSourceTasks,
      importSourceTasks,
      linkedItemsByTaskId,
      load,
    ],
  );

  return <GanttContext.Provider value={value}>{children}</GanttContext.Provider>;
});

ProjectGanttProvider.propTypes = {
  projectId: PropTypes.string,
  children: PropTypes.node.isRequired,
};

ProjectGanttProvider.defaultProps = {
  projectId: undefined,
};
