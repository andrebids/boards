/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import ProjectItem from './ProjectItem';
import {
  selectSidebarFavoriteProjectsOrdered,
  selectSidebarOtherProjectsOrdered,
} from '../../../selectors/sidebarSelectors';
import {
  saveProjectsOrder,
  loadProjectsOrder,
  saveFavoritesOrder,
  loadFavoritesOrder,
} from '../../../actions/sidebarActions';
import ActionTypes from '../../../constants/ActionTypes';

import styles from './ProjectList.module.scss';

const ProjectList = React.memo(() => {
  const dispatch = useDispatch();
  const favoriteProjects = useSelector(selectSidebarFavoriteProjectsOrdered);
  const otherProjects = useSelector(selectSidebarOtherProjectsOrdered);
  const [showAll, setShowAll] = useState(false);

  // Carregar ordenação na inicialização
  useEffect(() => {
    const savedOrder = localStorage.getItem('planka_projects_order');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        dispatch(loadProjectsOrder(order));
      } catch (error) {
        console.warn('Erro ao carregar ordenação:', error);
        localStorage.removeItem('planka_projects_order');
      }
    }
    const savedFavOrder = localStorage.getItem('planka_favorites_order');
    if (savedFavOrder) {
      try {
        const order = JSON.parse(savedFavOrder);
        dispatch(loadFavoritesOrder(order));
      } catch (error) {
        console.warn('Erro ao carregar ordenação de favoritos:', error);
        localStorage.removeItem('planka_favorites_order');
      }
    }
  }, [dispatch]);

  // Limitar projetos para performance (mostrar apenas 20 inicialmente)
  const displayedProjects = useMemo(() => {
    if (showAll) {
      return otherProjects;
    }
    return otherProjects.slice(0, 20);
  }, [otherProjects, showAll]);

  const hasMoreProjects = otherProjects.length > displayedProjects.length;

  const handleDragEnd = result => {
    if (!result.destination) {
      return;
    }
    const sourceId = result.source.droppableId;
    if (sourceId === 'favorites') {
      var favItems = favoriteProjects.slice();
      var moved = favItems.splice(result.source.index, 1)[0];
      favItems.splice(result.destination.index, 0, moved);
      var favOrder = [];
      for (var i = 0; i < favItems.length; i += 1) {
        favOrder.push(favItems[i].id);
      }
      dispatch(saveFavoritesOrder(favOrder));
      try {
        localStorage.setItem(
          'planka_favorites_order',
          JSON.stringify(favOrder)
        );
      } catch (e) {}
      return;
    }

    var items = displayedProjects.slice();
    var reorderedItem = items.splice(result.source.index, 1)[0];
    items.splice(result.destination.index, 0, reorderedItem);
    var newOrder = [];
    for (var j = 0; j < items.length; j += 1) {
      newOrder.push(items[j].id);
    }
    dispatch(saveProjectsOrder(newOrder));
    try {
      localStorage.setItem('planka_projects_order', JSON.stringify(newOrder));
    } catch (e) {}
  };

  if (favoriteProjects.length === 0 && otherProjects.length === 0) {
    return (
      <div className={styles.wrapper}>
        <h3 className={styles.title}>MEUS PROJETOS</h3>
        <div className={styles.empty}>
          <p>Nenhum projeto encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {favoriteProjects.length > 0 && (
          <>
            <h3 className={styles.title}>FAVORITOS</h3>
            <Droppable droppableId="favorites" direction="vertical">
              {provided => (
                <div
                  className={styles.list}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {favoriteProjects.map((project, index) => (
                    <Draggable
                      key={project.id}
                      draggableId={'fav_' + project.id.toString()}
                      index={index}
                    >
                      {(provided2, snapshot2) => (
                        <div
                          ref={provided2.innerRef}
                          {...provided2.draggableProps}
                          {...provided2.dragHandleProps}
                          className={`${styles.draggableItem} ${snapshot2.isDragging ? styles.dragging : ''}`}
                        >
                          <ProjectItem project={project} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </>
        )}

        <h3 className={styles.title}>MEUS PROJETOS</h3>

        <Droppable droppableId="projects">
          {provided => (
            <div
              className={styles.list}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {displayedProjects.map((project, index) => (
                <Draggable
                  key={project.id}
                  draggableId={project.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${styles.draggableItem} ${
                        snapshot.isDragging ? styles.dragging : ''
                      }`}
                    >
                      <ProjectItem project={project} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Indicador de mais projetos */}
              {hasMoreProjects && (
                <div className={styles.moreProjects}>
                  <button
                    className={styles.moreButton}
                    onClick={() => setShowAll(!showAll)}
                    type="button"
                  >
                    {showAll
                      ? 'Mostrar menos'
                      : `Mostrar mais ${otherProjects.length - displayedProjects.length} projetos`}
                  </button>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
});

ProjectList.propTypes = {};

export default ProjectList;
