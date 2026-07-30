/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Gallery } from "react-photoswipe-gallery";
import { Icon } from 'semantic-ui-react';
import { Button } from '../../../lib/custom-ui';
import { useToggle } from "../../../lib/hooks";

import selectors from "../../../selectors";
import { ClosableContext } from "../../../contexts";
import Item from "./Item";

import styles from "./Attachments.module.scss";

const INITIALLY_VISIBLE = 4;

const Attachments = React.memo(() => {
  const attachments = useSelector(selectors.selectAttachmentsForCurrentCard);

  const [t] = useTranslation();
  const [isAllVisible, toggleAllVisible] = useToggle();
  const [activateClosable, deactivateClosable] = useContext(ClosableContext);

  const handleBeforeGalleryOpen = useCallback(
    (gallery) => {
      activateClosable();

      gallery.on("destroy", () => {
        deactivateClosable();
      });
    },
    [activateClosable, deactivateClosable],
  );

  const handleToggleAllVisibleClick = useCallback(() => {
    toggleAllVisible();
  }, [toggleAllVisible]);

  const visibleTotal = isAllVisible
    ? attachments.length
    : Math.min(attachments.length, INITIALLY_VISIBLE);

  const itemsNode = attachments.map((attachment, index) => {
    return (
      <Item
        key={attachment.id}
        id={attachment.id}
        isVisible={isAllVisible || index < INITIALLY_VISIBLE}
      />
    );
  });

  const hiddenTotal = attachments.length - visibleTotal;

  return (
    <>
      {(isAllVisible ? attachments.length > hiddenTotal : hiddenTotal > 0) && (
        <Button variant="secondary"
          fluid
          aria-expanded={isAllVisible}
          className={styles.toggleButton}
          onClick={handleToggleAllVisibleClick}
        >
          <span className={styles.toggleContent}>
            <span className={styles.toggleText}>
              {isAllVisible
                ? t("action.showFewerAttachments")
                : t("action.showAllAttachments", {
                    hidden: hiddenTotal,
                  })}
            </span>
            <Icon
              fitted
              aria-hidden="true"
              className={styles.toggleIcon}
              name={isAllVisible ? "chevron up" : "chevron down"}
            />
          </span>
        </Button>
      )}
      <Gallery
        withCaption
        withDownloadButton
        options={{
          wheelToZoom: true,
          showHideAnimationType: "none",
          closeTitle: "",
          zoomTitle: "",
          arrowPrevTitle: "",
          arrowNextTitle: "",
          errorMsg: "",
          paddingFn: (viewportSize) => {
            const paddingX = viewportSize.x / 20;
            const paddingY = viewportSize.y / 20;

            return {
              top: paddingX,
              bottom: paddingX,
              left: paddingY,
              right: paddingY,
            };
          },
        }}
        onBeforeOpen={handleBeforeGalleryOpen}
      >
        {itemsNode}
      </Gallery>
    </>
  );
});

export default Attachments;
