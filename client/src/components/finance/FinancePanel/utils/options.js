export const monthOptions = [
  { value: '1', text: 'Janeiro' },
  { value: '2', text: 'Fevereiro' },
  { value: '3', text: 'Março' },
  { value: '4', text: 'Abril' },
  { value: '5', text: 'Maio' },
  { value: '6', text: 'Junho' },
  { value: '7', text: 'Julho' },
  { value: '8', text: 'Agosto' },
  { value: '9', text: 'Setembro' },
  { value: '10', text: 'Outubro' },
  { value: '11', text: 'Novembro' },
  { value: '12', text: 'Dezembro' },
];

export function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.push({ value: i.toString(), text: i.toString() });
  }
  return years;
}

export function buildSortOptions(t) {
  return [
    { key: 'recente', value: 'data-recente', text: t('finance.newestDate', { defaultValue: 'Mais recente' }) },
    { key: 'antiga', value: 'data-antiga', text: t('finance.oldestDate', { defaultValue: 'Mais antiga' }) },
    { key: 'alto', value: 'valor-alto', text: t('finance.highestValue', { defaultValue: 'Maior valor' }) },
    { key: 'baixo', value: 'valor-baixo', text: t('finance.lowestValue', { defaultValue: 'Menor valor' }) },
  ];
}


