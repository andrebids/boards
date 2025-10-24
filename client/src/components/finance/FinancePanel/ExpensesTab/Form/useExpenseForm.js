import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import actions from '../../../../../actions';

export default function useExpenseForm(params) {
  const { editingExpense, onSetEditingExpense, projectId, dispatch } = params;

  const [formData, setFormData] = useState(() => {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    return { category: '', description: '', value: '', date: isoDate };
  });

  const [formFiles, setFormFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Atualiza o formulário quando entra em modo de edição
  useEffect(() => {
    if (!editingExpense) return;
    let dateValue = '';
    if (editingExpense.date) {
      const d = new Date(editingExpense.date);
      if (!isNaN(d.getTime())) {
        dateValue = d.toISOString().split('T')[0];
      }
    }
    setFormData({
      category: editingExpense.category || '',
      description: editingExpense.description || '',
      value: (editingExpense.value != null ? editingExpense.value : '').toString(),
      date: dateValue,
    });
  }, [editingExpense]);

  const handleFormChange = useCallback((field, value) => {
    setFormData(function(prev) { return { ...prev, [field]: value }; });
  }, []);

  const resetForm = useCallback(() => {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    setFormData({ category: '', description: '', value: '', date: isoDate });
    setFormFiles([]);
    if (onSetEditingExpense) onSetEditingExpense(null);
  }, [onSetEditingExpense]);

  const handleFormSubmit = useCallback(() => {
    const data = {
      category: formData.category,
      description: formData.description || '-',
      value: parseFloat(formData.value),
      date: formData.date,
      status: 'pending',
    };

    if (editingExpense) {
      dispatch(actions.updateExpense(editingExpense.id, data));
      resetForm();
      return;
    }

    if (formFiles && formFiles.length > 0) {
      dispatch(actions.createExpenseWithAttachments(projectId, data, formFiles));
    } else {
      dispatch(actions.createExpense(projectId, data));
    }

    resetForm();
  }, [dispatch, editingExpense, formData, formFiles, projectId, resetForm]);

  const handleClearForm = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const isFormValid = useMemo(() => !!(formData.category && formData.value && formData.date), [formData]);

  return {
    formData,
    formFiles,
    setFormFiles,
    fileInputRef,
    handleFormChange,
    handleFormSubmit,
    handleClearForm,
    isFormValid,
  };
}


