import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const RowActions = ({ onEdit, onDelete, editLabel = 'Edit', deleteLabel = 'Delete', disabled = false }) => (
  <div className="row-actions" role="group" aria-label="Row actions">
    {onEdit ? (
      <button type="button" className="btn btn-soft" onClick={onEdit} disabled={disabled}>
        <Pencil size={14} aria-hidden="true" />
        {editLabel}
      </button>
    ) : null}
    {onDelete ? (
      <button type="button" className="btn btn-danger" onClick={onDelete} disabled={disabled}>
        <Trash2 size={14} aria-hidden="true" />
        {deleteLabel}
      </button>
    ) : null}
  </div>
);

export default RowActions;
