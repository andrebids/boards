import Paths from '../../constants/Paths';

export const getGlobalConversationTarget = ({
  currentPathname,
  currentProjectId,
  currentSearch,
  firstBoardId,
  item,
}) => {
  const conversationId = item?.conversationId || item?.id;
  if (!item?.projectId || !conversationId) {
    return null;
  }

  const isCurrentProject = item.projectId === currentProjectId;
  let pathname = currentPathname;
  if (!isCurrentProject) {
    pathname = firstBoardId
      ? Paths.BOARDS.replace(':id', firstBoardId)
      : Paths.PROJECTS.replace(':id', item.projectId);
  }
  const parameters = new URLSearchParams(isCurrentProject ? currentSearch : '');

  parameters.set('chatConversation', conversationId);
  if (item.firstUnreadMessageId) {
    parameters.set('chatMessage', item.firstUnreadMessageId);
  } else {
    parameters.delete('chatMessage');
  }
  if (item.reply) {
    parameters.set('reply', '1');
  } else {
    parameters.delete('reply');
  }

  return {
    conversationId,
    isCurrentProject,
    path: `${pathname}?${parameters.toString()}`,
  };
};

export default {
  getGlobalConversationTarget,
};
