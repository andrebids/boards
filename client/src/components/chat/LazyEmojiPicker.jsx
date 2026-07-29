import React from 'react';

import styles from './LazyEmojiPicker.module.scss';

export const EMOJI_PICKER_WIDTH = 280;
export const EMOJI_PICKER_HEIGHT = 350;
export const EMOJI_PICKER_CLASS_NAME = styles.picker;

export const EMOJI_CATEGORY_ICONS = Object.freeze({
  suggested: '🕐',
  smileys_people: '😀',
  animals_nature: '🐶',
  food_drink: '🍎',
  travel_places: '🚗',
  activities: '⚽',
  objects: '💡',
  symbols: '🔣',
  flags: '🏁',
});

const LazyEmojiPicker = React.lazy(() => import('emoji-picker-react'));

export default LazyEmojiPicker;
