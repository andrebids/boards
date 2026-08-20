/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import {
  useMarkdownEditor,
  wysiwygToolbarConfigs,
  MarkdownEditorView,
} from "@gravity-ui/markdown-editor";
import { ThemeProvider } from "@gravity-ui/uikit";
/* eslint-disable import/no-unresolved */
import { full as toolbarsPreset } from "@gravity-ui/markdown-editor/_/modules/toolbars/presets";
import { ActionName } from "@gravity-ui/markdown-editor/_/bundle/config/action-names";
import { ToolbarDataType } from "@gravity-ui/markdown-editor/_/toolbar/types";
/* eslint-enable import/no-unresolved */

import { EditorModes } from "../../../constants/Enums";
import { createMentionMarkupLanguageData } from "./mention-utils";
import createUserMentionExtension from "./mentions";
import EmojiToolbarButton from "./EmojiToolbarButton";

import styles from "./MarkdownEditor.module.scss";

const EMPTY_MENTION_USERS = [];
const CUSTOM_EMOJI_ACTION = "commentEmoji";

const removedActionNamesSet = new Set([
  ActionName.checkbox,
  ActionName.file,
  ActionName.filePopup,
  ActionName.tabs,
]);

removedActionNamesSet.forEach((actionName) => {
  delete toolbarsPreset.items[actionName];

  Object.entries(toolbarsPreset.orders).forEach(([orderName, order]) => {
    order.forEach((actions, actionsIndex) => {
      toolbarsPreset.orders[orderName][actionsIndex] = actions.filter(
        (action) => action.id || action !== actionName,
      );
    });
  });
});

const commandMenuActions = wysiwygToolbarConfigs.wCommandMenuConfig.filter(
  (action) => !removedActionNamesSet.has(action.id),
);

const cloneToolbarOrderItem = (item) =>
  typeof item === "string"
    ? item
    : {
        ...item,
        ...(item.items && { items: [...item.items] }),
      };

const createToolbarsPreset = (withEmoji, onEmojiSelect) => {
  if (!withEmoji) {
    return toolbarsPreset;
  }

  const orders = Object.fromEntries(
    Object.entries(toolbarsPreset.orders).map(([name, order]) => [
      name,
      order.map((group) => group.map(cloneToolbarOrderItem)),
    ]),
  );

  orders.wysiwygHidden = orders.wysiwygHidden.map((group) =>
    group.filter((item) => item !== ActionName.emoji),
  );
  orders.wysiwygMain[1].unshift(CUSTOM_EMOJI_ACTION);

  return {
    ...toolbarsPreset,
    items: {
      ...toolbarsPreset.items,
      [CUSTOM_EMOJI_ACTION]: {
        view: {
          type: ToolbarDataType.ReactComponent,
        },
        wysiwyg: {
          width: 28,
          component: () => <EmojiToolbarButton onEmojiSelect={onEmojiSelect} />,
        },
      },
    },
    orders,
  };
};

export const fileToBase64Data = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

const fileUploadHandler = async (file) => {
  const base64Data = await fileToBase64Data(file);
  return { url: base64Data };
};

const MarkdownEditor = React.forwardRef(
  (
    {
      defaultValue,
      defaultMode,
      mentionUsers,
      withEmoji,
      fileUploadHandler: customFileUploadHandler,
      isError,
      onChange,
      onSubmit,
      onCancel,
      onModeChange,
      ...props
    },
    ref,
  ) => {
    const wrapperRef = useRef(null);
    const mentionExtension = useMemo(
      () => createUserMentionExtension(mentionUsers),
      [mentionUsers],
    );
    const mentionMarkupLanguageData = useMemo(
      () => createMentionMarkupLanguageData(mentionUsers),
      [mentionUsers],
    );
    const editor = useMarkdownEditor({
      md: {
        breaks: true,
        linkify: true,
      },
      handlers: {
        uploadFile: customFileUploadHandler,
      },
      markupConfig: {
        autocompletion: {
          activateOnTyping: true,
        },
        languageData: [mentionMarkupLanguageData],
      },
      wysiwygConfig: {
        extensions: mentionExtension,
        extensionOptions: {
          commandMenu: {
            actions: commandMenuActions,
          },
        },
      },
      initial: {
        markup: defaultValue,
        mode: defaultMode,
      },
    });

    const handleEmojiSelect = useCallback(
      (emoji) => {
        const { view } = editor.currentEditor;
        view.dispatch(view.state.tr.insertText(emoji).scrollIntoView());
        editor.focus();
      },
      [editor],
    );
    const configuredToolbarsPreset = useMemo(
      () => createToolbarsPreset(withEmoji, handleEmojiSelect),
      [handleEmojiSelect, withEmoji],
    );

    useImperativeHandle(
      ref,
      () => ({
        insertText: (text) => {
          const { currentEditor } = editor;

          if (editor.currentMode === EditorModes.WYSIWYG) {
            const { view } = currentEditor;
            view.dispatch(view.state.tr.insertText(text).scrollIntoView());
          } else {
            const { codemirror } = currentEditor;
            codemirror.dispatch(codemirror.state.replaceSelection(text));
          }

          editor.focus();
        },
      }),
      [editor],
    );

    useEffect(() => {
      const handleChange = () => {
        onChange(editor.getValue());
      };

      const handleSubmit = () => {
        onSubmit();
      };

      const handleCancel = () => {
        onCancel();
      };

      const handleModeChange = ({ mode: nextMode }) => {
        if (onModeChange) {
          onModeChange(nextMode);
        }
      };

      editor.on("change", handleChange);
      editor.on("submit", handleSubmit);
      editor.on("cancel", handleCancel);
      editor.on("change-editor-mode", handleModeChange);

      return () => {
        editor.off("change", handleChange);
        editor.off("submit", handleSubmit);
        editor.off("cancel", handleCancel);
        editor.off("change-editor-mode", handleModeChange);
      };
    }, [onChange, onSubmit, onCancel, onModeChange, editor]);

    useEffect(() => {
      const { current: wrapperElement } = wrapperRef;

      const handlePaste = (event) => {
        event.stopPropagation();
      };

      wrapperElement.addEventListener("paste", handlePaste);

      return () => {
        wrapperElement.removeEventListener("paste", handlePaste);
      };
    }, []);

    return (
      <div
        {...props} // eslint-disable-line react/jsx-props-no-spreading
        ref={wrapperRef}
        className={classNames(styles.wrapper, isError && styles.wrapperError)}
      >
        <ThemeProvider theme="dark" rootClassName={styles.theme}>
          <MarkdownEditorView
            autofocus
            stickyToolbar
            editor={editor}
            toolbarsPreset={configuredToolbarsPreset}
            className={styles.editor}
          />
        </ThemeProvider>
      </div>
    );
  },
);

MarkdownEditor.propTypes = {
  defaultValue: PropTypes.string.isRequired,
  defaultMode: PropTypes.oneOf(Object.values(EditorModes)),
  mentionUsers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      display: PropTypes.string.isRequired,
      name: PropTypes.string,
    }),
  ),
  withEmoji: PropTypes.bool,
  fileUploadHandler: PropTypes.func,
  isError: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onModeChange: PropTypes.func,
};

MarkdownEditor.defaultProps = {
  defaultMode: EditorModes.WYSIWYG,
  mentionUsers: EMPTY_MENTION_USERS,
  withEmoji: false,
  fileUploadHandler,
  isError: false,
  onModeChange: undefined,
};

export default React.memo(MarkdownEditor);
