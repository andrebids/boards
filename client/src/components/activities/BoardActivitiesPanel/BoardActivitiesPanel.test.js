/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';

import BoardActivitiesPanel from './BoardActivitiesPanel';

// Mock das dependências
jest.mock('../../../selectors', () => ({
  selectActivityIdsForCurrentBoard: jest.fn(),
  selectCurrentBoard: jest.fn(),
}));

jest.mock('../../../selectors/timelinePanelSelectors', () => ({
  selectIsTimelinePanelExpanded: jest.fn(),
}));

jest.mock('../../../entry-actions', () => ({
  toggleTimelinePanel: jest.fn(() => ({ type: 'TOGGLE_TIMELINE_PANEL' })),
  fetchActivitiesInCurrentBoard: jest.fn(() => ({ type: 'FETCH_ACTIVITIES' })),
}));

// Mock do Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      timelinePanel: (state = { isExpanded: false }, action) => {
        if (action.type === 'TOGGLE_TIMELINE_PANEL') {
          return { ...state, isExpanded: !state.isExpanded };
        }
        return state;
      },
      boards: (state = {}, action) => state,
      activities: (state = {}, action) => state,
    },
    preloadedState: initialState,
  });
};

// Mock dos selectors
const mockSelectors = require('../../../selectors');
const mockTimelineSelectors = require('../../../selectors/timelinePanelSelectors');

describe('BoardActivitiesPanel - Performance Tests', () => {
  let store;
  let mockDispatch;

  beforeEach(() => {
    store = createMockStore();
    mockDispatch = jest.fn();
    store.dispatch = mockDispatch;

    // Mock dos selectors
    mockSelectors.selectActivityIdsForCurrentBoard.mockReturnValue([]);
    mockSelectors.selectCurrentBoard.mockReturnValue({
      id: 'board-1',
      isActivitiesFetching: false,
      isAllActivitiesFetched: true,
    });
    mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <BoardActivitiesPanel />
        </I18nextProvider>
      </Provider>
    );
  };

  describe('Carregamento Automático', () => {
    test('should not load activities on initialization when panel is collapsed', () => {
      renderComponent();
      
      // Verificar que fetchActivitiesInCurrentBoard não foi chamado na inicialização
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FETCH_ACTIVITIES' })
      );
    });

    test('should load activities automatically when panel is expanded', async () => {
      // Mock do painel expandido
      mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(true);
      
      renderComponent();
      
      // Verificar que fetchActivitiesInCurrentBoard foi chamado automaticamente
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'FETCH_ACTIVITIES' })
        );
      });
    });

    test('should load activities when panel is opened for the first time', async () => {
      renderComponent();
      
      // Simular clique para abrir o painel
      const toggleButton = screen.getByRole('button', { name: /expandPanel/i });
      fireEvent.click(toggleButton);

      // Verificar que fetchActivitiesInCurrentBoard foi chamado
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'FETCH_ACTIVITIES' })
        );
      });
    });

    test('should not load activities again when panel is closed and reopened', async () => {
      // Mock do painel já expandido
      mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(true);
      
      renderComponent();
      
      // Verificar que fetchActivitiesInCurrentBoard foi chamado uma vez
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'FETCH_ACTIVITIES' })
        );
      });

      // Limpar mocks
      mockDispatch.mockClear();

      // Simular clique para fechar o painel
      const toggleButton = screen.getByRole('button', { name: /collapsePanel/i });
      fireEvent.click(toggleButton);

      // Verificar que fetchActivitiesInCurrentBoard não foi chamado novamente
      const fetchCalls = mockDispatch.mock.calls.filter(call => 
        call[0]?.type === 'FETCH_ACTIVITIES'
      );
      expect(fetchCalls).toHaveLength(0);
    });
  });

  describe('Botão "Carregar Mais"', () => {
    test('should show "Carregar Mais" button when there are more activities to load', () => {
      // Mock de board com mais atividades para carregar
      mockSelectors.selectCurrentBoard.mockReturnValue({
        id: 'board-1',
        isActivitiesFetching: false,
        isAllActivitiesFetched: false, // Ainda há mais atividades
      });
      mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(true);

      renderComponent();
      
      const loadMoreButton = screen.getByText('Carregar Mais Atividades');
      expect(loadMoreButton).toBeInTheDocument();
    });

    test('should not show "Carregar Mais" button when all activities are loaded', () => {
      // Mock de board com todas as atividades carregadas
      mockSelectors.selectCurrentBoard.mockReturnValue({
        id: 'board-1',
        isActivitiesFetching: false,
        isAllActivitiesFetched: true, // Todas as atividades carregadas
      });
      mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(true);

      renderComponent();
      
      const loadMoreButton = screen.queryByText('Carregar Mais Atividades');
      expect(loadMoreButton).not.toBeInTheDocument();
    });

    test('should call fetchActivitiesInCurrentBoard when "Carregar Mais" is clicked', async () => {
      // Mock de board com mais atividades para carregar
      mockSelectors.selectCurrentBoard.mockReturnValue({
        id: 'board-1',
        isActivitiesFetching: false,
        isAllActivitiesFetched: false,
      });
      mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(true);

      renderComponent();
      
      const loadMoreButton = screen.getByText('Carregar Mais Atividades');
      fireEvent.click(loadMoreButton);

      // Verificar que fetchActivitiesInCurrentBoard foi chamado
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'FETCH_ACTIVITIES' })
        );
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading indicator when fetching activities', () => {
      // Mock de board carregando atividades
      mockSelectors.selectCurrentBoard.mockReturnValue({
        id: 'board-1',
        isActivitiesFetching: true,
        isAllActivitiesFetched: false,
      });
      mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(true);

      renderComponent();
      
      // Verificar que o loader está presente
      const loader = screen.getByRole('generic', { name: /loader/i });
      expect(loader).toBeInTheDocument();
    });

    test('should not show "Carregar Mais" button when fetching activities', () => {
      // Mock de board carregando atividades
      mockSelectors.selectCurrentBoard.mockReturnValue({
        id: 'board-1',
        isActivitiesFetching: true,
        isAllActivitiesFetched: false,
      });
      mockTimelineSelectors.selectIsTimelinePanelExpanded.mockReturnValue(true);

      renderComponent();
      
      const loadMoreButton = screen.queryByText('Carregar Mais Atividades');
      expect(loadMoreButton).not.toBeInTheDocument();
    });
  });

  describe('Reset State on Board Change', () => {
    test('should reset hasTriggeredFetch when board changes', async () => {
      // Primeiro board
      mockSelectors.selectCurrentBoard.mockReturnValue({
        id: 'board-1',
        isActivitiesFetching: false,
        isAllActivitiesFetched: true,
      });

      const { rerender } = renderComponent();
      
      // Simular clique para abrir o painel no primeiro board
      const toggleButton = screen.getByRole('button', { name: /expandPanel/i });
      fireEvent.click(toggleButton);

      // Verificar que fetchActivitiesInCurrentBoard foi chamado
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'FETCH_ACTIVITIES' })
        );
      });

      // Limpar mocks
      mockDispatch.mockClear();

      // Mudar para segundo board
      mockSelectors.selectCurrentBoard.mockReturnValue({
        id: 'board-2',
        isActivitiesFetching: false,
        isAllActivitiesFetched: true,
      });

      // Re-renderizar com novo board
      rerender(
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <BoardActivitiesPanel />
          </I18nextProvider>
        </Provider>
      );

      // Simular clique para abrir o painel no segundo board
      const newToggleButton = screen.getByRole('button', { name: /expandPanel/i });
      fireEvent.click(newToggleButton);

      // Verificar que fetchActivitiesInCurrentBoard foi chamado novamente (reset funcionou)
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'FETCH_ACTIVITIES' })
        );
      });
    });
  });
});
