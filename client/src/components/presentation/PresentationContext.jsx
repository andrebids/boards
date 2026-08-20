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

  const load = useCallback(async () => {
    if (!projectId) {
      dispatch({ type: 'loaded', payload: initialPresentationState });
      return;
    }

    dispatch({ type: 'loadStarted' });
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
        load();
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

  const value = useMemo(
    () => ({ ...state, activate, disable, reload: load }),
    [activate, disable, load, state],
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
