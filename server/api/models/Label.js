/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * Label.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const COLORS = [
  // Vermelhos e Rosas
  'berry-red',
  'pink-tulip',
  'apricot-red',
  'piggy-red',
  'red-burgundy',
  'rosso-corsa',
  'hot-pink',

  // Laranjas e Amarelos
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

  // Verdes
  'fresh-salad',
  'sunny-grass',
  'bright-moss',
  'tank-green',
  'coral-green',
  'wet-moss',
  'modern-green',
  'lime-green',

  // Azuis
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

  // Roxos
  'lilac-eyes',
  'sugar-plum',
  'sweet-lilac',
  'lavender-fields',

  // Cinzentos e Neutros
  'muddy-grey',
  'dark-granite',
  'light-concrete',
  'grey-stone',
  'wet-rock',
  'gun-metal',

  // --- Gradientes ---
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
  'deep-ocean',
  'tzepesch-style',
];

module.exports = {
  COLORS,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    position: {
      type: 'number',
      required: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    color: {
      type: 'string',
      isIn: COLORS,
      required: true,
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    boardId: {
      model: 'Board',
      required: true,
      columnName: 'board_id',
    },
    cards: {
      collection: 'Card',
      via: 'labelId',
      through: 'CardLabel',
    },
  },
};
