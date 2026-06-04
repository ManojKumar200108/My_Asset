import React, { useMemo, useState } from 'react';
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

const entityConfig = {
  plants: {
    title: 'Plants',
    endpoint: 'plants',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'location', label: 'Location', required: true },
    ],
    headers: ['Name', 'Location', 'Actions'],
    row: (item) => [item.name, item.location],
    empty: { name: '', location: '' },
  },
  departments: {
    title: 'Departments',
    endpoint: 'departments',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'plantId', label: 'Plant', required: true, type: 'select', source: 'plants' },
    ],
    headers: ['Name', 'Plant', 'Actions'],
    row: (item) => [item.name, item.plant?.name || '-'],
    empty: { name: '', plantId: '' },
  },
  locations: {
    title: 'Locations',
    endpoint: 'locations',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'plantId', label: 'Plant', required: true, type: 'select', source: 'plants' },
    ],
    headers: ['Name', 'Plant', 'Actions'],
    row: (item) => [item.name, item.plant?.name || '-'],
    empty: { name: '', plantId: '' },
  },
  categories: {
    title: 'Categories',
    endpoint: 'categories',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
    ],
    headers: ['Name', 'Code', 'Actions'],
    row: (item) => [item.name, item.code],
    empty: { name: '', code: '' },
  },
  statuses: {
    title: 'Statuses',
    endpoint: 'statuses',
    fields: [{ key: 'name', label: 'Name', required: true }],
    headers: ['Name', 'Actions'],
    row: (item) => [item.name],
    empty: { name: '' },
  },
  vendors: {
    title: 'Vendors',
    endpoint: 'vendors',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
    ],
    headers: ['Name', 'Email', 'Phone', 'Actions'],
    row: (item) => [item.name, item.email || '-', item.phone || '-'],
    empty: { name: '', email: '', phone: '' },
  },
  custodians: {
    title: 'Custodians',
    endpoint: 'custodians',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'plantId', label: 'Plant', required: true, type: 'select', source: 'plants' },
      {
        key: 'departmentId',
        label: 'Department',
        required: true,
        type: 'select',
        source: 'departments',
        filterBy: { key: 'plantId', on: 'plantId' },
      },
    ],
    headers: ['Name', 'Email', 'Phone', 'Plant', 'Department', 'Actions'],
    row: (item) => [item.name, item.email, item.phone || '-', item.plant?.name || '-', item.department?.name || '-'],
    empty: { name: '', email: '', phone: '', plantId: '', departmentId: '' },
  },
};

function MasterSection({
  keyName,
  rows,
  config,
  settings,
  onCreate,
  onEdit,
  onDelete,
}) {
  return (
    <section className="card" style={{ marginBottom: 12 }}>
      <div className="card-header">
        <h2 className="card-title">{config.title}</h2>
        <button type="button" className="btn btn-primary" onClick={() => onCreate(keyName)}>
          Add {config.title.slice(0, -1)}
        </button>
      </div>

      {rows.length ? (
        <DataTable caption={`${config.title} master table`} headers={config.headers}>
          {rows.map((item) => (
            <tr key={item.id}>
              {config.row(item).map((value, index) => (
                <td key={`${item.id}-${index}`}>{value}</td>
              ))}
              <td><RowActions onEdit={() => onEdit(keyName, item)} onDelete={() => onDelete(keyName, item)} /></td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title={`No ${config.title.toLowerCase()} found`} />
      )}

      {settings.approvalChains?.length && keyName === 'categories' ? (
        <div className="alert-banner" style={{ marginTop: 12 }}>
          Approval chain definitions are shown in read-only mode below.
        </div>
      ) : null}
    </section>
  );
}

export default function SettingsPage() {
  const { data, loading, error, refresh } = useAppData();
  const [entity, setEntity] = useState(null);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const settings = data?.settings || {};

  const currentConfig = entity ? entityConfig[entity] : null;

  const openCreate = (keyName) => {
    setEntity(keyName);
    setTarget(null);
    setForm({ ...entityConfig[keyName].empty });
  };

  const openEdit = (keyName, item) => {
    setEntity(keyName);
    setTarget(item);
    const nextForm = { ...entityConfig[keyName].empty };
    Object.keys(nextForm).forEach((field) => {
      nextForm[field] = item[field] || '';
    });
    setForm(nextForm);
  };

  const remove = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      await api.delete(`/data/${entityConfig[deleteTarget.entity].endpoint}/${deleteTarget.row.id}`);
      toast.success(`${entityConfig[deleteTarget.entity].title.slice(0, -1)} deleted`);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!currentConfig) return;

    const missingField = currentConfig.fields.find((field) => field.required && !form[field.key]);
    if (missingField) {
      toast.error(`${missingField.label} is required`);
      return;
    }

    setBusy(true);
    try {
      if (target) {
        await api.put(`/data/${currentConfig.endpoint}/${target.id}`, form);
        toast.success(`${currentConfig.title.slice(0, -1)} updated`);
      } else {
        await api.post(`/data/${currentConfig.endpoint}`, form);
        toast.success(`${currentConfig.title.slice(0, -1)} created`);
      }
      setEntity(null);
      setTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save record');
    } finally {
      setBusy(false);
    }
  };

  const sections = useMemo(() => Object.entries(entityConfig), []);

  if (loading) return <LoadingState message="Loading settings..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage plants, categories, vendors, and related master data." />

      {sections.map(([keyName, config]) => (
        <MasterSection
          key={keyName}
          keyName={keyName}
          config={config}
          rows={settings[keyName] || []}
          settings={settings}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={(entityName, row) => setDeleteTarget({ entity: entityName, row })}
        />
      ))}

      <section className="card">
        <div className="card-header"><h2 className="card-title">Approval Chains (Read-only)</h2></div>
        {(settings.approvalChains || []).length ? (
          <DataTable
            caption="Approval chains"
            headers={['Category', 'Plant', 'Level', 'Role Required', 'Amount Threshold']}
          >
            {(settings.approvalChains || []).map((item) => (
              <tr key={item.id}>
                <td>{item.category?.name || '-'}</td>
                <td>{item.plant?.name || '-'}</td>
                <td>{item.level}</td>
                <td>{item.roleRequired}</td>
                <td>{item.amountThreshold ?? 'Any'}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No approval chains" />
        )}
      </section>

      <Dialog
        open={Boolean(currentConfig)}
        onClose={() => setEntity(null)}
        title={`${target ? 'Edit' : 'Add'} ${currentConfig?.title.slice(0, -1) || ''}`}
        labelledBy="settings-dialog"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEntity(null)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        {currentConfig ? (
          <div className="form-grid-2">
            {currentConfig.fields.map((field) => (
              <Field key={field.key} label={field.label} required={field.required} htmlFor={`field-${field.key}`}>
                {field.type === 'select' ? (
                  (() => {
                    const sourceRows = settings[field.source] || [];
                    const filteredRows = field.filterBy
                      ? sourceRows.filter((item) => {
                        const expected = form[field.filterBy.key];
                        if (!expected) return true;
                        return item[field.filterBy.on] === expected;
                      })
                      : sourceRows;

                    return (
                  <SelectInput
                    id={`field-${field.key}`}
                    value={form[field.key] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => {
                        const next = { ...prev, [field.key]: value };

                        if (entity === 'custodians' && field.key === 'plantId' && prev.plantId !== value) {
                          next.departmentId = '';
                        }

                        return next;
                      });
                    }}
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {filteredRows.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </SelectInput>
                    );
                  })()
                ) : (
                  <TextInput
                    id={`field-${field.key}`}
                    type={field.key === 'email' ? 'email' : 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Record"
        description={`Delete ${deleteTarget ? entityConfig[deleteTarget.entity].title.slice(0, -1).toLowerCase() : 'this record'}?`}
        confirmText="Delete"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
