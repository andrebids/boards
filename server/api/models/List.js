/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * List.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const Types = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVE: 'archive',
  TRASH: 'trash',
};

const SortFieldNames = {
  NAME: 'name',
  DUE_DATE: 'dueDate',
  CREATED_AT: 'createdAt',
};

// TODO: should not be here
const SortOrders = {
  ASC: 'asc',
  DESC: 'desc',
};

const FINITE_TYPES = [Types.ACTIVE, Types.CLOSED];

const COLORS = [
  // Vermelhos e Rosas
  'berry-red',
  'pink-tulip',
  'gryffindor-red',
  'bright-coral',
  'soft-pink',
  'dusty-rose',
  'pale-dogwood',

  // Laranjas e Amarelos
  'pumpkin-orange',
  'orange-peel',
  'phoenix-orange',
  'peach',
  'hufflepuff-gold',
  'golden-snitch',
  'light-mud',

  // Verdes
  'bright-moss',
  'slytherin-green',
  'mint-green',
  'turquoise-sea',
  'deep-teal',

  // Azuis
  'lagoon-blue',
  'antique-blue',
  'ravenclaw-blue',
  'powder-blue',
  'cornflower-blue',

  // Roxos
  'hogwarts-purple',
  'lavender',
  'lilac',

  // Cinzentos e Neutros
  'dark-granite',
  'slate-gray',
  'magical-silver',
  'dark-wizard',
  'unicorn-white',

  // --- Gradientes ---

  // Gradientes - Rosas e Roxos
  'pink-purple-dream',
  'purple-dusk',
  'galaxy-dream',
  'dark-wine',

  // Gradientes - Multi-cor e Pôr do Sol
  'vibrant-sunset',
  'pastel-dream',

  // Gradientes - Azuis e Verdes
  'ocean-breeze',
  'ocean-depths',
  'emerald-water',
  'cool-sky',

  // Gradientes - Escuros
  'moonlit-asteroid',
  'deep-space',

  // --- Padrões ---
  'blue-white-stripes',
];

module.exports = {
  Types,
  SortFieldNames,
  SortOrders,
  FINITE_TYPES,
  COLORS,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    type: {
      type: 'string',
      isIn: Object.values(Types),
      required: true,
    },
    position: {
      type: 'number',
      allowNull: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    color: {
      type: 'string',
      allowNull: true,
      custom: function(value) {
        // Se for null, é válido
        if (value === null) {
          return true;
        }
        
        // Se for string vazia, é inválido
        if (value === '') {
          return false;
        }
        
        // Aceitar cores padrão
        if (COLORS.includes(value)) {
          return true;
        }
        
        // Aceitar cores personalizadas no formato: nome-cor (ex: ravenclaw-blue, gryffindor-red)
        const customColorRegex = /^[a-z]+-[a-z]+$/;
        if (customColorRegex.test(value)) {
          return true;
        }
        
        return false;
      }
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
      via: 'listId',
    },
  },
};
