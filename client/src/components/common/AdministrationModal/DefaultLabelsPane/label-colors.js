/**
 * ⚠️ IMPORTANTE: Lista de cores válidas
 * 
 * Esta lista DEVE ser mantida em sincronização com server/api/models/Label.js (COLORS)
 * O backend é a FONTE DE VERDADE - valida cores contra Label.COLORS
 * 
 * Para adicionar novas cores:
 * 1. Adiciona no backend: server/api/models/Label.js -> COLORS array
 * 2. Adiciona aqui a tradução (opcional - se não existir, usa o nome em inglês)
 * 3. Adiciona o CSS correspondente em: client/src/styles/colors.css
 */

// Mapa de traduções pt-PT (OPCIONAL - fallback para nome em inglês)
const COLOR_TRANSLATIONS_PT = {
  // Vermelhos e Rosas
  'berry-red': 'Vermelho Baga',
  'pink-tulip': 'Tulipa Rosa',
  'apricot-red': 'Damasco Vermelho',
  'piggy-red': 'Vermelho Porco',
  'red-burgundy': 'Vermelho Borgonha',
  'rosso-corsa': 'Rosso Corsa',
  'hot-pink': 'Rosa Quente',
  
  // Laranjas e Amarelos
  'pumpkin-orange': 'Laranja Abóbora',
  'orange-peel': 'Casca de Laranja',
  'light-orange': 'Laranja Claro',
  'egg-yellow': 'Amarelo Ovo',
  'desert-sand': 'Areia do Deserto',
  'light-cocoa': 'Cacau Claro',
  'shady-rust': 'Ferrugem Sombria',
  'light-mud': 'Lama Clara',
  'bright-yellow': 'Amarelo Brilhante',
  'pure-orange': 'Laranja Puro',
  
  // Verdes
  'fresh-salad': 'Salada Fresca',
  'sunny-grass': 'Relva Ensolarada',
  'bright-moss': 'Musgo Brilhante',
  'tank-green': 'Verde Tanque',
  'coral-green': 'Verde Coral',
  'wet-moss': 'Musgo Húmido',
  'modern-green': 'Verde Moderno',
  'lime-green': 'Verde Lima',
  
  // Azuis
  'morning-sky': 'Céu da Manhã',
  'antique-blue': 'Azul Antigo',
  'lagoon-blue': 'Azul Lagoa',
  'midnight-blue': 'Azul Meia-noite',
  'navy-blue': 'Azul Marinha',
  'summer-sky': 'Céu de Verão',
  'turquoise-sea': 'Mar Turquesa',
  'french-coast': 'Costa Francesa',
  'deep-ocean': 'Oceano Profundo',
  'bright-blue': 'Azul Brilhante',
  
  // Roxos
  'lilac-eyes': 'Olhos de Lilás',
  'sugar-plum': 'Ameixa Açucarada',
  'sweet-lilac': 'Lilás Doce',
  'lavender-fields': 'Campos de Lavanda',
  
  // Cinzentos e Neutros
  'muddy-grey': 'Cinza Lamacento',
  'dark-granite': 'Granito Escuro',
  'light-concrete': 'Betão Claro',
  'grey-stone': 'Pedra Cinzenta',
  'wet-rock': 'Rocha Molhada',
  'gun-metal': 'Metal de Arma',
  
  // Gradientes
  'silver-glint': 'Brilho Prateado',
  'pirate-gold': 'Ouro Pirata',
  'sunset-glow': 'Brilho do Por do Sol',
  'deep-sea': 'Mar Profundo',
  'emerald-isle': 'Ilha Esmeralda',
  'purple-bliss': 'Êxtase Roxo',
  'cosmic-fusion': 'Fusão Cósmica',
  'royal-gold': 'Ouro Real',
  'ocean-dive': 'Mergulho no Oceano',
  'old-lime': 'Lima Antiga',
  'tzepesch-style': 'Estilo Tzepesch',
};

/**
 * Lista de TODAS as cores disponíveis (deve corresponder a Label.COLORS no backend)
 * Se adicionar cores novas no backend, adiciona aqui também
 */
const ALL_COLORS = [
  // Vermelhos e Rosas
  'berry-red', 'pink-tulip', 'apricot-red', 'piggy-red', 'red-burgundy', 
  'rosso-corsa', 'hot-pink',
  
  // Laranjas e Amarelos
  'pumpkin-orange', 'orange-peel', 'light-orange', 'egg-yellow', 'desert-sand',
  'light-cocoa', 'shady-rust', 'light-mud', 'bright-yellow', 'pure-orange',
  
  // Verdes
  'fresh-salad', 'sunny-grass', 'bright-moss', 'tank-green', 'coral-green',
  'wet-moss', 'modern-green', 'lime-green',
  
  // Azuis
  'morning-sky', 'antique-blue', 'lagoon-blue', 'midnight-blue', 'navy-blue',
  'summer-sky', 'turquoise-sea', 'french-coast', 'deep-ocean', 'bright-blue',
  
  // Roxos
  'lilac-eyes', 'sugar-plum', 'sweet-lilac', 'lavender-fields',
  
  // Cinzentos e Neutros
  'muddy-grey', 'dark-granite', 'light-concrete', 'grey-stone', 'wet-rock', 'gun-metal',
  
  // Gradientes
  'silver-glint', 'pirate-gold', 'sunset-glow', 'deep-sea', 'emerald-isle',
  'purple-bliss', 'cosmic-fusion', 'royal-gold', 'ocean-dive', 'old-lime', 'tzepesch-style',
];

/**
 * Função helper para obter o label traduzido de uma cor
 */
const getColorLabel = (colorValue) => {
  return COLOR_TRANSLATIONS_PT[colorValue] || colorValue.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

/**
 * Array de cores formatado para usar em Dropdowns
 */
export const LABEL_COLORS = ALL_COLORS.map(color => ({
  value: color,
  label: getColorLabel(color),
}));

