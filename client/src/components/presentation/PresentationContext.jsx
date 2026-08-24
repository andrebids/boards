import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import PropTypes from 'prop-types';

import api, { socket } from '../../api';
import { initialPresentationState, presentationStateReducer } from './presentationState';

const PresentationContext = createContext(null);

export const usePresentation = () => {
  const value = useContext(PresentationContext);

  if (!value) {
    throw new Error('usePresentation must be used inside ProjectPresentationProvider');
  }

  return value;
};

export const ProjectPresentationProvider = React.memo(({ projectId, children }) => {
  const [state, dispatch] = useReducer(presentationStateReducer, {
    ...initialPresentationState,
    isLoading: Boolean(projectId),
  });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!projectId) {
      dispatch({ type: 'loaded', payload: initialPresentationState });
      return;
    }

    if (!silent) {
      dispatch({ type: 'loadStarted' });
    }
    try {
      const body = await api.getProjectPresentations(projectId);
      dispatch({
        type: 'loaded',
        payload: {
          presentations: body.items || [],
          canEdit: Boolean(body.meta?.canEdit),
        },
      });
    } catch (error) {
      dispatch({ type: 'loadFailed', error });
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleUpdate = ({ item }) => {
      if (item?.projectId === projectId) {
        load({ silent: true });
      }
    };

    socket.on('projectPresentationUpdate', handleUpdate);
    return () => socket.off('projectPresentationUpdate', handleUpdate);
  }, [load, projectId]);

  const activate = useCallback(
    async (boardId) => {
      const body = await api.createBoardPresentation(boardId);
      dispatch({ type: 'presentationUpdated', presentation: body.item, projectId });
      return body.item;
    },
    [projectId],
  );

  const disable = useCallback(
    async (presentationId) => {
      const body = await api.disableProjectPresentation(presentationId);
      dispatch({ type: 'presentationUpdated', presentation: body.item, projectId });
      return body.item;
    },
    [projectId],
  );

  const selectBoard = useCallback((boardId) => {
    dispatch({ type: 'presentationBoardSelected', boardId });
  }, []);

  const updateSession = useCallback((presentationId, key, keyVersion) => {
    dispatch({ type: 'presentationSessionUpdated', presentationId, key, keyVersion });
  }, []);

  const value = useMemo(
    () => ({ ...state, activate, disable, selectBoard, updateSession, reload: load }),
    [activate, disable, load, selectBoard, state, updateSession],
  );

  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
});

ProjectPresentationProvider.propTypes = {
  projectId: PropTypes.string,
  children: PropTypes.node.isRequired,
};

ProjectPresentationProvider.defaultProps = {
  projectId: undefined,
};
