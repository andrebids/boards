const confirmLeaveGroup = (confirm, message, onConfirm) => {
  if (!confirm(message)) {
    return false;
  }

  onConfirm();
  return true;
};

export default confirmLeaveGroup;
