/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    projectId: {
      type: 'string',
      required: true,
    },
    startDate: {
      type: 'string',
      description: 'Data inicial para filtro (formato YYYY-MM-DD)',
      required: false,
    },
    endDate: {
      type: 'string',
      description: 'Data final para filtro (formato YYYY-MM-DD)',
      required: false,
    },
    groupBy: {
      type: 'string',
      description: 'Granularidade do agrupamento: day, month, year',
      isIn: ['day', 'month', 'year'],
      defaultsTo: 'month',
    },
  },

  async fn(inputs) {
    // Buscar todas as despesas do projeto
    let expenses = await Expense.find({
      projectId: inputs.projectId,
    });

    // Aplicar filtros de data se fornecidos
    if (inputs.startDate || inputs.endDate) {
      expenses = expenses.filter((exp) => {
        if (!exp.date) return false;
        
        const expDate = exp.date instanceof Date ? exp.date : new Date(exp.date);
        
        if (inputs.startDate) {
          const startDate = new Date(inputs.startDate);
          if (expDate < startDate) return false;
        }
        
        if (inputs.endDate) {
          const endDate = new Date(inputs.endDate);
          endDate.setHours(23, 59, 59, 999); // Incluir todo o dia final
          if (expDate > endDate) return false;
        }
        
        return true;
      });
    }

    if (expenses.length === 0) {
      return {
        totalExpenses: 0,
        totalPaid: 0,
        totalPending: 0,
        byCategory: [],
        byPeriod: [],
        byMonth: [], // Compatibilidade
      };
    }

    // Calcular totais
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.value), 0);
    const totalPaid = expenses
      .filter((exp) => exp.status === 'paid')
      .reduce((sum, exp) => sum + parseFloat(exp.value), 0);
    const totalPending = expenses
      .filter((exp) => exp.status === 'pending')
      .reduce((sum, exp) => sum + parseFloat(exp.value), 0);

    // Agrupar por categoria
    const categoryMap = {};
    expenses.forEach((exp) => {
      if (!categoryMap[exp.category]) {
        categoryMap[exp.category] = 0;
      }
      categoryMap[exp.category] += parseFloat(exp.value);
    });

    const byCategory = Object.keys(categoryMap).map((category) => ({
      category,
      total: categoryMap[category],
    }));

    // Função auxiliar para normalizar datas com base na granularidade
    const normalizeDateByGranularity = (date, granularity) => {
      if (!date) return null;
      
      let dateObj;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        console.log('Tipo de data inesperado para expense, tentando converter:', typeof date);
        dateObj = new Date(String(date));
      }
      
      // Verificar se a data é válida
      if (isNaN(dateObj.getTime())) {
        console.log('Data inválida após conversão:', date);
        return null;
      }
      
      const isoString = dateObj.toISOString();
      
      switch (granularity) {
        case 'day':
          return isoString.substring(0, 10); // YYYY-MM-DD
        case 'month':
          return isoString.substring(0, 7); // YYYY-MM
        case 'year':
          return isoString.substring(0, 4); // YYYY
        default:
          return isoString.substring(0, 7); // Default: month
      }
    };

    // Agrupar por período temporal (dia/mês/ano conforme configurado)
    const periodMap = {};
    expenses.forEach((exp) => {
      const dateKey = normalizeDateByGranularity(exp.date, inputs.groupBy);
      
      if (!dateKey) {
        console.log('Expense sem data válida:', exp.id);
        return;
      }
      
      if (!periodMap[dateKey]) {
        periodMap[dateKey] = 0;
      }
      periodMap[dateKey] += parseFloat(exp.value);
    });

    const byPeriod = Object.keys(periodMap)
      .sort()
      .map((period) => ({
        period,
        total: periodMap[period],
      }));

    return {
      totalExpenses,
      totalPaid,
      totalPending,
      byCategory,
      byPeriod,
      // Manter byMonth para compatibilidade com código existente
      byMonth: byPeriod,
    };
  },
};

