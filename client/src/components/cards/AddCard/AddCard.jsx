/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { Mention, MentionsInput } from 'react-mentions';
import { Button, Form, Icon, TextArea } from 'semantic-ui-react';
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
import LabelChip from '../../labels/LabelChip';

import styles from './AddCard.module.scss';

const DEFAULT_DATA = {
  name: '',
};

const AddCard = React.memo(
  ({ isOpened, className, onCreate, onCreateWithAttachment, onClose }) => {
    const {
      defaultCardType: defaultType,
      limitCardTypesToDefaultOne: limitTypesToDefaultOne,
    } = useSelector(selectors.selectCurrentBoard);

    // Dados Redux para mentions
    const boardMemberships = useSelector(selectors.selectMembershipsForCurrentBoard);
    const labels = useSelector(selectors.selectLabelsForCurrentBoard);

    const [t] = useTranslation();
    const prevDefaultType = usePrevious(defaultType);

    const [data, handleFieldChange, setData] = useForm(() => ({
      ...DEFAULT_DATA,
      type: defaultType,
    }));

    const [focusNameFieldState, focusNameField] = useToggle();
    const [isClosableActiveRef, activateClosable, deactivateClosable] =
      useClosable();

    // Estados para drag & drop
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Estados para mentions (utilizadores e etiquetas a adicionar)
    const [usersToAdd, setUsersToAdd] = useState([]);
    const [labelsToAdd, setLabelsToAdd] = useState([]);

    // Preparação de dados para mentions usando useMemo para otimização
    const usersData = useMemo(() => {
      if (!boardMemberships?.length) return [];
      return boardMemberships.map(({ user }) => ({
        id: user.id,
        display: user.username || user.name, // Username primeiro (consistência com Planka)
      }));
    }, [boardMemberships]);

    const labelsData = useMemo(() => {
      if (!labels?.length) {
        return [{
          id: 'no-labels',
          display: t('common.noLabelsCreatedYet'),
          color: 'gray',
          isPlaceholder: true,
          disabled: true
        }];
      }
      return labels.map(label => ({
        id: label.id,
        display: label.name,
        color: label.color,
        isPlaceholder: false,
        disabled: false
      }));
    }, [labels, t]);


    const nameFieldRef = useRef(null);
    const nameMentionsRef = useRef(null);
    const nameInputRef = useRef(null);
    const [submitButtonRef, handleSubmitButtonRef] = useNestedRef();
    const [selectTypeButtonRef, handleSelectTypeButtonRef] = useNestedRef();

    // Callbacks para mentions
    const handleUserAdd = useCallback((id, display, startPos, endPos) => {
      // Adicionar utilizador ao array (evitar duplicatas)
      setUsersToAdd(prev => prev.includes(id) ? prev : [...prev, id]);
      
      // Limpar texto da menção do campo
      const currentValue = data.name || '';
      const beforeMention = currentValue.substring(0, startPos);
      const afterMention = currentValue.substring(endPos);
      const newValue = beforeMention + afterMention;
      
      // Atualizar campo com texto limpo
      setData(prevData => ({
        ...prevData,
        name: newValue.trim()
      }));
      
    }, [data.name, setData]);

    // Força remoção de limitações de altura no dropdown (apenas quando necessário)
    useEffect(() => {
      if (!isOpened) return; // Só executar quando o AddCard está aberto

      const forceDropdownHeight = () => {
        const dropdowns = document.querySelectorAll('.mentions-input__suggestions');
        
        dropdowns.forEach((dropdown) => {
          // Verificar se já foi processado
          if (dropdown.dataset.heightFixed === 'true') return;
          
          // Estilos para garantir visibilidade com scroll
          const styles = {
            maxHeight: '400px',
            height: 'auto',
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'fixed',
            zIndex: '100020',
            minWidth: '300px',
            maxWidth: '400px',
          };

          // Aplicar estilos
          Object.entries(styles).forEach(([property, value]) => {
            dropdown.style.setProperty(property, value, 'important');
          });

          // Marcar como processado
          dropdown.dataset.heightFixed = 'true';
        });
      };

      // Observer apenas quando componente está aberto
      const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1 && 
                  node.classList?.contains('mentions-input__suggestions')) {
                shouldCheck = true;
              }
            });
          }
        });
        
        if (shouldCheck) {
          setTimeout(forceDropdownHeight, 0);
        }
      });

      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });

      return () => observer.disconnect();
    }, [isOpened]);

    
    const handleLabelAdd = useCallback((id, display, startPos, endPos) => {
      // Se é um placeholder (sem labels criadas), limpar o # mas não adicionar label
      if (id === 'no-labels') {
        // Limpar o # do campo
        const currentValue = data.name || '';
        const beforeMention = currentValue.substring(0, startPos);
        const afterMention = currentValue.substring(endPos);
        const newValue = beforeMention + afterMention;
        
        setData(prevData => ({
          ...prevData,
          name: newValue.trim()
        }));
        
        // Não adicionar label - apenas limpar texto
        return;
      }
      
      // Adicionar label ao array (evitar duplicatas)
      setLabelsToAdd(prev => prev.includes(id) ? prev : [...prev, id]);
      
      // Limpar texto da menção do campo
      const currentValue = data.name || '';
      const beforeMention = currentValue.substring(0, startPos);
      const afterMention = currentValue.substring(endPos);
      const newValue = beforeMention + afterMention;
      
      // Atualizar campo com texto limpo
      setData(prevData => ({
        ...prevData,
        name: newValue.trim()
      }));
      
    }, [data.name, setData, labelsToAdd]);

    // Funções de renderização de sugestões
    const suggestionRenderer = useCallback(
      (entry, search, highlightedDisplay) => (
        <div className={styles.suggestion}>
          <UserAvatar id={entry.id} size="tiny" />
          {highlightedDisplay}
        </div>
      ),
      []
    );

    const renderLabelSuggestion = useCallback(
      (entry, search, highlightedDisplay) => {
        // Se é um placeholder (sem labels criadas), mostrar mensagem especial
        if (entry.isPlaceholder) {
          return (
            <div 
              className={classNames(styles.suggestion, styles.suggestionPlaceholder)}
              onMouseDown={(e) => {
                // Prevenir seleção do placeholder
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                // Prevenir seleção do placeholder
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Icon name="info circle" size="small" />
              <span className={styles.placeholderText}>
                {entry.display}
              </span>
            </div>
          );
        }
        
        // Comportamento normal para labels reais
        return (
          <div className={styles.suggestion}>
            <LabelChip id={entry.id} size="tiny" />
          </div>
        );
      },
      []
    );

    const submit = useCallback(
      autoOpen => {
        const cleanData = {
          ...data,
          name: data.name.trim(),
          type: defaultType, // Sempre usar o tipo padrão do board para consistência
        };

        if (!cleanData.name) {
          if (nameInputRef.current) {
            nameInputRef.current.focus();
          }
          return;
        }

        onCreate(cleanData, autoOpen, usersToAdd, labelsToAdd);

        // Limpar estado do formulário e arrays de mentions
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
      [setData]
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
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, [deactivateClosable]);

    const handleAwayClick = useCallback(() => {
      if (!isOpened || isClosableActiveRef.current) {
        return;
      }

      onClose();
    }, [isOpened, onClose, isClosableActiveRef]);

    const handleClickAwayCancel = useCallback(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, []);

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

        const files = Array.from(e.dataTransfer.files);
        const processedFiles = processSupportedFiles(files);

        if (processedFiles.length === 0) {
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

            // Usar a action createCardWithAttachment para criar card com anexo
            if (onCreateWithAttachment) {
              onCreateWithAttachment(cardData, fileData.file);
            } else {
              onCreate(cardData, false);
            }
          }
        } catch (error) {
          console.error('❌ Erro ao processar arquivos:', error);
        } finally {
          setIsProcessing(false);
        }
      },
      [data.name, defaultType, onCreate, onCreateWithAttachment]
    );

    useEffect(() => {
      if (isOpened && nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, [isOpened]);

    useEffect(() => {
      if (!isOpened && defaultType !== prevDefaultType) {
        setData(prevData => ({
          ...prevData,
          type: defaultType,
        }));
      }
    }, [isOpened, defaultType, prevDefaultType, setData]);

    useDidUpdate(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
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
          {/* 🏷️ LABELS PREVIEW - TOPO ESQUERDA */}
          {labelsToAdd.length > 0 && (
            <div className={styles.previewLabels}>
              {labelsToAdd.map((labelId, index) => (
                  <span 
                    key={labelId} 
                    className={classNames(styles.previewAttachment, styles.previewAttachmentLeft)}
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => {
                      setLabelsToAdd(prev => prev.filter(id => id !== labelId));
                    }}
                    title="Clique para remover"
                  >
                    <LabelChip id={labelId} size="tiny" />
                  </span>
                ))}
            </div>
          )}

          {/* 👥 USERS PREVIEW - TOPO DIREITA */}
          {usersToAdd.length > 0 && (
            <div className={classNames(styles.previewAttachments, styles.previewAttachmentsRight)}>
              {usersToAdd.map((userId, index) => (
                  <span 
                    key={userId} 
                    className={classNames(styles.previewAttachment, styles.previewAttachmentRight)}
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => {
                      setUsersToAdd(prev => prev.filter(id => id !== userId));
                    }}
                    title="Clique para remover"
                  >
                    <UserAvatar id={userId} size="small" />
                  </span>
                ))}
            </div>
          )}

          <div {...clickAwayProps} ref={nameFieldRef}>
            <MentionsInput
              allowSpaceInQuery
              allowSuggestionsAboveCursor
              forceSuggestionsAboveCursor={false}
              suggestionsPortalHost={document.body}
              ref={nameMentionsRef}
              inputRef={nameInputRef}
              value={data.name}
              placeholder={
                isDragOver
                  ? t('common.dropFilesHere')
                  : t('common.enterCardTitle')
              }
              maxLength={1024}
              className={classNames(
                "mentions-input", // ← OBRIGATÓRIO para CSS global funcionar
                styles.field,
                isProcessing && styles.fieldProcessing
              )}
              style={{
                control: {
                  minHeight: '32px', // Aumentado de 24px para 32px
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  color: '#f3f4f6',
                  fontSize: '15px',
                  fontWeight: '600',
                  lineHeight: '1.6', // Aumentado para melhor espaçamento
                  padding: '4px 0', // Adicionado padding vertical
                },
                highlighter: {
                  background: 'transparent',
                  border: 'none',
                  color: '#f3f4f6',
                  fontSize: '15px',
                  fontWeight: '600',
                  lineHeight: '1.6', // Aumentado para melhor espaçamento
                  minHeight: '32px', // Aumentado de 24px para 32px
                  padding: '4px 0', // Adicionado padding vertical
                },
                input: {
                  background: 'transparent',
                  border: 'none',
                  color: '#f3f4f6',
                  fontSize: '15px',
                  fontWeight: '600',
                  lineHeight: '1.6', // Aumentado para melhor espaçamento
                  minHeight: '28px', // Altura mínima para o input
                  outline: 'none',
                  padding: '4px 0', // Adicionado padding vertical
                },
                suggestions: {
                  maxHeight: '400px',
                  height: 'auto',
                  overflowY: 'auto',
                },
              }}
              onKeyDown={handleFieldKeyDown}
              onChange={(event, newValue, newPlainTextValue) => {
                setData(prevData => ({
                  ...prevData,
                  name: newPlainTextValue
                }));
              }}
              disabled={isProcessing}
            >
              <Mention
                trigger="@"
                appendSpaceOnAdd
                data={usersData}
                displayTransform={(_, display) => `@${display}`}
                renderSuggestion={suggestionRenderer}
                onAdd={handleUserAdd}
                className={styles.mention}
              />
              <Mention
                trigger="#"
                appendSpaceOnAdd
                data={labelsData}
                displayTransform={(_, display) => `#${display}`}
                renderSuggestion={renderLabelSuggestion}
                onAdd={handleLabelAdd}
                className={styles.mention}
              />
            </MentionsInput>
          </div>
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
  onCreate: PropTypes.func.isRequired,
  onCreateWithAttachment: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

AddCard.defaultProps = {
  isOpened: true,
  className: undefined,
};

export default AddCard;
