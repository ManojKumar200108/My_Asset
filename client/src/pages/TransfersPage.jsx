import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api, useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import RowActions from '../components/ui/RowActions';
import Dialog from '../components/ui/Dialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, TextArea, TextInput } from '../components/ui/FormFields';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatDate, titleCase } from '../utils/formatters';

export default function TransfersPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useAppData();
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ expectedReturnDate: '', remarks: '' });
  const canManageTransfers = ['ADMIN', 'MANAGER'].includes(user?.role);

  const transfers = data?.transfers || [];
  const filtered = (() => {
    const query = search.trim().toLowerCase();
    if (!query) return transfers;
    return transfers.filter(
      (item) =>
        item.transferId?.toLowerCase().includes(query) ||
        item.assetName?.toLowerCase().includes(query) ||
        item.assetId?.toLowerCase().includes(query)
    );
  })();

  const beginEdit = (item) => {
    setEditTarget(item);
    setForm({
      expectedReturnDate: item.expectedReturnDate?.slice(0, 10) || '',
      remarks: item.remarks || '',
    });
  };

  const save = async () => {
    if (!editTarget) return;

    setBusy(true);
    try {
      await api.put(`/data/transfers/${editTarget.id}`, form);
      toast.success('Transfer updated');
      setEditTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transfer');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      await api.delete(`/data/transfers/${deleteTarget.id}`);
      toast.success('Transfer deleted');
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete transfer');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading transfers..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title="Transfer Management"
        subtitle={`${transfers.length} transfer records available`}
        actions={<Link to="/transfers/new" className="btn btn-primary">Initiate Transfer</Link>}
      />

      <div className="card" style={{ marginBottom: 12 }}>
        <Field label="Search transfers" htmlFor="search-transfer">
          <TextInput
            id="search-transfer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by transfer ID or asset"
          />
        </Field>
      </div>

      {filtered.length ? (
        <DataTable
          caption="Transfer records"
          headers={['Transfer ID', 'Asset', 'Type', 'From', 'To', 'Initiated By', 'Date', 'Status', 'Actions']}
        >
          {filtered.map((item) => (
            <tr key={item.id}>
              <td className="col-id"><Link to={`/transfers/${item.id}`}>{item.transferId}</Link></td>
              <td>{item.assetName} ({item.assetId})</td>
              <td>{titleCase(item.transferType)}</td>
              <td>{item.from}</td>
              <td>{item.to}</td>
              <td>{item.initiatedBy}</td>
              <td>{formatDate(item.initiatedAt)}</td>
              <td>{titleCase(item.status)}</td>
              <td>
                {canManageTransfers ? (
                  <RowActions onEdit={() => beginEdit(item)} onDelete={() => setDeleteTarget(item)} />
                ) : (
                  <span style={{ color: 'var(--text-subtle)' }}>View Only</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No transfer records found" message="Try a different search or initiate a new transfer." />
      )}

      <Dialog
        open={Boolean(editTarget) && canManageTransfers}
        onClose={() => setEditTarget(null)}
        title="Edit Transfer"
        labelledBy="edit-transfer-title"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditTarget(null)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="form-grid-2">
          <Field label="Expected Return Date" htmlFor="expectedReturnDate">
            <TextInput id="expectedReturnDate" type="date" value={form.expectedReturnDate} onChange={(event) => setForm((prev) => ({ ...prev, expectedReturnDate: event.target.value }))} />
          </Field>
          <Field label="Remarks" htmlFor="remarks">
            <TextArea id="remarks" rows={4} value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget) && canManageTransfers}
        title="Delete Transfer"
        description={`Delete transfer ${deleteTarget?.transferId || ''}? This action cannot be undone.`}
        confirmText="Delete Transfer"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
