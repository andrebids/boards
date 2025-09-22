const style = {
  control: {
    backgroundColor: 'transparent',
    fontSize: '14px',
    fontWeight: 'normal',
    color: '#f3f4f6',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
  },
  input: {
    margin: 0,
    color: '#f3f4f6',
    overflow: 'hidden',
    padding: 0,
    resize: 'none',
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.15)',
      fontSize: 13,
      position: 'fixed',
      zIndex: 100020,
      maxHeight: '160px',
      overflowY: 'auto',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      minWidth: '200px',
      width: '220px',
      maxWidth: '250px',
      // Garantir que aparece por cima de tudo
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
      // Garantir que não seja cortado pela coluna
      whiteSpace: 'nowrap',
    },
    item: {
      padding: '6px 12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontSize: '13px',
      lineHeight: '1.3',
      '&focused': {
        backgroundColor: '#f1f2f6',
      },
    },
  },
};

export default style;
