import React from 'react';
import PropTypes from 'prop-types';
import { Button, Icon, Form, Input, TextArea, Dropdown } from 'semantic-ui-react';
import useExpenseForm from './useExpenseForm';
import styles from '../../ExpensesTab.module.scss';

function ExpenseForm(props) {
  const { t, categories, editingExpense, onSetEditingExpense, projectId, dispatch, formContainerRef } = props;

  const {
    formData,
    formFiles,
    setFormFiles,
    fileInputRef,
    handleFormChange,
    handleFormSubmit,
    handleClearForm,
    isFormValid,
  } = useExpenseForm({ editingExpense, onSetEditingExpense, projectId, dispatch });

  return (
    <div className={styles.formContainer} ref={formContainerRef}>
      <h4 className={styles.formTitle}>
        {editingExpense
          ? t('finance.editExpense', { defaultValue: 'Editar Despesa' })
          : t('finance.addExpense', { defaultValue: 'Adicionar Despesa' })}
      </h4>

      <Form>
        <Form.Field required>
          <label className="glass-label">{t('finance.date', { defaultValue: 'Data' })}</label>
          <Input
            type="date"
            value={formData.date}
            className={styles.field}
            onChange={function(e){ handleFormChange('date', e.target.value); }}
            style={{ colorScheme: 'dark' }}
          />
        </Form.Field>

        <Form.Field required>
          <label className="glass-label">{t('finance.category', { defaultValue: 'Categoria' })}</label>
          <Dropdown
            placeholder={t('finance.selectCategory', { defaultValue: 'Selecionar categoria' })}
            fluid
            selection
            search
            options={categories}
            value={formData.category}
            className={styles.field}
            onChange={function(_, data){ handleFormChange('category', data.value); }}
            allowAdditions
            additionLabel={t('finance.addCategory', { defaultValue: 'Adicionar: ' })}
            onAddItem={function(_, data){ handleFormChange('category', data.value); }}
          />
        </Form.Field>

        <Form.Field>
          <label className="glass-label">{t('finance.description', { defaultValue: 'Descrição' })}</label>
          <TextArea
            rows={3}
            value={formData.description}
            className={styles.field}
            onChange={function(e){ handleFormChange('description', e.target.value); }}
            placeholder={t('finance.descriptionPlaceholder', { defaultValue: 'Descrição da despesa...' })}
          />
        </Form.Field>

        <Form.Field required>
          <label className="glass-label">{t('finance.value', { defaultValue: 'Valor (EUR)' })}</label>
          <Input
            type="number"
            step="0.01"
            value={formData.value}
            className={styles.field}
            onChange={function(e){ handleFormChange('value', e.target.value); }}
            placeholder="0.00"
          />
        </Form.Field>

        <Form.Field>
          <label className="glass-label">{t('finance.attachments', { defaultValue: 'Anexos' })}</label>
          <div
            className={styles.filePicker}
            role="button"
            tabIndex={0}
            onClick={function(){ if (fileInputRef.current) fileInputRef.current.click(); }}
            onKeyDown={function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (fileInputRef.current) fileInputRef.current.click(); } }}
          >
            <Icon name="paperclip" />
            <span className={styles.filePlaceholder}>
              {formFiles.length > 0
                ? t('finance.nFilesSelected', { defaultValue: '{{count}} ficheiros selecionados', count: formFiles.length })
                : t('finance.selectFiles', { defaultValue: 'Selecionar ficheiros...' })}
            </span>
            <Button
              type="button"
              onClick={function(e){ e.stopPropagation(); if (fileInputRef.current) fileInputRef.current.click(); }}
            >
              {t('common.browse', { defaultValue: 'Procurar' })}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className={styles.hiddenFileInput}
              onChange={function(e){
                var files = Array.prototype.slice.call(e.target.files || []);
                if (files.length === 0) return;
                setFormFiles(function(prev){ return prev.concat(files); });
                e.target.value = '';
              }}
            />
          </div>
          {formFiles.length > 0 && (
            <div className={styles.fileList}>
              {formFiles.map(function(f, idx){
                return (
                  <div key={(f.name || 'file') + '-' + idx} className={styles.fileItem}>
                    <Icon name={(f.type && f.type.indexOf('image/') === 0) ? 'file image outline' : 'file pdf outline'} />
                    <span className={styles.fileName} title={f.name}>{f.name}</span>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={function(){ setFormFiles(function(prev){ return prev.filter(function(_, i){ return i !== idx; }); }); }}
                      title={t('common.delete', { defaultValue: 'Eliminar' })}
                      aria-label={t('common.delete', { defaultValue: 'Eliminar' })}
                    >
                      <Icon name="trash alternate outline" />
                    </button>
                  </div>
                );
              })}
              <div className={styles.fileHint}>{t('finance.onlyPdfOrImageAllowed', { defaultValue: 'Apenas PDF ou imagem.' })}</div>
            </div>
          )}
        </Form.Field>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button onClick={handleClearForm}>
            {t('common.cancel', { defaultValue: 'Limpar' })}
          </Button>
          <Button primary onClick={handleFormSubmit} disabled={!isFormValid}>
            {t('common.save', { defaultValue: 'Guardar' })}
          </Button>
        </div>
      </Form>
    </div>
  );
}

ExpenseForm.propTypes = {
  t: PropTypes.func.isRequired,
  categories: PropTypes.array.isRequired,
  editingExpense: PropTypes.object,
  onSetEditingExpense: PropTypes.func.isRequired,
  projectId: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  formContainerRef: PropTypes.object,
};

export default React.memo(ExpenseForm);


