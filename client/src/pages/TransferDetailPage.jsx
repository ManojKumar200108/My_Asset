import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api, useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Dialog from '../components/ui/Dialog';
import { Field, TextArea, TextInput } from '../components/ui/FormFields';
import { ErrorState, LoadingState, EmptyState } from '../components/ui/StateViews';
import { formatDate, titleCase } from '../utils/formatters';

export default function TransferDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ expectedReturnDate: '', remarks: '' });
  const canManageTransfers = ['ADMIN', 'MANAGER'].includes(user?.role);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/data/transfers/${id}`);
      const detail = response.data.data;
      setTransfer(detail);
      setForm({
        expectedReturnDate: detail.expectedReturnDate?.slice(0, 10) || '',
        remarks: detail.remarks || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transfer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/data/transfers/${id}`);
        if (!mounted) return;
        const detail = response.data.data;
        setTransfer(detail);
        setForm({
          expectedReturnDate: detail.expectedReturnDate?.slice(0, 10) || '',
          remarks: detail.remarks || '',
        });
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load transfer');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [id]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/data/transfers/${id}`, form);
      toast.success('Transfer updated');
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transfer');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/data/transfers/${id}`);
      toast.success('Transfer deleted');
      navigate('/transfers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete transfer');
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading transfer details..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={load}>Retry</button>} />;
  if (!transfer) return <EmptyState title="Transfer not found" />;

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <div>
            <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{transfer.transferId}</h1>
            <p className="page-subtitle">Transfer details and approval trail</p>
          </div>
          <div className="row-actions">
            <Link className="btn" to="/transfers">Back</Link>
            {canManageTransfers ? (
              <>
                <button type="button" className="btn btn-soft" onClick={() => setEditOpen(true)}>Edit Transfer</button>
                <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>Delete Transfer</button>
              </>
            ) : null}
          </div>
        </div>

        <div className="form-grid-3">
          <div><strong>Asset</strong><div>{transfer.asset?.assetName || '-'} ({transfer.asset?.assetId || '-'})</div></div>
          <div><strong>Type</strong><div>{titleCase(transfer.transferType)}</div></div>
          <div><strong>Status</strong><div>{titleCase(transfer.status)}</div></div>
          <div><strong>From</strong><div>{transfer.fromPlant?.name || '-'} / {transfer.fromLocation?.name || '-'}</div></div>
          <div><strong>To</strong><div>{transfer.toPlant?.name || '-'} / {transfer.toLocation?.name || '-'}</div></div>
          <div><strong>Initiated By</strong><div>{transfer.initiatedBy?.name || '-'}</div></div>
          <div><strong>Initiated At</strong><div>{formatDate(transfer.initiatedAt)}</div></div>
          <div><strong>Expected Return</strong><div>{formatDate(transfer.expectedReturnDate)}</div></div>
          <div><strong>Purpose</strong><div>{transfer.purpose || '-'}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Approvals</h2>
        </div>
        {transfer.approvals?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {transfer.approvals.map((approval) => (
              <div key={approval.id} className="alert-banner">
                <strong>Level {approval.level}</strong> | {approval.approver?.name || '-'} |{' '}
                {approval.isApproved === null ? 'Pending' : approval.isApproved ? 'Approved' : 'Rejected'}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No approval records" message="Approvals will appear here once assigned." />
        )}
      </div>

      <Dialog
        open={editOpen && canManageTransfers}
        onClose={() => setEditOpen(false)}
        title="Edit Transfer"
        labelledBy="edit-transfer-detail"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="form-grid-2">
          <Field label="Expected Return Date" htmlFor="transfer-expectedReturnDate">
            <TextInput id="transfer-expectedReturnDate" type="date" value={form.expectedReturnDate} onChange={(event) => setForm((prev) => ({ ...prev, expectedReturnDate: event.target.value }))} />
          </Field>
          <Field label="Remarks" htmlFor="transfer-remarks">
            <TextArea id="transfer-remarks" rows={4} value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen && canManageTransfers}
        title="Delete Transfer"
        description="This transfer will be permanently deleted. Continue?"
        confirmText="Delete"
        busy={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={remove}
      />
    </div>
  );
}
