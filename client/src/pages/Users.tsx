import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { usersApi, type UserInput } from '@/lib/api/users.api';
import { useRealtime } from '@/hooks/useRealtime';
import FormModal from '@/components/ui/FormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

type Role = 'admin' | 'cashier' | 'sales_rep';
type Lang = 'en' | 'si';
interface AdminUser {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  language?: Lang;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPage = () => {
    setLoading(true);
    usersApi.list({ params: { page, limit: 20 } } as any).then((res) => {
      const d = res.data.data || res.data;
      setUsers(d.items || d);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPage(); }, [page]);

  useRealtime((s) => {
    s.on('user:created', fetchPage);
    s.on('user:updated', fetchPage);
    s.on('user:deleted', fetchPage);
  });

  const roles = useMemo(() => ['admin', 'cashier', 'sales_rep'] as const, []);

  const handleCreate = async (data: UserInput) => {
    setSaving(true);
    try {
      await usersApi.create(data);
      setCreateOpen(false);
      fetchPage();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<UserInput>) => {
    setSaving(true);
    try {
      await usersApi.update(id, data);
      setEditUser(null);
      fetchPage();
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (user: AdminUser) => {
    setDeleteTarget(user);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const user = deleteTarget;
    setDeleting(true);
    // Optimistic update
    const prev = users;
    setUsers(u => u.filter(x => x._id !== user._id));
    try {
      await usersApi.delete(user._id);
      toast.success(`User ${user.username} deleted`);
      fetchPage();
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
      setUsers(prev);
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    await usersApi.setActive(u._id, !u.isActive);
    fetchPage();
  };

  const changeRole = async (u: AdminUser, role: Role) => {
    if (u.role === role) return;
    await usersApi.setRole(u._id, role);
    fetchPage();
  };

  return (
    <>
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Users</h1>
            <p className="text-gray-400">Manage access, roles and activity</p>
          </div>
          <button
            className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-yellow-300 to-amber-300 text-black hover:shadow-[0_6px_24px_-6px_rgba(234,179,8,0.6)]"
            onClick={() => setCreateOpen(true)}
          >
            Add User
          </button>
        </div>
      </div>
      {loading ? (
        <div className="mt-6 grid gap-2">
          {['a','b','c','d','e','f'].map(id => (
            <div key={`skeleton-${id}`} className="h-12 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
          <table className="min-w-full text-sm border-separate border-spacing-0 table-first-col-pad">
            <thead>
              <tr className="text-left text-gray-300 bg-white/5">
                <th className="py-3 pl-4 pr-4 sticky top-0 bg-white/5">Username</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">Name</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">Email</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">Role</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">Active</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5" aria-label="Actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-white/10 hover:bg-white/10 transition-colors">
                  <td className="py-2 pl-4 pr-4">{u.username}</td>
                  <td className="py-2 pr-4">{u.firstName} {u.lastName}</td>
                  <td className="py-2 pr-4 break-words">{u.email}</td>
                  <td className="py-2 pr-4 capitalize">
                    <select
                      className="bg-transparent border border-white/10 rounded px-2 py-1 vz-select"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as any)}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r} className="text-black">
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      className={`px-2 py-1 rounded text-xs font-semibold border ${u.isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-white/5 text-gray-300 border-white/10'}`}
                      onClick={() => toggleActive(u)}
                      title={u.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs" onClick={() => setEditUser(u)}>Edit</button>
                      <button className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs" onClick={() => handleDelete(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <div className="opacity-70">Page {page}</div>
            <button className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20" onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Create User */}
      <FormModal
        isOpen={createOpen}
        title="Create User"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded bg-white/10" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button
              className="px-3 py-2 rounded bg-indigo-500 text-white disabled:opacity-50"
              disabled={saving}
              onClick={() => {
                const form = document.getElementById('create-user-form') as HTMLFormElement | null;
                if (!form) return;
                const data = new FormData(form);
                const str = (v: FormDataEntryValue | null) => typeof v === 'string' ? v : '';
                const pwd = str(data.get('password'));
                const confirm = str(data.get('confirmPassword'));
                if (pwd !== confirm) {
                  alert('Passwords do not match');
                  return;
                }
                const payload: UserInput = {
                  username: str(data.get('username')),
                  email: str(data.get('email')),
                  password: pwd,
                  firstName: str(data.get('firstName')),
                  lastName: str(data.get('lastName')),
                  role: (str(data.get('role')) as Role) || 'cashier',
                  language: (str(data.get('language')) as Lang ) || 'en',
                };
                handleCreate(payload);
              }}
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        }
      >
        <form id="create-user-form" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Username<input name="username" className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
            <label className="text-sm">Email<input type="email" name="email" className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
            <label className="text-sm">First Name<input name="firstName" className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
            <label className="text-sm">Last Name<input name="lastName" className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
            <label className="text-sm">Password<input type="password" name="password" className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
            <label className="text-sm">Confirm Password<input type="password" name="confirmPassword" className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
            <label className="text-sm block">Role
              <div>
              <select name="role" className="mt-1 w-full rounded bg-white/10 px-2 py-1">
                {roles.map((r) => (
                  <option key={r} value={r} className="text-black">{r}</option>
                ))}
              </select>
              </div>
            </label>
            <label className="text-sm block">Language
              <div>
              <select name="language" className="mt-1 w-full rounded bg-white/10 px-2 py-1">
                <option value="en" className="text-black">English</option>
                <option value="si" className="text-black">සිංහල</option>
              </select>
              </div>
            </label>
          </div>
        </form>
      </FormModal>

      {/* Edit User */}
      <FormModal
        isOpen={Boolean(editUser)}
        title={editUser ? `Edit ${editUser.username}` : 'Edit User'}
        onClose={() => setEditUser(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded bg-white/10" onClick={() => setEditUser(null)}>Cancel</button>
            <button
              className="px-3 py-2 rounded bg-indigo-500 text-white disabled:opacity-50"
              disabled={saving}
              onClick={() => {
                const form = document.getElementById('edit-user-form') as HTMLFormElement | null;
                if (!form || !editUser) return;
                const data = new FormData(form);
                const str = (v: FormDataEntryValue | null) => typeof v === 'string' ? v : '';
                const payload: Partial<UserInput> = {
                  email: str(data.get('email')),
                  firstName: str(data.get('firstName')),
                  lastName: str(data.get('lastName')),
                  language: (str(data.get('language')) as Lang) || 'en',
                };
                handleUpdate(editUser._id, payload);
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        {editUser && (
          <form id="edit-user-form" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">First Name<input name="firstName" defaultValue={editUser.firstName} className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
              <label className="text-sm">Last Name<input name="lastName" defaultValue={editUser.lastName} className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
              <label className="text-sm">Email<input type="email" name="email" defaultValue={editUser.email} className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
              <label className="text-sm" htmlFor="edit-language">Language</label>
              <select id="edit-language" name="language" defaultValue={editUser.language || 'en'} className="mt-1 w-full rounded bg-white/10 px-2 py-1">
                <option value="en" className="text-black">English</option>
                <option value="si" className="text-black">සිංහල</option>
              </select>
            </div>
          </form>
        )}
      </FormModal>
  </AppLayout>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Delete user?"
      description={deleteTarget ? `Are you sure you want to permanently delete user "${deleteTarget.username}"? This cannot be undone.` : ''}
      confirmLabel="Delete User"
      tone="danger"
      loading={deleting}
      onClose={() => { if (!deleting) setDeleteTarget(null); }}
      onConfirm={confirmDelete}
    />
  </>
  );
}
