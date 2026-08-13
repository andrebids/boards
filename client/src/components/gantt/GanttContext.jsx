/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import api, { socket } from '../../api';

const GanttContext = createContext(null);

export const useGantt = () => {
  const value = useContext(GanttContext);

  if (!value) {
    throw new Error('useGantt must be used inside ProjectGanttProvider');
  }

  return value;
};

export const ProjectGanttProvider = React.memo(({ projectId, children }) => {
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [links, setLinks] = useState([]);
  const [users, setUsers] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setPlan(null);
      setItems([]);
      setLinks([]);
      setUsers([]);
      setCanEdit(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const body = await api.getProjectGanttPlan(projectId);
      setPlan(body.item || null);
      setItems(body.included?.ganttItems || []);
      setLinks(body.included?.ganttLinks || []);
      setUsers(body.included?.users || []);
      setCanEdit(Boolean(body.meta?.canEdit));
    } catch (nextError) {
      setError(nextError);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handlePlanUpdate = ({ item }) => {
      if (item?.projectId === projectId) {
        setPlan(item);
      }
    };
    const handleItemCreate = ({ item }) => {
      setItems((currentItems) =>
        currentItems.some(({ id }) => id === item.id) ? currentItems : [...currentItems, item],
      );
    };
    const handleItemUpdate = ({ item }) => {
      setItems((currentItems) =>
        currentItems.map((currentItem) => (currentItem.id === item.id ? item : currentItem)),
      );
    };
    const handleItemDelete = ({ item, included }) => {
      const deletedItemIds = new Set(included?.deletedItemIds || [item.id]);
      setItems((currentItems) =>
        currentItems.filter((currentItem) => !deletedItemIds.has(currentItem.id)),
      );
      setLinks((currentLinks) =>
        currentLinks.filter(
          ({ sourceItemId, targetItemId }) =>
            !deletedItemIds.has(sourceItemId) && !deletedItemIds.has(targetItemId),
        ),
      );
    };
    const handleLinksUpdate = ({ items: nextLinks }) => setLinks(nextLinks);

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
    setPlan(body.item);
    setItems(body.included?.ganttItems || items);
    setLinks(body.included?.ganttLinks || links);
    setCanEdit(Boolean(body.meta?.canEdit));
    return body.item;
  }, [items, links, projectId]);

  const disable = useCallback(async () => {
    if (!plan) {
      return null;
    }

    const body = await api.disableGanttPlan(plan.id);
    setPlan(body.item);
    return body.item;
  }, [plan]);

  const updatePlan = useCallback(
    async (data) => {
      const body = await api.updateGanttPlan(plan.id, data);
      setPlan(body.item);
      return body.item;
    },
    [plan],
  );

  const createItem = useCallback(
    async (data) => {
      const { predecessorIds = [], ...itemData } = data;
      const body = await api.createGanttItem(plan.id, itemData);
      setItems((currentItems) => [...currentItems, body.item]);
      if (body.item.itemType === 'task') {
        const linksBody = await api.updateGanttItemDependencies(body.item.id, predecessorIds);
        setLinks(linksBody.items);
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
        setItems((currentItems) => currentItems.map((item) => (item.id === id ? body.item : item)));
        if (predecessorIds) {
          const linksBody = await api.updateGanttItemDependencies(id, predecessorIds);
          setLinks(linksBody.items);
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
    setItems((currentItems) => currentItems.filter((item) => !deletedItemIds.has(item.id)));
    setLinks((currentLinks) =>
      currentLinks.filter(
        ({ sourceItemId, targetItemId }) =>
          !deletedItemIds.has(sourceItemId) && !deletedItemIds.has(targetItemId),
      ),
    );
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
    async (taskIds) => {
      const body = await api.importGanttSourceTasks(plan.id, taskIds);
      setItems((currentItems) => {
        const nextItemsById = new Map(currentItems.map((item) => [item.id, item]));
        body.items.forEach((item) => nextItemsById.set(item.id, item));
        return [...nextItemsById.values()];
      });
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
