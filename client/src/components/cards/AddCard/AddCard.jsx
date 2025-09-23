/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Mention, MentionsInput } from 'react-mentions';
import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import { Button, Form, Icon } from 'semantic-ui-react';
import {
  useClickAwayListener,
  useDidUpdate,
  usePrevious,
  useToggle,
} from '../../../lib/hooks';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import { useClosable, useForm, useNestedRef } from '../../../hooks';
import { isModifierKeyPressed } from '../../../utils/event-helpers';
import { CardTypeIcons } from '../../../constants/Icons';
import { processSupportedFiles } from '../../../utils/file-helpers';
import SelectCardTypeStep from '../SelectCardTypeStep';
import UserAvatar from '../../users/UserAvatar';
import LabelChip from '../../labels/LabelChip/LabelChip';
import globalStyles from '../../../styles.module.scss';

import styles from './AddCard.module.scss';
import mentionsInputStyle from './mentions-input-style';

const DEFAULT_DATA = {
  name: '',
};

const AddCard = React.memo(
  ({ isOpened, className, listId, onCreate, onCreateWithAttachment, onClose }) => {
    const {
      defaultCardType: defaultType,
      limitCardTypesToDefaultOne: limitTypesToDefaultOne,
    } = useSelector(selectors.selectCurrentBoard);

    const [t] = useTranslation();
    const prevDefaultType = usePrevious(defaultType);

    const [data, setData] = useState(() => ({
      ...DEFAULT_DATA,
      type: defaultType,
    }));

    const [usersToAdd, setUsersToAdd] = useState([]);
    const [labelsToAdd, setLabelsToAdd] = useState([]);

    const boardMemberships = useSelector(
      selectors.selectMembershipsForCurrentBoard,
    );
    const labels = useSelector(selectors.selectLabelsForCurrentBoard);

    console.log('AddCard users:', boardMemberships);
    console.log('AddCard labels:', labels);

    const [focusNameFieldState, focusNameField] = useToggle();
    const [isClosableActiveRef, activateClosable, deactivateClosable] =
      useClosable();

    // Estados para drag & drop
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const nameFieldRef = useRef(null);
    const [submitButtonRef, handleSubmitButtonRef] = useNestedRef();
    const [selectTypeButtonRef, handleSelectTypeButtonRef] = useNestedRef();

    const submit = useCallback(
      autoOpen => {
        const cleanData = {
          ...data,
          name: data.name.trim(),
        };

        if (!cleanData.name) {
          nameFieldRef.current.select();
          return;
        }

        console.log('Creating card with users:', usersToAdd, 'and labels:', labelsToAdd);
        onCreate({ ...cleanData, userIds: usersToAdd, labelIds: labelsToAdd }, autoOpen);

        setData({
          ...DEFAULT_DATA,
          type: defaultType,
        });
        setUsersToAdd([]);
        setLabelsToAdd([]);

        if (autoOpen) {
          onClose();
        } else {
          focusNameField();
        }
      },
      [
        onCreate,
        onClose,
        defaultType,
        data,
        setData,
        focusNameField,
        nameFieldRef,
        usersToAdd,
        labelsToAdd,
      ]
    );

    const handleSubmit = useCallback(() => {
      submit();
    }, [submit]);

    const handleTypeSelect = useCallback(
      type => {
        setData(prevData => ({
          ...prevData,
          type,
        }));
      },
      [setData],
    );

    const handleNameChange = useCallback(
      (_, newValue) => {
        setData(prevData => ({
          ...prevData,
          name: newValue,
        }));
      },
      [setData],
    );

    const handleUserAdd = useCallback((id, display) => {
      console.log('Adding user to card (local state):', id);
      setUsersToAdd(prevUsers => [...prevUsers, id]);
      setData(prevData => ({
        ...prevData,
        name: prevData.name.replace(`@${display}`, '').trim(),
      }));
    }, [setData]);

    const handleLabelAdd = useCallback((id, display) => {
      console.log('Adding label to card (local state):', id);
      setLabelsToAdd(prevLabels => [...prevLabels, id]);
      setData(prevData => ({
        ...prevData,
        name: prevData.name.replace(`#${display}`, '').trim(),
      }));
    }, [setData]);

    const userSuggestionRenderer = useCallback(
      (entry, search, highlightedDisplay) => (
        <div className={styles.suggestion}>
          <UserAvatar id={entry.id} size="tiny" />
          <span>{highlightedDisplay}</span>
        </div>
      ),
      [],
    );

    const labelSuggestionRenderer = useCallback(
      (entry, search, highlightedDisplay) => (
        <div className={styles.suggestion}>
          <span
            className={classNames(
              styles.labelSuggestion,
              globalStyles[`background${upperFirst(camelCase(entry.color))}`],
            )}
          />
          {highlightedDisplay}
        </div>
      ),
      [],
    );

    const handleFieldKeyDown = useCallback(
      event => {
        switch (event.key) {
          case 'Enter':
            event.preventDefault();
            submit(isModifierKeyPressed(event));

            break;
          case 'Escape':
            onClose();

            break;
          default:
        }
      },
      [onClose, submit]
    );

    const handleSelectTypeClose = useCallback(() => {
      deactivateClosable();
      nameFieldRef.current.focus();
    }, [deactivateClosable, nameFieldRef]);

    const handleAwayClick = useCallback(() => {
      if (!isOpened || isClosableActiveRef.current) {
        return;
      }

      onClose();
    }, [isOpened, onClose, isClosableActiveRef]);

    const handleClickAwayCancel = useCallback(() => {
      nameFieldRef.current.focus();
    }, [nameFieldRef]);

    const clickAwayProps = useClickAwayListener(
      [nameFieldRef, submitButtonRef, selectTypeButtonRef],
      handleAwayClick,
      handleClickAwayCancel
    );

    // Handlers para drag & drop
    const handleDragOver = useCallback(e => {
      e.preventDefault();
      e.stopPropagation();

      // Verificar se há arquivos sendo arrastados
      if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        setIsDragOver(true);
      }
    }, []);

    const handleDragLeave = useCallback(e => {
      e.preventDefault();
      e.stopPropagation();

      // Só remove o estado de drag se realmente sair da área
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setIsDragOver(false);
      }
    }, []);

    const handleDrop = useCallback(
      async e => {
        e.preventDefault();
        setIsDragOver(false);

        console.log('📁 Drag & Drop ativado!');
        const files = Array.from(e.dataTransfer.files);
        console.log('📁 Arquivos arrastados:', files);

        const processedFiles = processSupportedFiles(files);
        console.log('✅ Arquivos processados:', processedFiles);

        if (processedFiles.length === 0) {
          console.log('❌ Nenhum arquivo válido encontrado');
          return;
        }

        setIsProcessing(true);

        try {
          for (const fileData of processedFiles) {
            const cardName = data.name.trim() || fileData.name;
            const cardData = {
              name: cardName,
              type: defaultType, // Sempre usar o tipo padrão do board para consistência
            };

            console.log('🎴 Criando card:', cardData);
            console.log(
              '📄 Tipo de arquivo:',
              fileData.isImage ? 'Imagem (capa)' : 'Anexo'
            );
            console.log('📄 Arquivo:', fileData.file);
            console.log(
              '📄 Nome do arquivo:',
              fileData.file ? fileData.file.name : 'undefined'
            );
            console.log(
              '📄 Tamanho do arquivo:',
              fileData.file ? fileData.file.size : 'undefined'
            );

            // Usar a action createCardWithAttachment para criar card com anexo
            if (onCreateWithAttachment) {
              console.log('📎 Usando createCardWithAttachment');
              onCreateWithAttachment(cardData, fileData.file);
            } else {
              console.log('📝 Usando createCard normal');
              onCreate(cardData, false);
            }
          }
        } catch (error) {
          console.error('❌ Erro ao processar arquivos:', error);
        } finally {
          setIsProcessing(false);
          console.log('✅ Processamento finalizado');
        }
      },
      [data.name, defaultType, onCreate, onCreateWithAttachment]
    );

    useEffect(() => {
      if (isOpened) {
        nameFieldRef.current.focus();
      }
    }, [isOpened, nameFieldRef]);

    useEffect(() => {
      if (!isOpened && defaultType !== prevDefaultType) {
        setData(prevData => ({
          ...prevData,
          type: defaultType,
        }));
      }
    }, [isOpened, defaultType, prevDefaultType, setData]);

    useDidUpdate(() => {
      nameFieldRef.current.focus();
    }, [focusNameFieldState]);

    const SelectCardTypePopup = usePopup(SelectCardTypeStep, {
      onOpen: activateClosable,
      onClose: handleSelectTypeClose,
    });

    return (
      <Form
        className={classNames(className, !isOpened && styles.wrapperClosed)}
        onSubmit={handleSubmit}
      >
                <div
          className={classNames(
            styles.fieldWrapper,
            isDragOver && styles.fieldWrapperDragOver,
            isProcessing && styles.fieldWrapperProcessing
          )}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <MentionsInput
            {...clickAwayProps}
            inputRef={nameFieldRef}
            value={data.name}
            placeholder={
              isDragOver
                ? t('common.dropFilesHere')
                : t('common.enterCardTitle')
            }
            maxLength={1024}
            rows={3}
            spellCheck={false}
            className={classNames(
              isProcessing && styles.fieldProcessing,
            )}
            style={mentionsInputStyle}
            onKeyDown={handleFieldKeyDown}
            onChange={handleNameChange}
            disabled={isProcessing}
            allowSpaceInQuery
            allowSuggestionsAboveCursor
          >
            <Mention
              trigger="@"
              markup="@__display__"
              data={boardMemberships.map(({ user }) => ({
                id: user.id,
                display: user.username || user.name,
                avatarUrl: user.avatarUrl,
              }))}
              onAdd={handleUserAdd}
              renderSuggestion={userSuggestionRenderer}
              className={styles.mention}
            />
            <Mention
              trigger="#"
              markup="#__display__"
              data={labels.map(label => ({
                id: label.id,
                display: label.name,
                color: label.color,
              }))}
              onAdd={handleLabelAdd}
              renderSuggestion={labelSuggestionRenderer}
              className={styles.mention}
            />
          </MentionsInput>
          {usersToAdd.length > 0 && (
            <span className={styles.selectedUsers}>
              {usersToAdd.map(userId => (
                <span
                  key={userId}
                  className={styles.selectedUserAvatar}
                >
                  <UserAvatar id={userId} size="small" />
                </span>
              ))}
            </span>
          )}
          {labelsToAdd.length > 0 && (
            <div className={styles.selectedLabels}>
              {labelsToAdd.map(labelId => (
                <span
                  key={labelId}
                  className={styles.selectedLabel}
                >
                  <LabelChip id={labelId} size="tiny" />
                </span>
              ))}
            </div>
          )}
          {isDragOver && (
            <div className={styles.dragOverlay}>
              <Icon name="upload" size="large" />
              <span>{t('common.dropFilesHere')}</span>
            </div>
          )}
          {isProcessing && (
            <div className={styles.processingOverlay}>
              <Icon name="spinner" loading size="large" />
              <span>{t('common.processingFiles')}</span>
            </div>
          )}
        </div>
        <div className={styles.controls}>
          <Button
            {...clickAwayProps}
            positive
            ref={handleSubmitButtonRef}
            content={t('action.addCard')}
            className={styles.button}
            disabled={isProcessing}
          />
          <SelectCardTypePopup
            defaultValue={data.type}
            onSelect={handleTypeSelect}
          >
            <Button
              {...clickAwayProps}
              ref={handleSelectTypeButtonRef}
              type="button"
              disabled={limitTypesToDefaultOne || isProcessing}
              className={classNames(styles.button, styles.selectTypeButton)}
            >
              <Icon
                name={CardTypeIcons[data.type]}
                className={styles.selectTypeButtonIcon}
              />
              {t(`common.${data.type}`)}
            </Button>
          </SelectCardTypePopup>
        </div>
      </Form>
    );
  }
);

AddCard.propTypes = {
  isOpened: PropTypes.bool,
  className: PropTypes.string,
  listId: PropTypes.string.isRequired,
  onCreate: PropTypes.func.isRequired,
  onCreateWithAttachment: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

AddCard.defaultProps = {
  isOpened: true,
  className: undefined,
};

export default AddCard;
