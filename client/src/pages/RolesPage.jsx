import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api, useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import RowActions from '../components/ui/RowActions';
import Dialog from '../components/ui/Dialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, SelectInput, TextInput, TextArea } from '../components/ui/FormFields';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { titleCase } from '../utils/formatters';

const getEmptyForm = () => ({
  name: '',
  description: '',
  permissions: '',
  isActive: 'active',
});

const getPermissionsText = (permissions) => {
  if (!permissions) return '';
  return Array.isArray(permissions) ? permissions.join(', ') : permissions.toString();
};

const parsePermissions = (value) =>
  value
    .toString()
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean);

export default function RolesPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(getEmptyForm());

  const roles = data?.roles || [];
  const canManageRoles = user?.role === 'ADMIN';

  const closeModal = () => {
    setModalOpen(false);
    setTarget(null);
    setForm(getEmptyForm());
  };

  const openCreate = () => {
    setTarget(null);
    setForm(getEmptyForm());
    setModalOpen(true);
  };

  const openEdit = (role) => {
    setTarget(role);
    setForm({
      name: role.name || '',
      description: role.description || '',
      permissions: getPermissionsText(role.permissions),
      isActive: role.isActive ? 'active' : 'inactive',
    });
    setModalOpen(true);
  };

  const saveRole = async () => {
    if (!canManageRoles) {
      toast.error('Only admins can manage roles');
      return;
    }

    if (!form.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    const permissions = parsePermissions(form.permissions);
    if (!permissions.length) {
      toast.error('At least one permission is required');
      return;
    }

    const normalizedName = form.name.trim().toUpperCase();
    const duplicate = roles.find((role) => role.name === normalizedName && role.id !== target?.id);
    if (duplicate) {
      toast.error('A role with this name already exists');
      return;
    }

    const payload = {
      name: normalizedName,
      description: form.description.trim() || undefined,
      permissions,
      isActive: form.isActive === 'active',
    };

    setBusy(true);
    try {
      if (target) {
        await api.put(`/data/roles/${target.id}`, payload);
        toast.success('Role updated successfully');
      } else {
        await api.post('/data/roles', payload);
        toast.success('Role created successfully');
      }
      closeModal();
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || (target ? 'Failed to update role' : 'Failed to create role'));
    } finally {
      setBusy(false);
    }
  };

  const deleteRole = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      await api.delete(`/data/roles/${deleteTarget.id}`);
      toast.success('Role deleted successfully');
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading roles..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle={`${roles.length} role${roles.length === 1 ? '' : 's'} configured in the system`}
        actions={canManageRoles ? <button type="button" className="btn btn-primary" onClick={openCreate}>Add Role</button> : null}
      />

      <section className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <h2 className="card-title">Role Management</h2>
        </div>
        {roles.length ? (
          <DataTable
            caption="Configured roles"
            headers={['Name', 'Description', 'Permissions', 'Status', 'Type', 'Actions']}
          >
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="col-primary">{titleCase(role.name)}</td>
                <td>{role.description || '-'}</td>
                <td>{(role.permissions || []).join(', ') || '-'}</td>
                <td>{role.isActive ? 'Active' : 'Inactive'}</td>
                <td>{role.isSystem ? 'System' : 'Custom'}</td>
                <td>
                  {canManageRoles ? (
                    <RowActions
                      onEdit={() => openEdit(role)}
                      onDelete={() => setDeleteTarget(role)}
                      disabled={busy}
                    />
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No roles found" message="Create roles to organize permissions and user access." />
        )}
      </section>

      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={target ? 'Edit Role' : 'Add Role'}
        labelledBy="role-dialog-title"
        footer={(
          <>
            <button type="button" className="btn" onClick={closeModal} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveRole} disabled={busy}>
              {busy ? 'Saving…' : 'Save Role'}
            </button>
          </>
        )}
      >
        <Field label="Role Name" required htmlFor="role-name">
          <TextInput
            id="role-name"
            name="role-name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="ADMIN"
          />
        </Field>

        <Field label="Description" htmlFor="role-description">
          <TextArea
            id="role-description"
            name="role-description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Describe this role"
          />
        </Field>

        <Field label="Permissions" required htmlFor="role-permissions">
          <TextArea
            id="role-permissions"
            name="role-permissions"
            rows={4}
            value={form.permissions}
            onChange={(event) => setForm((prev) => ({ ...prev, permissions: event.target.value }))}
            placeholder="Enter comma-separated permissions"
          />
        </Field>

        <Field label="Status" required htmlFor="role-status">
          <SelectInput
            id="role-status"
            name="role-status"
            value={form.isActive}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectInput>
        </Field>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Role"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.name}? This cannot be undone. If users are assigned to this role, reassign them before deletion.`
            : ''
        }
        confirmText="Delete"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteRole}
      />
    </div>
  );
}
