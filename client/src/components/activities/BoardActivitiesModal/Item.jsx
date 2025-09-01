/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo, useState, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Comment } from 'semantic-ui-react';
import { Gallery, Item as GalleryItem } from 'react-photoswipe-gallery';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import { StaticUserIds } from '../../../constants/StaticUsers';
import { ActivityTypes, AttachmentTypes } from '../../../constants/Enums';
import { canPreviewFile } from '../../../utils/fileTypeUtils';
import { ClosableContext } from '../../../contexts';
import TimeAgo from '../../common/TimeAgo';
import UserAvatar from '../../users/UserAvatar';

import styles from './Item.module.scss';

const Item = React.memo(({ id }) => {
  const selectActivityById = useMemo(
    () => selectors.makeSelectActivityById(),
    []
  );
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectAttachmentsForCard = useMemo(
    () => selectors.makeSelectAttachmentsForCard(),
    []
  );

  const activity = useSelector(state => selectActivityById(state, id));
  const user = useSelector(state => selectUserById(state, activity?.userId));
  const card = useSelector(state => selectCardById(state, activity?.cardId));
  const attachments = useSelector(state =>
    selectAttachmentsForCard(state, activity?.cardId)
  );

  // Verificação de segurança para evitar erros quando activity ou user estão undefined
  if (!activity) {
    console.warn('Activity não encontrada para ID:', id);
    return null;
  }

  if (!user) {
    console.warn('User não encontrado para activity:', activity.id, 'userId:', activity.userId);
    return null;
  }

  const [t] = useTranslation();
  const [activateClosable, deactivateClosable] = useContext(ClosableContext);

  const handleBeforeGalleryOpen = useCallback(
    gallery => {
      activateClosable();
      gallery.on('destroy', () => {
        deactivateClosable();
      });
    },
    [activateClosable, deactivateClosable]
  );

  const userName =
    user.id === StaticUserIds.DELETED
      ? t(`common.${user.name}`, {
          context: 'title',
        })
      : user.name;

  const cardName = card ? card.name : activity.data?.card?.name || 'Cartão desconhecido';

  // Mostrar thumbnail apenas para atividades de anexos específicos
  let thumbnailAttachment = null;
  
  if (activity.type === ActivityTypes.CREATE_ATTACHMENT || activity.type === ActivityTypes.DELETE_ATTACHMENT) {
    // Para atividades de anexos, procurar o anexo específico da atividade
    const activityAttachmentId = activity.data?.attachmentId;
    if (activityAttachmentId) {
      const activityAttachment = (attachments || []).find(
        attachment => attachment.id === activityAttachmentId
      );
      
      if (activityAttachment && 
          activityAttachment.type === AttachmentTypes.FILE &&
          activityAttachment.data &&
          (activityAttachment.data.image || activityAttachment.data.video) &&
          activityAttachment.data.thumbnailUrls &&
          canPreviewFile(activityAttachment)) {
        thumbnailAttachment = activityAttachment;
      }
    }
  }

  // Não mostrar thumbnails para outros tipos de atividade
  const thumbnailAttachments = thumbnailAttachment ? [thumbnailAttachment] : [];

  let contentNode;
  switch (activity.type) {
    case ActivityTypes.CREATE_CARD: {
      const { list } = activity.data || {};
      const listName = list?.name || t(`common.${list?.type}`) || 'Lista desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userAddedCardToList"
          values={{
            user: userName,
            card: cardName,
            list: listName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' added '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
          {' to '}
          {listName}
        </Trans>
      );

      break;
    }
    case ActivityTypes.MOVE_CARD: {
      const { fromList, toList } = activity.data || {};

      const fromListName = fromList?.name || t(`common.${fromList?.type}`) || 'Lista origem desconhecida';
      const toListName = toList?.name || t(`common.${toList?.type}`) || 'Lista destino desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userMovedCardFromListToList"
          values={{
            user: userName,
            card: cardName,
            fromList: fromListName,
            toList: toListName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' moved '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
          {' from '}
          {fromListName}
          {' to '}
          {toListName}
        </Trans>
      );

      break;
    }
    case ActivityTypes.ADD_MEMBER_TO_CARD:
      contentNode =
        user.id === activity.data?.user?.id ? (
          <Trans
            i18nKey="common.userJoinedCard"
            values={{
              user: userName,
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' joined '}
            <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
              {cardName}
            </Link>
          </Trans>
        ) : (
          <Trans
            i18nKey="common.userAddedUserToCard"
            values={{
              actorUser: userName,
              addedUser: activity.data?.user?.name || 'Utilizador desconhecido',
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' added '}
            {activity.data?.user?.name || 'Utilizador desconhecido'}
            {' to '}
            <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
              {cardName}
            </Link>
          </Trans>
        );

      break;
    case ActivityTypes.REMOVE_MEMBER_FROM_CARD:
      contentNode = (
        <Trans
          i18nKey="common.userRemovedUserFromCard"
          values={{
            actorUser: userName,
            removedUser: activity.data?.user?.name || 'Utilizador desconhecido',
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' removed '}
          {activity.data?.user?.name || 'Utilizador desconhecido'}
          {' from '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    case ActivityTypes.CREATE_ATTACHMENT: {
      const { attachmentName, isVideo, thumbnailUrls, videoData } = activity.data || {};
      const displayName = attachmentName || 'Anexo desconhecido';
      const isVideoFile = isVideo === true;

      // Determinar a chave de tradução baseada no tipo de arquivo
      const translationKey = isVideoFile ? 'common.userCreatedVideoOnCard' : 'common.userCreatedAttachmentOnCard';

      contentNode = (
        <>
          <Trans
            i18nKey={translationKey}
            values={{
              user: userName,
              attachment: displayName,
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {isVideoFile ? ' adicionou vídeo ' : ' criou anexo '}
            <strong>{displayName}</strong>
            {isVideoFile ? ' ao ' : ' em '}
            <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
              {cardName}
            </Link>
          </Trans>

          {/* Mostrar thumbnail de vídeo se disponível */}
          {isVideoFile && thumbnailUrls && thumbnailUrls.outside360 && (
            <div className={styles.videoThumbnail}>
              <img
                src={thumbnailUrls.outside360}
                alt={displayName}
                className={styles.thumbnailImage}
              />
              {videoData && videoData.duration && (
                <div className={styles.videoDuration}>
                  {Math.round(videoData.duration)}s
                </div>
              )}
            </div>
          )}
        </>
      );

      break;
    }
    case ActivityTypes.DELETE_ATTACHMENT: {
      const { attachmentName, isVideo } = activity.data || {};
      const displayName = attachmentName || 'Anexo desconhecido';
      const isVideoFile = isVideo === true;

      // Determinar a chave de tradução baseada no tipo de arquivo
      const translationKey = isVideoFile ? 'common.userDeletedVideoOnCard' : 'common.userDeletedAttachmentOnCard';

      contentNode = (
        <Trans
          i18nKey={translationKey}
          values={{
            user: userName,
            attachment: displayName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {isVideoFile ? ' removeu vídeo ' : ' excluiu anexo '}
          <strong>{displayName}</strong>
          {' de '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.COMMENT_CREATE:
    case ActivityTypes.COMMENT_UPDATE:
    case ActivityTypes.COMMENT_DELETE:
    case ActivityTypes.COMMENT_REPLY: {
                  // Extrair dados com verificações de segurança
            const { commentText, cardName: activityCardName, mentions, isReply, action } = activity.data || {};

      // Usar padrão direto como outros casos
      const getActionText = (action) => {
        switch (action) {
          case 'create': return isReply ? ' respondeu a um comentário no ' : ' comentou no ';
          case 'update': return ' editou comentário no ';
          case 'delete': return ' removeu comentário no ';
          case 'reply': return ' respondeu a um comentário no ';
          default: return ' comentou no ';
        }
      };

      contentNode = (
        <>
          <span className={styles.author}>{userName}</span>
          {getActionText(action)}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {activityCardName || cardName}
          </Link>
        </>
      );

      // Adicionar texto do comentário ao contentNode
      if (action !== 'delete' && commentText) {
        contentNode = (
          <>
            {contentNode}
            <div className={styles.commentText}>
              <div className={styles.commentContent}>
                {commentText}
              </div>
              {mentions && mentions.length > 0 && (
                <div className={styles.mentions}>
                  {mentions.map((mention, index) => (
                    <span key={index} className={styles.mention}>
                      @{mention}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        );
      }

      if (action === 'delete') {
        contentNode = (
          <>
            {contentNode}
            <div className={styles.deletedComment}>
              <em>[Comentário removido]</em>
            </div>
          </>
        );
      }

      break;
    }
    case ActivityTypes.ADD_LABEL_TO_CARD: {
      const { labelName, labelColor } = activity.data || {};
      const displayName = labelName || 'Label desconhecido';

      // Converter nome da cor para classe CSS
      const getColorClass = (colorName) => {
        if (!colorName) return '';
        
        // Mapear nomes das cores para classes CSS
        const colorMap = {
          'silver-glint': 'colorSilverGlint',
          'autumn-leafs': 'colorAutumnLeafs',
          'morning-sky': 'colorMorningSky',
          'antique-blue': 'colorAntiqueBlue',
          'egg-yellow': 'colorEggYellow',
          'desert-sand': 'colorDesertSand',
          'dark-granite': 'colorDarkGranite',
          'fresh-salad': 'colorFreshSalad',
          'lagoon-blue': 'colorLagoonBlue',
          'midnight-blue': 'colorMidnightBlue',
          'light-orange': 'colorLightOrange',
          'pumpkin-orange': 'colorPumpkinOrange',
          'light-concrete': 'colorLightConcrete',
          'sunny-grass': 'colorSunnyGrass',
          'navy-blue': 'colorNavyBlue',
          'lilac-eyes': 'colorLilacEyes',
          'apricot-red': 'colorApricotRed',
          'orange-peel': 'colorOrangePeel',
          'bright-moss': 'colorBrightMoss',
          'deep-ocean': 'colorDeepOcean',
          'summer-sky': 'colorSummerSky',
          'berry-red': 'colorBerryRed',
          'light-cocoa': 'colorLightCocoa',
          'grey-stone': 'colorGreyStone',
          'tank-green': 'colorTankGreen',
          'coral-green': 'colorCoralGreen',
          'sugar-plum': 'colorSugarPlum',
          'pink-tulip': 'colorPinkTulip',
          'shady-rust': 'colorShadyRust',
          'wet-rock': 'colorWetRock',
          'wet-moss': 'colorWetMoss',
          'turquoise-sea': 'colorTurquoiseSea',
          'lavender-fields': 'colorLavenderFields',
          'piggy-red': 'colorPiggyRed',
          'light-mud': 'colorLightMud',
          'gun-metal': 'colorGunMetal',
          'modern-green': 'colorModernGreen',
          'french-coast': 'colorFrenchCoast',
          'sweet-lilac': 'colorSweetLilac',
          'red-burgundy': 'colorRedBurgundy',
          'pirate-gold': 'colorPirateGold'
        };
        
        return colorMap[colorName] || '';
      };

      const colorClass = getColorClass(labelColor);

      contentNode = (
        <Trans
          i18nKey="common.userAddedLabelToCard"
          values={{
            user: userName,
            label: displayName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' adicionou label '}
          <strong className={colorClass ? styles[colorClass] : ''}>
            {displayName}
          </strong>
          {' ao cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.REMOVE_LABEL_FROM_CARD: {
      const { labelName, labelColor } = activity.data || {};
      const displayName = labelName || 'Label desconhecido';

      // Converter nome da cor para classe CSS
      const getColorClass = (colorName) => {
        if (!colorName) return '';
        
        // Mapear nomes das cores para classes CSS
        const colorMap = {
          'silver-glint': 'colorSilverGlint',
          'autumn-leafs': 'colorAutumnLeafs',
          'morning-sky': 'colorMorningSky',
          'antique-blue': 'colorAntiqueBlue',
          'egg-yellow': 'colorEggYellow',
          'desert-sand': 'colorDesertSand',
          'dark-granite': 'colorDarkGranite',
          'fresh-salad': 'colorFreshSalad',
          'lagoon-blue': 'colorLagoonBlue',
          'midnight-blue': 'colorMidnightBlue',
          'light-orange': 'colorLightOrange',
          'pumpkin-orange': 'colorPumpkinOrange',
          'light-concrete': 'colorLightConcrete',
          'sunny-grass': 'colorSunnyGrass',
          'navy-blue': 'colorNavyBlue',
          'lilac-eyes': 'colorLilacEyes',
          'apricot-red': 'colorApricotRed',
          'orange-peel': 'colorOrangePeel',
          'bright-moss': 'colorBrightMoss',
          'deep-ocean': 'colorDeepOcean',
          'summer-sky': 'colorSummerSky',
          'berry-red': 'colorBerryRed',
          'light-cocoa': 'colorLightCocoa',
          'grey-stone': 'colorGreyStone',
          'tank-green': 'colorTankGreen',
          'coral-green': 'colorCoralGreen',
          'sugar-plum': 'colorSugarPlum',
          'pink-tulip': 'colorPinkTulip',
          'shady-rust': 'colorShadyRust',
          'wet-rock': 'colorWetRock',
          'wet-moss': 'colorWetMoss',
          'turquoise-sea': 'colorTurquoiseSea',
          'lavender-fields': 'colorLavenderFields',
          'piggy-red': 'colorPiggyRed',
          'light-mud': 'colorLightMud',
          'gun-metal': 'colorGunMetal',
          'modern-green': 'colorModernGreen',
          'french-coast': 'colorFrenchCoast',
          'sweet-lilac': 'colorSweetLilac',
          'red-burgundy': 'colorRedBurgundy',
          'pirate-gold': 'colorPirateGold'
        };
        
        return colorMap[colorName] || '';
      };

      const colorClass = getColorClass(labelColor);

      contentNode = (
        <Trans
          i18nKey="common.userRemovedLabelFromCard"
          values={{
            user: userName,
            label: displayName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' removeu label '}
          <strong className={colorClass ? styles[colorClass] : ''}>
            {displayName}
          </strong>
          {' do cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.CREATE_TASK: {
      const { task } = activity.data || {};
      const taskName = task?.name || 'Tarefa desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userCreatedTaskOnCard"
          values={{
            user: userName,
            task: taskName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' criou tarefa '}
          <strong>{taskName}</strong>
          {' no cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.DELETE_TASK: {
      const { task } = activity.data || {};
      const taskName = task?.name || 'Tarefa desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userDeletedTaskOnCard"
          values={{
            user: userName,
            task: taskName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' excluiu tarefa '}
          <strong>{taskName}</strong>
          {' do cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.COMPLETE_TASK: {
      const { task } = activity.data || {};
      const taskName = task?.name || 'Tarefa desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userCompletedTaskOnCard"
          values={{
            user: userName,
            task: taskName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' concluiu tarefa '}
          <strong>{taskName}</strong>
          {' no cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.UNCOMPLETE_TASK: {
      const { task } = activity.data || {};
      const taskName = task?.name || 'Tarefa desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userUncompletedTaskOnCard"
          values={{
            user: userName,
            task: taskName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' marcou como não concluída a tarefa '}
          <strong>{taskName}</strong>
          {' no cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.CREATE_TASK_LIST: {
      const { taskList } = activity.data || {};
      const taskListName = taskList?.name || 'Lista de tarefas desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userCreatedTaskListOnCard"
          values={{
            user: userName,
            taskList: taskListName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' criou lista de tarefas '}
          <strong>{taskListName}</strong>
          {' no cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.DELETE_TASK_LIST: {
      const { taskList } = activity.data || {};
      const taskListName = taskList?.name || 'Lista de tarefas desconhecida';

      contentNode = (
        <Trans
          i18nKey="common.userDeletedTaskListOnCard"
          values={{
            user: userName,
            taskList: taskListName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' excluiu lista de tarefas '}
          <strong>{taskListName}</strong>
          {' do cartão '}
          <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.SET_DUE_DATE: {
      const { oldDueDate, newDueDate } = activity.data || {};
      
      // Formatar datas
      const formatDate = (date) => {
        if (!date) return null;
        try {
          return new Date(date).toLocaleDateString('pt-PT');
        } catch (error) {
          return 'Data inválida';
        }
      };

      const oldDateFormatted = formatDate(oldDueDate);
      const newDateFormatted = formatDate(newDueDate);

      // Determinar o tipo de ação baseado nas datas
      if (!oldDueDate && newDueDate) {
        // Data de vencimento adicionada
        contentNode = (
          <Trans
            i18nKey="common.userSetDueDateOnCard"
            values={{
              user: userName,
              date: newDateFormatted,
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' definiu data limite '}
            <strong>{newDateFormatted}</strong>
            {' para o cartão '}
            <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
              {cardName}
            </Link>
          </Trans>
        );
      } else if (oldDueDate && !newDueDate) {
        // Data de vencimento removida
        contentNode = (
          <Trans
            i18nKey="common.userRemovedDueDateFromCard"
            values={{
              user: userName,
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' removeu data limite do cartão '}
            <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
              {cardName}
            </Link>
          </Trans>
        );
      } else if (oldDueDate && newDueDate) {
        // Data de vencimento alterada
        contentNode = (
          <Trans
            i18nKey="common.userChangedDueDateOfCard"
            values={{
              user: userName,
              oldDate: oldDateFormatted,
              newDate: newDateFormatted,
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' alterou data limite de '}
            <strong>{oldDateFormatted}</strong>
            {' para '}
            <strong>{newDateFormatted}</strong>
            {' no cartão '}
            <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
              {cardName}
            </Link>
          </Trans>
        );
      } else {
        // Fallback para caso inesperado
        contentNode = (
          <Trans
            i18nKey="common.userSetDueDateOnCard"
            values={{
              user: userName,
              date: 'Data desconhecida',
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' definiu data limite '}
            <strong>Data desconhecida</strong>
            {' para o cartão '}
            <Link to={Paths.CARDS.replace(':id', activity.cardId)}>
              {cardName}
            </Link>
          </Trans>
        );
      }

      break;
    }
    default:
      contentNode = (
        <Trans
          i18nKey="common.activityLogMessage"
          values={{
            user: userName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
        </Trans>
      );
  }

  return (
    <>
      <Comment className={styles.commentActivity}>
        <span className={styles.user}>
          <UserAvatar id={activity.userId} />
        </span>
        <div className={styles.content}>
          <div>{contentNode}</div>
          {thumbnailAttachments.length > 0 && (
            <div className={styles.thumbnails}>
              <Gallery
                withCaption
                withDownloadButton
                options={{
                  wheelToZoom: true,
                  showHideAnimationType: 'none',
                  closeTitle: '',
                  zoomTitle: '',
                  arrowPrevTitle: '',
                  arrowNextTitle: '',
                  errorMsg: '',
                }}
                onBeforeOpen={handleBeforeGalleryOpen}
              >
                {thumbnailAttachments.map(attachment => (
                  <GalleryItem
                    key={attachment.id}
                    src={attachment.data.url}
                    width={attachment.data.image ? attachment.data.image.width : undefined}
                    height={attachment.data.image ? attachment.data.image.height : undefined}
                    original={attachment.data.url}
                    caption={attachment.name}
                  >
                    {({ ref, open }) => (
                      <img
                        ref={ref}
                        src={
                          attachment.data.thumbnailUrls.outside720 ||
                          attachment.data.thumbnailUrls.outside360
                        }
                        alt={attachment.name}
                        className={styles.thumbnail}
                        onClick={open}
                      />
                    )}
                  </GalleryItem>
                ))}
              </Gallery>
            </div>
          )}
          <span className={styles.date}>
            <TimeAgo date={activity.createdAt} />
          </span>
        </div>
      </Comment>
    </>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
};

export default Item;
