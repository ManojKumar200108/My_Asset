import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Dialog from '../components/ui/Dialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import RowActions from '../components/ui/RowActions';
import { Field, SelectInput, TextInput } from '../components/ui/FormFields';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatCurrency, formatDate, titleCase } from '../utils/formatters';

const scheduleDefaults = { assetId: '', type: 'PREVENTIVE', frequency: '', nextDueDate: '', vendorId: '' };
const logDefaults = { assetId: '', logDate: '', type: 'PREVENTIVE', description: '', cost: '', nextDueDate: '' };

export default function MaintenancePage() {
  const { data, loading, error, refresh } = useAppData();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(scheduleDefaults);
  const [logForm, setLogForm] = useState(logDefaults);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const schedules = data?.maintenance?.schedules || [];
  const logs = data?.maintenance?.logs || [];
  const assets = data?.assets || [];
  const vendors = data?.settings?.vendors || [];

  const openNewSchedule = () => {
    setScheduleTarget(null);
    setScheduleForm(scheduleDefaults);
    setScheduleModalOpen(true);
  };

  const openEditSchedule = (schedule) => {
    setScheduleTarget(schedule);
    setScheduleForm({
      assetId: (assets.find((item) => item.assetId === schedule.assetId)?.id || ''),
      type: schedule.type,
      frequency: schedule.frequency,
      nextDueDate: schedule.nextDueDate?.slice(0, 10) || '',
      vendorId: (vendors.find((item) => item.name === schedule.vendor)?.id || ''),
    });
    setScheduleModalOpen(true);
  };

  const saveSchedule = async () => {
    if (!scheduleForm.assetId || !scheduleForm.frequency || !scheduleForm.nextDueDate) {
      toast.error('Asset, frequency, and due date are required');
      return;
    }

    setBusy(true);
    try {
      if (scheduleTarget) {
        await api.put(`/data/maintenance/schedules/${scheduleTarget.id}`, scheduleForm);
        toast.success('Maintenance schedule updated');
      } else {
        await api.post('/data/maintenance/schedules', scheduleForm);
        toast.success('Maintenance schedule created');
      }
      setScheduleModalOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setBusy(false);
    }
  };

  const createLog = async () => {
    if (!logForm.assetId || !logForm.logDate) {
      toast.error('Asset and log date are required');
      return;
    }

    setBusy(true);
    try {
      await api.post('/data/maintenance/logs', logForm);
      toast.success('Maintenance log added');
      setLogModalOpen(false);
      setLogForm(logDefaults);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add maintenance log');
    } finally {
      setBusy(false);
    }
  };

  const removeSchedule = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      await api.delete(`/data/maintenance/schedules/${deleteTarget.id}`);
      toast.success('Schedule deleted');
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading maintenance module..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title="Maintenance Management"
        subtitle="Manage schedules and maintenance logs."
        actions={
          <>
            <button type="button" className="btn" onClick={() => setLogModalOpen(true)}>Add Log</button>
            <button type="button" className="btn btn-primary" onClick={openNewSchedule}>Add Schedule</button>
          </>
        }
      />

      <section className="card" style={{ marginBottom: 12 }}>
        <div className="card-header"><h2 className="card-title">Upcoming Schedules</h2></div>
        {schedules.length ? (
          <DataTable
            caption="Maintenance schedules"
            headers={['Asset', 'Type', 'Frequency', 'Next Due', 'Vendor', 'Actions']}
          >
            {schedules.map((item) => (
              <tr key={item.id}>
                <td>{item.assetName} ({item.assetId})</td>
                <td>{titleCase(item.type)}</td>
                <td>{item.frequency}</td>
                <td>{formatDate(item.nextDueDate)}</td>
                <td>{item.vendor}</td>
                <td><RowActions onEdit={() => openEditSchedule(item)} onDelete={() => setDeleteTarget(item)} /></td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No schedules found" message="Create a maintenance schedule to get started." />
        )}
      </section>

      <section className="card">
        <div className="card-header"><h2 className="card-title">Maintenance Logs</h2></div>
        {logs.length ? (
          <DataTable
            caption="Maintenance logs"
            headers={['Asset', 'Type', 'Date', 'Performed By', 'Cost', 'Next Due']}
          >
            {logs.map((item) => (
              <tr key={item.id}>
                <td>{item.assetName} ({item.assetId})</td>
                <td>{titleCase(item.type)}</td>
                <td>{formatDate(item.logDate)}</td>
                <td>{item.performedBy}</td>
                <td>{formatCurrency(item.cost)}</td>
                <td>{formatDate(item.nextDueDate)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No logs found" message="Maintenance logs will appear here once recorded." />
        )}
      </section>

      <Dialog
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={scheduleTarget ? 'Edit Schedule' : 'Add Schedule'}
        labelledBy="maintenance-schedule-dialog"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setScheduleModalOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={saveSchedule} disabled={busy}>{busy ? 'Saving...' : 'Save Schedule'}</button>
          </>
        }
      >
        <div className="form-grid-2">
          <Field label="Asset" required htmlFor="schedule-asset">
            <SelectInput id="schedule-asset" value={scheduleForm.assetId} onChange={(event) => setScheduleForm((prev) => ({ ...prev, assetId: event.target.value }))}>
              <option value="">Select asset</option>
              {assets.map((item) => <option key={item.id} value={item.id}>{item.assetName} ({item.assetId})</option>)}
            </SelectInput>
          </Field>
          <Field label="Type" htmlFor="schedule-type">
            <SelectInput id="schedule-type" value={scheduleForm.type} onChange={(event) => setScheduleForm((prev) => ({ ...prev, type: event.target.value }))}>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="AMC">AMC</option>
            </SelectInput>
          </Field>
          <Field label="Frequency" required htmlFor="schedule-frequency">
            <TextInput id="schedule-frequency" value={scheduleForm.frequency} onChange={(event) => setScheduleForm((prev) => ({ ...prev, frequency: event.target.value }))} placeholder="monthly / quarterly" />
          </Field>
          <Field label="Next Due Date" required htmlFor="schedule-nextDueDate">
            <TextInput id="schedule-nextDueDate" type="date" value={scheduleForm.nextDueDate} onChange={(event) => setScheduleForm((prev) => ({ ...prev, nextDueDate: event.target.value }))} />
          </Field>
          <Field label="Vendor" htmlFor="schedule-vendor">
            <SelectInput id="schedule-vendor" value={scheduleForm.vendorId} onChange={(event) => setScheduleForm((prev) => ({ ...prev, vendorId: event.target.value }))}>
              <option value="">Select vendor</option>
              {vendors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectInput>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        title="Add Maintenance Log"
        labelledBy="maintenance-log-dialog"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setLogModalOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={createLog} disabled={busy}>{busy ? 'Saving...' : 'Add Log'}</button>
          </>
        }
      >
        <div className="form-grid-2">
          <Field label="Asset" required htmlFor="log-asset">
            <SelectInput id="log-asset" value={logForm.assetId} onChange={(event) => setLogForm((prev) => ({ ...prev, assetId: event.target.value }))}>
              <option value="">Select asset</option>
              {assets.map((item) => <option key={item.id} value={item.id}>{item.assetName} ({item.assetId})</option>)}
            </SelectInput>
          </Field>
          <Field label="Log Date" required htmlFor="log-date">
            <TextInput id="log-date" type="date" value={logForm.logDate} onChange={(event) => setLogForm((prev) => ({ ...prev, logDate: event.target.value }))} />
          </Field>
          <Field label="Type" htmlFor="log-type">
            <SelectInput id="log-type" value={logForm.type} onChange={(event) => setLogForm((prev) => ({ ...prev, type: event.target.value }))}>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="AMC">AMC</option>
            </SelectInput>
          </Field>
          <Field label="Cost" htmlFor="log-cost">
            <TextInput id="log-cost" type="number" min="0" step="0.01" value={logForm.cost} onChange={(event) => setLogForm((prev) => ({ ...prev, cost: event.target.value }))} />
          </Field>
          <Field label="Next Due Date" htmlFor="log-nextDue">
            <TextInput id="log-nextDue" type="date" value={logForm.nextDueDate} onChange={(event) => setLogForm((prev) => ({ ...prev, nextDueDate: event.target.value }))} />
          </Field>
          <Field label="Description" htmlFor="log-description">
            <TextInput id="log-description" value={logForm.description} onChange={(event) => setLogForm((prev) => ({ ...prev, description: event.target.value }))} />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Maintenance Schedule"
        description={`Delete schedule for ${deleteTarget?.assetName || 'this asset'}?`}
        confirmText="Delete Schedule"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={removeSchedule}
      />
    </div>
  );
}
