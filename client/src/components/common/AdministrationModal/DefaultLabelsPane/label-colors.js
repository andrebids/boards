/**
 * Valid label colors. This list must stay in sync with
 * server/api/models/Label.js (COLORS), which is the source of truth.
 */

const ALL_COLORS = [
  'berry-red',
  'pink-tulip',
  'apricot-red',
  'piggy-red',
  'red-burgundy',
  'rosso-corsa',
  'hot-pink',
  'pumpkin-orange',
  'orange-peel',
  'light-orange',
  'egg-yellow',
  'desert-sand',
  'light-cocoa',
  'shady-rust',
  'light-mud',
  'bright-yellow',
  'pure-orange',
  'fresh-salad',
  'sunny-grass',
  'bright-moss',
  'tank-green',
  'coral-green',
  'wet-moss',
  'modern-green',
  'lime-green',
  'morning-sky',
  'antique-blue',
  'lagoon-blue',
  'midnight-blue',
  'navy-blue',
  'summer-sky',
  'turquoise-sea',
  'french-coast',
  'deep-ocean',
  'bright-blue',
  'lilac-eyes',
  'sugar-plum',
  'sweet-lilac',
  'lavender-fields',
  'muddy-grey',
  'dark-granite',
  'light-concrete',
  'grey-stone',
  'wet-rock',
  'gun-metal',
  'silver-glint',
  'pirate-gold',
  'sunset-glow',
  'deep-sea',
  'emerald-isle',
  'purple-bliss',
  'cosmic-fusion',
  'royal-gold',
  'ocean-dive',
  'old-lime',
  'tzepesch-style',
];

const getColorLabel = colorValue =>
  colorValue
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const LABEL_COLORS = ALL_COLORS.map(color => ({
  value: color,
  label: getColorLabel(color),
}));
