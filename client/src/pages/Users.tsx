import { useEffect, useMemo, useState, useRef } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { usersApi, type UserInput } from '@/lib/api/users.api';
import { useRealtime } from '@/hooks/useRealtime';
import FormModal from '@/components/ui/FormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { RoleSelect } from '@/components/ui/RoleSelect';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

type Role = 'store_owner' | 'admin' | 'cashier' | 'sales_rep';
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
  faceEmbedding?: number[];
}

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  // Face enrollment modal state
  const [enrollUser, setEnrollUser] = useState<AdminUser | null>(null);
  const webcamRef = useRef<Webcam | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const scanTimer = useRef<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const fetchPage = () => {
    setLoading(true);
  usersApi.list({ params: { page, limit: 20 } }).then((res) => {
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

  const roles = useMemo(() => ['store_owner', 'cashier', 'sales_rep'] as const, []);

  // Helper: whether a user has face embedding saved
  const userHasFace = (u: AdminUser) => Array.isArray(u?.faceEmbedding) && u.faceEmbedding.length > 0;

  // Ensure models loaded
  const ensureModels = async () => {
    if (modelsLoaded) return true;
    const tryLoad = async (root: string) => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(root),
        faceapi.nets.faceRecognitionNet.loadFromUri(root),
        faceapi.nets.faceLandmark68Net.loadFromUri(root),
      ]);
    };
    try {
      await tryLoad('/models');
      setModelsLoaded(true);
      return true;
    } catch (e) {
      // Avoid loading models from external hosts - many browsers block those requests via CORS.
      // Instead instruct the developer to place model files under public/models.
      // eslint-disable-next-line no-console
      console.warn('Face models not found under /models. Please download face-api.js models and place them under public/models to enable Face ID.');
      return false;
    }
  };

  // Start/stop a lightweight detection loop when modal is open
  useEffect(() => {
    const startScan = () => {
      if (scanTimer.current) return;
      setIsScanning(true);
      setFaceDetected(false);
      const tick = async () => {
  const videoEl = (webcamRef.current?.video as HTMLVideoElement | undefined);
        if (!videoEl) return;
        try {
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
          const det = await faceapi.detectSingleFace(videoEl, options);
          setFaceDetected(Boolean(det));
        } catch {
          // ignore
        }
      };
      tick();
      scanTimer.current = window.setInterval(tick, 700);
    };
    const stopScan = () => {
      if (scanTimer.current) {
        window.clearInterval(scanTimer.current);
        scanTimer.current = null;
      }
      setIsScanning(false);
      setFaceDetected(false);
    };
    if (enrollUser) startScan(); else stopScan();
    return () => stopScan();
  }, [enrollUser]);

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
  toast.success(t('users.deleteSuccess', { username: user.username }));
      fetchPage();
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
      setUsers(prev);
  toast.error(t('users.deleteFailed'));
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">{t('users.title')}</h1>
            <p className="text-gray-400">{t('users.subtitle')}</p>
          </div>
          <button
            className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-yellow-300 to-amber-300 text-black hover:shadow-[0_6px_24px_-6px_rgba(234,179,8,0.6)]"
            onClick={() => setCreateOpen(true)}
          >
            {t('users.addUser')}
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
                <th className="py-3 pl-4 pr-4 sticky top-0 bg-white/5">{t('users.username')}</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">{t('users.name')}</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">{t('users.email')}</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">{t('users.role')}</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">{t('users.active')}</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5">Face ID</th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5" aria-label="Actions">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-white/10 hover:bg-white/10 transition-colors">
                  <td className="py-2 pl-4 pr-4">{u.username}</td>
                  <td className="py-2 pr-4">{u.firstName} {u.lastName}</td>
                  <td className="py-2 pr-4 break-words">{u.email}</td>
                  <td className="py-2 pr-4">
                    <RoleSelect value={u.role} onChange={(role) => changeRole(u, role as Role)} />
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      className={`px-2 py-1 rounded text-xs font-semibold border ${u.isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-white/5 text-gray-300 border-white/10'}`}
                      onClick={() => toggleActive(u)}
                      title={u.isActive ? t('users.deactivate') : t('users.activate')}
                    >
                      {u.isActive ? t('users.active') : t('users.inactive')}
                    </button>
                  </td>
                  <td className="py-2 pr-4">
                    {userHasFace(u) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
                        ✓ Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border border-rose-400/40 bg-rose-500/10 text-rose-300">
                        ✗ Not Enrolled
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs" onClick={() => setEditUser(u)}>{t('users.edit')}</button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-yellow-400/80 hover:bg-yellow-400 text-black text-xs font-semibold shadow-sm border border-yellow-300/40"
                        onClick={() => setEnrollUser(u)}
                        title={userHasFace(u) ? 'Update Face ID' : 'Enroll Face ID'}
                      >
                        {userHasFace(u) ? 'Update Face ID' : 'Enroll Face ID'}
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs" onClick={() => handleDelete(u)}>{t('users.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>{t('users.prev')}</button>
            <div className="opacity-70">{t('users.page', { page })}</div>
            <button className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20" onClick={() => setPage((p) => p + 1)}>{t('users.next')}</button>
          </div>
        </div>
      )}

      {/* Create User */}
      <FormModal
        isOpen={createOpen}
        title={t('users.createUserTitle')}
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-6">
            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-base font-medium transition" onClick={() => setCreateOpen(false)}>{t('users.cancel')}</button>
            <button
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-md hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-50 text-base"
              disabled={saving}
              onClick={() => {
                const form = document.getElementById('create-user-form') as HTMLFormElement | null;
                if (!form) return;
                const data = new FormData(form);
                const str = (v: FormDataEntryValue | null) => typeof v === 'string' ? v : '';
                const pwd = str(data.get('password'));
                const confirm = str(data.get('confirmPassword'));
                if (pwd !== confirm) {
                  alert(t('users.passwordsNoMatch'));
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
              {saving ? t('users.saving') : t('users.create')}
            </button>
          </div>
        }
      >
        <form id="create-user-form" className="space-y-6 px-1 pt-2 pb-1">
          <div className="grid grid-cols-2 gap-5">
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.username')}
              <input name="username" className="rounded-lg bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition" required autoFocus />
            </label>
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.email')}
              <input type="email" name="email" className="rounded-lg bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition" required />
            </label>
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.firstName')}
              <input name="firstName" className="rounded-lg bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition" required />
            </label>
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.lastName')}
              <input name="lastName" className="rounded-lg bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition" required />
            </label>
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.password')}
              <input type="password" name="password" className="rounded-lg bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition" required />
            </label>
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.confirmPassword')}
              <input type="password" name="confirmPassword" className="rounded-lg bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition" required />
            </label>
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.role')}
              <select
                name="role"
                className="rounded-xl bg-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition text-base font-semibold shadow-md border border-white/10 hover:border-yellow-300/60 focus:border-yellow-400/80 appearance-none"
                style={{ boxShadow: '0 4px 24px 0 rgba(234,179,8,0.08)' }}
              >
                {roles.map((r) => (
                  <option
                    key={r}
                    value={r}
                    className="text-gray-900 bg-gray-100 text-base font-semibold rounded-lg px-3 py-2 hover:bg-yellow-100 focus:bg-yellow-200 transition"
                  >
                    {t(`users.role_${r}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-200 flex flex-col gap-1">
              {t('users.language')}
              <select name="language" className="rounded-lg bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition">
                <option value="en" className="text-black">English</option>
                <option value="si" className="text-black">සිංහල</option>
              </select>
            </label>
          </div>
        </form>
      </FormModal>

      {/* Face Enrollment / Update Modal */}
      <FormModal
        isOpen={Boolean(enrollUser)}
        title={enrollUser ? (userHasFace(enrollUser) ? (t('users.updateFaceId') || 'Update Face ID') : (t('users.enrollFaceId') || 'Enroll Face ID')) : ''}
        onClose={() => setEnrollUser(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded bg-white/10" onClick={() => setEnrollUser(null)}>{t('users.cancel')}</button>
            <button
              className="px-3 py-2 rounded bg-indigo-500 text-white disabled:opacity-50"
              disabled={saving || !faceDetected}
              onClick={async () => {
                if (!enrollUser) return;
                setSaving(true);
                try {
                  const ok = await ensureModels();
                  if (!ok) throw new Error('Models not loaded');
                  const videoEl = (webcamRef.current?.video as HTMLVideoElement | undefined);
                  if (!videoEl) throw new Error('Camera not ready');
                  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
                  const result = await faceapi
                    .detectSingleFace(videoEl, options)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                  if (!result?.descriptor) {
                    toast.error(t('users.faceNotDetected') || 'No face detected');
                  } else {
                    const embedding = Array.from(result.descriptor).map(v => Number(Number(v).toFixed(6)));
                    await usersApi.setFaceEmbedding(enrollUser._id, embedding);
                    toast.success(t('users.faceSaved') || 'Face ID saved');
                    setEnrollUser(null);
                    fetchPage();
                  }
                } catch (e) {
                  const errMsg = (e && typeof e === 'object' && 'message' in e) ? (e as Error).message : undefined;
                  toast.error(errMsg || (t('users.faceSaveFailed') || 'Failed to save Face ID'));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? t('users.saving') : (t('users.saveFaceId') || 'Capture & Save')}
            </button>
          </div>
        }
      >
        {enrollUser && (
          <div className="space-y-4 flex flex-col items-center justify-center p-2">
            <div className="text-base font-medium text-center text-gray-200">
              {userHasFace(enrollUser)
                ? 'Update your Face ID for secure login.'
                : 'Enroll your Face ID for secure, passwordless login.'}
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-56 h-56 flex items-center justify-center rounded-full border-4 border-yellow-300 shadow-lg bg-black/60 overflow-hidden">
                <Webcam ref={(instance: unknown) => { webcamRef.current = instance as Webcam | null; }} audio={false} screenshotFormat="image/jpeg" className="w-full h-full object-cover" style={{ borderRadius: '50%' }} />
                {/* Animated detection ring */}
                <div className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-300 ${faceDetected ? 'border-4 border-emerald-400 shadow-[0_0_24px_4px_rgba(16,185,129,0.3)]' : 'border-4 border-white/20'}`}></div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm justify-center">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-semibold transition-all duration-300 ${faceDetected ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/70'}`}>
                {faceDetected ? 'Face detected!' : 'Center your face in the circle...'}
              </span>
            </div>
            <div className="text-xs text-gray-400 text-center mt-2">
              {faceDetected
                ? 'Face detected. Click "Capture & Save" to enroll.'
                : 'Make sure your face is well-lit and fully visible.'}
            </div>
          </div>
        )}
      </FormModal>

      {/* Edit User */}
      <FormModal
        isOpen={Boolean(editUser)}
  title={editUser ? t('users.editUserTitle', { username: editUser.username }) : t('users.edit')}
        onClose={() => setEditUser(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded bg-white/10" onClick={() => setEditUser(null)}>{t('users.cancel')}</button>
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
              {saving ? t('users.saving') : t('users.save')}
            </button>
          </div>
        }
      >
        {editUser && (
          <form id="edit-user-form" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">{t('users.firstName')}<input name="firstName" defaultValue={editUser.firstName} className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
              <label className="text-sm">{t('users.lastName')}<input name="lastName" defaultValue={editUser.lastName} className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
              <label className="text-sm">{t('users.email')}<input type="email" name="email" defaultValue={editUser.email} className="mt-1 w-full rounded bg-white/10 px-2 py-1" required /></label>
              <label className="text-sm" htmlFor="edit-language">{t('users.language')}</label>
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
      title={t('users.deleteDialogTitle')}
      description={deleteTarget ? t('users.deleteDialogDescription', { username: deleteTarget.username }) : ''}
      confirmLabel={t('users.deleteDialogConfirm')}
      tone="danger"
      loading={deleting}
      onClose={() => { if (!deleting) setDeleteTarget(null); }}
      onConfirm={confirmDelete}
    />
  </>
  );
}
