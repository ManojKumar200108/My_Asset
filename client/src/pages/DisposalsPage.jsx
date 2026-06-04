import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import RowActions from '../components/ui/RowActions';
import Dialog from '../components/ui/Dialog';
import { Field, SelectInput, TextArea, TextInput } from '../components/ui/FormFields';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatCurrency, formatDate, titleCase } from '../utils/formatters';

const emptyForm = {
  assetId: '',
  disposalType: 'SCRAP',
  reason: '',
  disposalValue: '',
  disposalDate: '',
  status: 'PENDING_APPROVAL',
};

export default function DisposalsPage() {
  const { data, loading, error, refresh } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const disposals = data?.disposals || [];
  const assets = data?.assets || [];

  const openCreate = () => {
    setTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setTarget(item);
    setForm({
      assetId: assets.find((asset) => asset.assetId === item.assetId)?.id || '',
      disposalType: item.disposalType || 'SCRAP',
      reason: item.reason || '',
      disposalValue: item.disposalValue || '',
      disposalDate: item.disposalDate?.slice(0, 10) || '',
      status: item.status || 'PENDING_APPROVAL',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.assetId || !form.disposalDate) {
      toast.error('Asset and disposal date are required');
      return;
    }

    setBusy(true);
    try {
      if (target) {
        await api.put(`/data/disposals/${target.id}`, form);
        toast.success('Disposal updated successfully');
      } else {
        await api.post('/data/disposals', form);
        toast.success('Disposal record created');
      }
      setModalOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save disposal');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading disposals..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title="Asset Disposals"
        subtitle="Track write-offs, scrap, and disposal approvals."
        actions={<button type="button" className="btn btn-primary" onClick={openCreate}>Add Disposal</button>}
      />

      {disposals.length ? (
        <DataTable
          caption="Disposal records"
          headers={['Disposal ID', 'Asset ID', 'Type', 'Reason', 'Value', 'Date', 'Status', 'Actions']}
        >
          {disposals.map((item) => (
            <tr key={item.id}>
              <td className="col-id">{item.disposalId}</td>
              <td>{item.assetId || '-'}</td>
              <td>{titleCase(item.disposalType)}</td>
              <td>{item.reason || '-'}</td>
              <td>{formatCurrency(item.disposalValue)}</td>
              <td>{formatDate(item.disposalDate)}</td>
              <td>{titleCase(item.status)}</td>
              <td><RowActions onEdit={() => openEdit(item)} /></td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No disposal records" message="Create a disposal record to start tracking this module." />
      )}

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={target ? 'Edit Disposal' : 'Add Disposal'}
        labelledBy="disposal-dialog"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setModalOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="form-grid-2">
          <Field label="Asset" required htmlFor="disposal-asset">
            <SelectInput id="disposal-asset" value={form.assetId} onChange={(event) => setForm((prev) => ({ ...prev, assetId: event.target.value }))}>
              <option value="">Select asset</option>
              {assets.map((item) => <option key={item.id} value={item.id}>{item.assetName} ({item.assetId})</option>)}
            </SelectInput>
          </Field>
          <Field label="Disposal Type" htmlFor="disposal-type">
            <SelectInput id="disposal-type" value={form.disposalType} onChange={(event) => setForm((prev) => ({ ...prev, disposalType: event.target.value }))}>
              <option value="SCRAP">Scrap</option>
              <option value="WRITE_OFF">Write-Off</option>
              <option value="SOLD">Sold</option>
              <option value="DONATED">Donated</option>
            </SelectInput>
          </Field>
          <Field label="Disposal Date" required htmlFor="disposal-date">
            <TextInput id="disposal-date" type="date" value={form.disposalDate} onChange={(event) => setForm((prev) => ({ ...prev, disposalDate: event.target.value }))} />
          </Field>
          <Field label="Disposal Value" htmlFor="disposal-value">
            <TextInput id="disposal-value" type="number" min="0" step="0.01" value={form.disposalValue} onChange={(event) => setForm((prev) => ({ ...prev, disposalValue: event.target.value }))} />
          </Field>
          <Field label="Status" htmlFor="disposal-status">
            <SelectInput id="disposal-status" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </SelectInput>
          </Field>
          <Field label="Reason" htmlFor="disposal-reason">
            <TextArea id="disposal-reason" rows={4} value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
