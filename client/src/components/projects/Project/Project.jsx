/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import selectors from '../../../selectors';
import ModalTypes from '../../../constants/ModalTypes';
import Paths from '../../../constants/Paths';
import ProjectSettingsModal from '../ProjectSettingsModal';
import Boards from '../../boards/Boards';
import BoardSettingsModal from '../../boards/BoardSettingsModal';

import styles from './Project.module.scss';

const Project = React.memo(() => {
  const modal = useSelector(selectors.selectCurrentModal);
  const project = useSelector(selectors.selectCurrentProject);
  const board = useSelector(selectors.selectCurrentBoard);
  const firstBoardId = useSelector(state => {
    if (!project) return null;
    return selectors.selectFirstBoardIdByProjectId(state, project.id);
  });

  const navigate = useNavigate();

  // Redirecionamento automático para o primeiro quadro
  useEffect(() => {
    // Só redireciona se:
    // 1. Temos um projeto
    // 2. Não temos um quadro selecionado (estamos na página do projeto)
    // 3. Existe pelo menos um quadro no projeto
    if (project && !board && firstBoardId) {
      navigate(Paths.BOARDS.replace(':id', firstBoardId));
    }
  }, [project, board, firstBoardId, navigate]);

  let modalNode = null;
  if (modal) {
    switch (modal.type) {
      case ModalTypes.PROJECT_SETTINGS:
        modalNode = <ProjectSettingsModal />;

        break;
      case ModalTypes.BOARD_SETTINGS:
        modalNode = <BoardSettingsModal />;

        break;
      default:
    }
  }

  return (
    <>
      <div className={styles.wrapper}>
        <Boards />
      </div>
      {modalNode}
    </>
  );
});

export default Project;
