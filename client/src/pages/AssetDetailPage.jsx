import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../contexts/AuthContext';
import { useAppData } from '../hooks/useAppData';
import Dialog from '../components/ui/Dialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, SelectInput, TextArea, TextInput } from '../components/ui/FormFields';
import { ErrorState, LoadingState, EmptyState } from '../components/ui/StateViews';
import { formatCurrency, formatDate } from '../utils/formatters';

const editableFields = ['assetName', 'statusId', 'locationId', 'departmentId', 'remarks'];

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: appData, refresh: refreshAppData } = useAppData();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ assetName: '', statusId: '', locationId: '', departmentId: '', remarks: '' });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/data/assets/${id}`);
      const detail = response.data.data;
      setAsset(detail);
      setForm({
        assetName: detail.assetName || '',
        statusId: detail.statusId || '',
        locationId: detail.locationId || '',
        departmentId: detail.departmentId || '',
        remarks: detail.remarks || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load asset');
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
        const response = await api.get(`/data/assets/${id}`);
        if (!mounted) return;
        const detail = response.data.data;
        setAsset(detail);
        setForm({
          assetName: detail.assetName || '',
          statusId: detail.statusId || '',
          locationId: detail.locationId || '',
          departmentId: detail.departmentId || '',
          remarks: detail.remarks || '',
        });
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load asset');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [id]);

  const settings = appData?.settings || {};
  const locationOptions = (() => {
    if (!asset?.plantId) return settings.locations || [];
    return (settings.locations || []).filter((item) => item.plantId === asset.plantId);
  })();

  const departmentOptions = (() => {
    if (!asset?.plantId) return settings.departments || [];
    return (settings.departments || []).filter((item) => item.plantId === asset.plantId);
  })();

  const save = async () => {
    const payload = editableFields.reduce((acc, key) => {
      acc[key] = form[key];
      return acc;
    }, {});

    setBusy(true);
    try {
      await api.put(`/data/assets/${id}`, payload);
      toast.success('Asset updated successfully');
      setEditOpen(false);
      await Promise.all([load(), refreshAppData()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update asset');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/data/assets/${id}`);
      toast.success('Asset deleted');
      navigate('/assets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete asset');
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading asset details..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={load}>Retry</button>} />;
  if (!asset) return <EmptyState title="Asset not found" message="This record may have been removed." />;

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <div>
            <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{asset.assetName}</h1>
            <p className="page-subtitle">Asset ID: {asset.assetId}</p>
          </div>
          <div className="row-actions">
            <Link className="btn" to="/assets">Back</Link>
            <button type="button" className="btn btn-soft" onClick={() => setEditOpen(true)}>Edit Asset</button>
            <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>Delete Asset</button>
          </div>
        </div>

        <div className="form-grid-3">
          <div><strong>Category</strong><div>{asset.category?.name || '-'}</div></div>
          <div><strong>Status</strong><div>{asset.status?.name || '-'}</div></div>
          <div><strong>Condition</strong><div>{asset.condition || '-'}</div></div>
          <div><strong>Plant</strong><div>{asset.plant?.name || '-'}</div></div>
          <div><strong>Location</strong><div>{asset.location?.name || '-'}</div></div>
          <div><strong>Department</strong><div>{asset.department?.name || '-'}</div></div>
          <div><strong>Purchase Date</strong><div>{formatDate(asset.purchaseDate)}</div></div>
          <div><strong>Purchase Cost</strong><div>{formatCurrency(asset.purchaseCost)}</div></div>
          <div><strong>Current Book Value</strong><div>{formatCurrency(asset.currentBookValue)}</div></div>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Remarks</strong>
          <div>{asset.remarks || '-'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <h2 className="card-title">Transfer History</h2>
        </div>
        {asset.transfers?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {asset.transfers.map((transfer) => (
              <div key={transfer.id} className="alert-banner">
                <strong>{transfer.transferId}</strong> | {transfer.transferType} | {transfer.status}
                <div>{transfer.fromLocation?.name || '-'} to {transfer.toLocation?.name || '-'} on {formatDate(transfer.initiatedAt)}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No transfer history" message="Transfers for this asset will appear here." />
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Change History</h2>
        </div>
        {asset.history?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {asset.history.map((item) => (
              <div key={item.id} className="alert-banner">
                <strong>{item.fieldName}</strong>
                <div>
                  {item.oldValue || '-'} to {item.newValue || '-'} by {item.changedBy?.name || '-'} on {formatDate(item.changedAt, true)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No change history" message="Updates to this asset will be logged here." />
        )}
      </div>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Asset"
        labelledBy="edit-asset-title"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !form.assetName.trim()}>
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="form-grid-2">
          <Field label="Asset Name" required htmlFor="assetName">
            <TextInput id="assetName" value={form.assetName} onChange={(event) => setForm((prev) => ({ ...prev, assetName: event.target.value }))} />
          </Field>
          <Field label="Status" htmlFor="statusId">
            <SelectInput id="statusId" value={form.statusId} onChange={(event) => setForm((prev) => ({ ...prev, statusId: event.target.value }))}>
              <option value="">Select status</option>
              {(settings.statuses || []).map((status) => (
                <option key={status.id} value={status.id}>{status.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Location" htmlFor="locationId">
            <SelectInput id="locationId" value={form.locationId} onChange={(event) => setForm((prev) => ({ ...prev, locationId: event.target.value }))}>
              <option value="">Select location</option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Department" htmlFor="departmentId">
            <SelectInput id="departmentId" value={form.departmentId} onChange={(event) => setForm((prev) => ({ ...prev, departmentId: event.target.value }))}>
              <option value="">Select department</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Remarks" htmlFor="remarks">
            <TextArea id="remarks" rows={4} value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Asset"
        description="This action removes the asset from active inventory records. Continue?"
        confirmText="Delete"
        busy={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={remove}
      />
    </div>
  );
}
