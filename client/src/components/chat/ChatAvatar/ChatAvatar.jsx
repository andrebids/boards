import React from 'react';
import PropTypes from 'prop-types';
import initials from 'initials';
import { UserRound, Users } from 'lucide-react';

import styles from './ChatAvatar.module.scss';

const mutedColors = ['#536b84', '#65717d', '#55737a', '#74677f', '#747b61'];

const ChatAvatar = React.memo(({ isOnline, isProject, user }) => {
  const colorIndex = user
    ? [...user.name].reduce(
        (sum, character) => sum + character.charCodeAt(0),
        0,
      ) % mutedColors.length
    : 0;

  let contentNode = initials(user?.name || '?').slice(0, 2);
  if (user?.avatar) {
    contentNode = (
      <span
        className={styles.image}
        style={{
          backgroundImage: `url("${user.avatar.thumbnailUrls.cover180}")`,
        }}
      />
    );
  } else if (isProject) {
    contentNode = <Users aria-hidden="true" size={17} strokeWidth={2.2} />;
  } else if (!user) {
    contentNode = <UserRound aria-hidden="true" size={17} strokeWidth={2.2} />;
  }

  return (
    <span className={styles.avatar} style={{ backgroundColor: mutedColors[colorIndex] }}>
      {contentNode}
      {isOnline && <span className={styles.online} />}
    </span>
  );
});

ChatAvatar.propTypes = {
  isOnline: PropTypes.bool,
  isProject: PropTypes.bool,
  user: PropTypes.shape({
    name: PropTypes.string,
    avatar: PropTypes.shape({
      thumbnailUrls: PropTypes.shape({
        cover180: PropTypes.string.isRequired,
      }).isRequired,
    }),
  }),
};

ChatAvatar.defaultProps = {
  isOnline: false,
  isProject: false,
  user: undefined,
};

export default ChatAvatar;
