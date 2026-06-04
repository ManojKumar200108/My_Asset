import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api, useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import RowActions from '../components/ui/RowActions';
import Dialog from '../components/ui/Dialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, SelectInput, TextInput } from '../components/ui/FormFields';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatDate, titleCase } from '../utils/formatters';

const getEmptyForm = () => ({
  name: '',
  email: '',
  password: '',
  role: '',
  plantId: '',
  departmentId: '',
  isActive: '',
});

export default function UsersPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(getEmptyForm());

  const users = data?.users || [];
  const history = data?.loginHistory || [];
  const plants = data?.settings?.plants || [];
  const departments = data?.settings?.departments || [];
  const roles = (data?.roles || []).map((roleItem) => roleItem.name);
  const availableRoles = roles.length ? roles : ['ADMIN', 'MANAGER', 'CUSTODIAN', 'AUDITOR', 'VIEWER'];
  const canManageUsers = user?.role === 'ADMIN';

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

  const openEdit = (selectedUser) => {
    setTarget(selectedUser);
    setForm({
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      password: '',
      role: selectedUser.role || '',
      plantId: plants.find((item) => item.name === selectedUser.plant)?.id || '',
      departmentId: departments.find((item) => item.name === selectedUser.department)?.id || '',
      isActive: selectedUser.isActive ? 'active' : 'inactive',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!canManageUsers) {
      toast.error('Only admins can manage users');
      return;
    }

    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.email.trim())) {
      toast.error('Enter a valid email address');
      return;
    }

    if (!form.role) {
      toast.error('Role is required');
      return;
    }

    if (!target && !form.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }

    setBusy(true);
    const isCreate = !target;

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        plantId: form.plantId || undefined,
        departmentId: form.departmentId || undefined,
      };

      if (form.password) payload.password = form.password;
      if (form.isActive) payload.isActive = form.isActive === 'active';

      if (target) {
        await api.put(`/data/users/${target.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/data/users', payload);
        toast.success('User added successfully');
      }

      closeModal();
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || (isCreate ? 'Failed to add user' : 'Failed to update user'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      await api.delete(`/data/users/${deleteTarget.id}`);
      toast.success('User deleted');
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading users..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${users.length} users in the system`}
        actions={
          canManageUsers ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>Add User</button>
          ) : null
        }
      />

      <section className="card" style={{ marginBottom: 12 }}>
        <div className="card-header"><h2 className="card-title">Users</h2></div>
        {users.length ? (
          <DataTable
            caption="User records"
            headers={['Name', 'Email', 'Role', 'Department', 'Plant', 'Status', 'Actions']}
          >
            {users.map((entry) => (
              <tr key={entry.id}>
                <td className="col-primary">{entry.name}</td>
                <td>{entry.email}</td>
                <td>{titleCase(entry.role)}</td>
                <td>{entry.department}</td>
                <td>{entry.plant}</td>
                <td>{entry.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  {canManageUsers ? (
                    <RowActions onEdit={() => openEdit(entry)} onDelete={() => setDeleteTarget(entry)} />
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No users found" message="Add users to control system access." />
        )}
      </section>

      <section className="card">
        <div className="card-header"><h2 className="card-title">Login History</h2></div>
        {history.length ? (
          <DataTable
            caption="Login history"
            headers={['User', 'Email', 'IP', 'Status', 'Timestamp']}
          >
            {history.slice(0, 60).map((item) => (
              <tr key={item.id}>
                <td>{item.user}</td>
                <td>{item.email}</td>
                <td>{item.ipAddress}</td>
                <td>{item.success ? 'Success' : 'Failed'}</td>
                <td>{formatDate(item.timestamp, true)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No login history" />
        )}
      </section>

      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={target ? 'Edit User' : 'Add User'}
        labelledBy="user-dialog"
        footer={
          <>
            <button type="button" className="btn" onClick={closeModal} disabled={busy}>Cancel</button>
            <button type="submit" form="user-form" className="btn btn-primary" disabled={busy}>
              {busy ? <Loader2 size={14} className="spin" /> : null}
              {busy ? 'Saving...' : 'Save User'}
            </button>
          </>
        }
      >
        <form
          id="user-form"
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <input type="text" name="fake_username" autoComplete="username" style={{ display: 'none' }} readOnly />
          <input type="password" name="fake_password" autoComplete="new-password" style={{ display: 'none' }} readOnly />

          <div className="form-grid-2">
            <Field label="Name" required htmlFor="user-name">
              <TextInput
                id="user-name"
                name="new_user_name"
                placeholder="Enter full name"
                autoComplete="off"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Field>
            <Field label="Email" required htmlFor="user-email">
              <TextInput
                id="user-email"
                name="new_user_email"
                type="email"
                placeholder="Enter email"
                autoComplete="off"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </Field>
            <Field label={target ? 'Password (optional)' : 'Password'} htmlFor="user-password">
              <TextInput
                id="user-password"
                name="new_user_password"
                type="password"
                placeholder={target ? 'Leave blank to keep existing password' : 'Enter password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </Field>
            <Field label="Role" required htmlFor="user-role">
              <SelectInput
                id="user-role"
                name="new_user_role"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="">Select role</option>
                {availableRoles.map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}
              </SelectInput>
            </Field>
            <Field label="Plant" htmlFor="user-plant">
              <SelectInput
                id="user-plant"
                name="new_user_plant"
                value={form.plantId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, plantId: event.target.value, departmentId: '' }))
                }
              >
                <option value="">Select plant</option>
                {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Department" htmlFor="user-department">
              <SelectInput
                id="user-department"
                name="new_user_department"
                value={form.departmentId}
                onChange={(event) => setForm((prev) => ({ ...prev, departmentId: event.target.value }))}
              >
                <option value="">Select department</option>
                {departments
                  .filter((department) => !form.plantId || department.plantId === form.plantId)
                  .map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
              </SelectInput>
            </Field>
            <Field label="Status" htmlFor="user-status">
              <SelectInput
                id="user-status"
                name="new_user_status"
                value={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value }))}
              >
                <option value="">Select status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User"
        description={`Delete ${deleteTarget?.name || 'this user'} from active records?`}
        confirmText="Delete User"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
