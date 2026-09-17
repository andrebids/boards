import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';

import Paths from '../../constants/Paths';
import LabelChip from '../labels/LabelChip';
import DueDateChip from '../cards/DueDateChip';
import CardMembers from '../cards/Card/CardMembers';

import cardStyles from '../cards/Card/Card.module.scss';
import contentStyles from '../cards/Card/ProjectContent.module.scss';
import styles from './TransversalWorkspace.module.scss';

const TransversalCard = React.memo(({ card }) => {
  const userIds = card.members.map(({ id }) => id);
  const fallbackUsersById = Object.fromEntries(card.members.map((user) => [user.id, user]));
  const isCompact = card.labels.length === 0 && !card.dueDate && !card.commentsTotal;

  return (
    <Link
      className={classNames(cardStyles.wrapper, styles.card)}
      to={Paths.CARDS.replace(':id', card.id)}
    >
      <div className={contentStyles.wrapper}>
        <div className={contentStyles.name}>{card.name}</div>
        {card.labels.length > 0 && (
          <span className={classNames(contentStyles.labels, !isCompact && contentStyles.labelsFull)}>
            {card.labels.map((label) => (
              <span
                key={label.id}
                className={classNames(contentStyles.attachment, contentStyles.attachmentLeft)}
              >
                <LabelChip id={label.id} fallbackLabel={label} size="tiny" />
              </span>
            ))}
          </span>
        )}
        <div className={contentStyles.footer}>
          <span className={contentStyles.attachments}>
            <span className={classNames(contentStyles.attachment, contentStyles.attachmentLeft)}>
              <span className={contentStyles.attachmentContent} title={card.boardName}>
                <Icon name="columns" />
                {card.boardName}
              </span>
            </span>
            {card.dueDate && (
              <span className={classNames(contentStyles.attachment, contentStyles.attachmentLeft)}>
                <DueDateChip value={new Date(card.dueDate)} size="tiny" variant="metadata" />
              </span>
            )}
            {card.commentsTotal > 0 && (
              <span className={classNames(contentStyles.attachment, contentStyles.attachmentLeft)}>
                <span className={contentStyles.attachmentContent}>
                  <Icon name="comment outline" />
                  {card.commentsTotal}
                </span>
              </span>
            )}
          </span>
          <CardMembers userIds={userIds} fallbackUsersById={fallbackUsersById} />
        </div>
      </div>
    </Link>
  );
});

TransversalCard.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    boardName: PropTypes.string,
    dueDate: PropTypes.string,
    commentsTotal: PropTypes.number,
    members: PropTypes.arrayOf(PropTypes.object).isRequired,
    labels: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default TransversalCard;
