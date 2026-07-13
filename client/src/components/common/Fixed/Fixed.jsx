/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import selectors from '../../../selectors';
import { selectIsSidebarExpanded } from '../../../selectors/sidebarSelectors';
import Header from '../Header';
import Favorites from '../Favorites';
import HomeActions from '../HomeActions';
import Project from '../../projects/Project';
import BoardActions from '../../boards/BoardActions';
import BoardActivitiesPanel from '../../activities/BoardActivitiesPanel';
import Sidebar from '../Sidebar/Sidebar';
import ChatProvider from '../../chat/ChatContext';
import ChatDock from '../../chat/ChatDock';
import ChatLauncher from '../../chat/ChatLauncher';

import styles from './Fixed.module.scss';

const Fixed = React.memo(() => {
  const { projectId } = useSelector(selectors.selectPath);
  const board = useSelector(selectors.selectCurrentBoard);
  const isSidebarExpanded = useSelector(selectIsSidebarExpanded);

  return (
    <ChatProvider>
      <div
        className={classNames(styles.wrapper, {
          [styles.sidebarExpanded]: isSidebarExpanded,
        })}
      >
        <Sidebar />
        <Header />
        <Favorites />
        {projectId === undefined && <HomeActions />}
        {projectId && <Project />}
        {board && !board.isFetching && <BoardActions />}
        <BoardActivitiesPanel />
        <ChatLauncher />
        <ChatDock />
      </div>
    </ChatProvider>
  );
});

export default Fixed;
