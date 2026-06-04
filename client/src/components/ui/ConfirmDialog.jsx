import React from 'react';
import Dialog from './Dialog';

const ConfirmDialog = ({ open, title, description, confirmText = 'Confirm', busy = false, onCancel, onConfirm }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    title={title}
    labelledBy="confirm-dialog-title"
    footer={
      <>
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Please wait...' : confirmText}
        </button>
      </>
    }
  >
    <p className="dialog-text">{description}</p>
  </Dialog>
);

export default ConfirmDialog;
