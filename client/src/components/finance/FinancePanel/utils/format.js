export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('pt-PT');
}


