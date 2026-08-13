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
  const [users, setUsers] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setPlan(null);
      setItems([]);
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
    const handleItemDelete = ({ item }) => {
      setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
    };

    socket.on('ganttPlanUpdate', handlePlanUpdate);
    socket.on('ganttItemCreate', handleItemCreate);
    socket.on('ganttItemUpdate', handleItemUpdate);
    socket.on('ganttItemDelete', handleItemDelete);

    return () => {
      socket.off('ganttPlanUpdate', handlePlanUpdate);
      socket.off('ganttItemCreate', handleItemCreate);
      socket.off('ganttItemUpdate', handleItemUpdate);
      socket.off('ganttItemDelete', handleItemDelete);
    };
  }, [projectId]);

  const activate = useCallback(async () => {
    const body = await api.createProjectGanttPlan(projectId);
    setPlan(body.item);
    setItems(body.included?.ganttItems || items);
    setCanEdit(Boolean(body.meta?.canEdit));
    return body.item;
  }, [items, projectId]);

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
      const body = await api.createGanttItem(plan.id, data);
      setItems((currentItems) => [...currentItems, body.item]);
      return body.item;
    },
    [plan],
  );

  const updateItem = useCallback(
    async (id, data) => {
      try {
        const body = await api.updateGanttItem(id, data);
        setItems((currentItems) => currentItems.map((item) => (item.id === id ? body.item : item)));
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
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    return body.item;
  }, []);

  const value = useMemo(
    () => ({
      plan,
      items,
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
      reload: load,
    }),
    [
      plan,
      items,
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
