// This file shows the Users page.
// In simple English: It lets admins manage user accounts, roles, and permissions in the POS system.
import { useEffect, useMemo, useState, useRef } from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import LanguageSelect from '@/components/ui/LanguageSelect';
import { AppLayout } from '@/components/common/Layout/Layout';
import { usersApi, type UserInput } from '@/lib/api/users.api';
import { useRealtime } from '@/hooks/useRealtime';
import FormModal from '@/components/ui/FormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
// ChevronDown already imported above
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { RoleSelect } from '@/components/ui/RoleSelect';

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
}

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [enrollUser, setEnrollUser] = useState<AdminUser | null>(null);
  const webcamRef = useRef<Webcam | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const scanTimer = useRef<number | null>(null);

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

  const roles = useMemo(() => ['store_owner', 'cashier', 'sales_rep'] as const, []);

  useEffect(() => {
    const loadModels = async () => {
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
      } catch (e) {
        try {
          await tryLoad('https://justadudewhohacks.github.io/face-api.js/models');
          setModelsLoaded(true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Face models failed to load from both /models and CDN');
        }
      }
    };
    loadModels();
  }, []);

  const ensureModels = async () => {
    if (modelsLoaded) return true;
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      ]);
      setModelsLoaded(true);
      return true;
    } catch {
      try {
        const root = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(root),
          faceapi.nets.faceRecognitionNet.loadFromUri(root),
          faceapi.nets.faceLandmark68Net.loadFromUri(root),
        ]);
        setModelsLoaded(true);
        return true;
      } catch (e) {
        toast.error('Face models not available');
        return false;
      }
    }
  };

  // Start/stop a lightweight recognition loop when modal is open
  useEffect(() => {
    const startScan = () => {
      if (scanTimer.current) return;
      setIsScanning(true);
      setFaceDetected(false);
      const tick = async () => {
        const videoEl = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
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

  const [enrollAfterCreate, setEnrollAfterCreate] = useState(false);

  const handleCreate = async (data: UserInput) => {
    setSaving(true);
    try {
      const res = await usersApi.create(data);
      const created = res?.data?.data || res?.data; // try common API envelope patterns
      setCreateOpen(false);
      fetchPage();
      if (enrollAfterCreate) {
        // Find the created user in refreshed list (fallback to response data if available)
        // Delay slightly to allow fetchPage state update
        setTimeout(() => {
          setEnrollUser((prev) => {
            if (created && created._id) return created as AdminUser;
            const found = users.find(u => u.username === data.username || u.email === data.email);
            return found || prev;
          });
        }, 400);
      }
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

  // Helper to determine if a user has enrolled face data (heuristic until backend finalizes field)
  const userHasFace = (u: AdminUser | any) => !!(u?.hasFace || u?.faceEnrolled || Array.isArray(u?.faceEmbedding));

  // Create form enhancements state
  const [pwdState, setPwdState] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [emailCheck, setEmailCheck] = useState<{valid:boolean; message:string}|null>(null);
  const [usernameCheck, setUsernameCheck] = useState<{value:string; status:'ok'|'error'; message:string}>({value:'', status:'ok', message:''});

  const validateEmail = (value:string) => {
    if (!value) return null;
    const ok = /.+@.+\..+/.test(value);
    return { valid: ok, message: ok? 'Email looks good' : 'Invalid email format'};
  };
  const validateUsername = (value:string) => {
    if (!value) return { status:'error', message:'Required'} as const;
    if (value.length < 3) return { status:'error', message:'Too short'} as const;
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) return { status:'error', message:'Only letters, numbers, . _ -'} as const;
    return { status:'ok', message:'Available (simulated)'} as const; // TODO: hook backend availability
  };

  const PasswordStrengthBar = ({ password }: { password:string }) => {
    if (!password) return null;
    // Simple scoring: length, variety
    const lengthScore = Math.min(password.length / 12, 1);
    const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].reduce((acc,r)=> acc + (r.test(password)?1:0),0)/4;
    const score = (lengthScore*0.6 + variety*0.4);
    const pct = Math.round(score*100);
    const color = pct>80? 'bg-emerald-500': pct>55? 'bg-amber-400': 'bg-rose-500';
    const label = pct>80? 'Strong' : pct>55? 'Medium' : 'Weak';
    return (
      <div className="mt-2">
        <div className="h-1.5 w-full bg-white/10 rounded overflow-hidden">
          <div className={`h-full ${color} transition-all duration-300`} style={{width: pct+'%'}} />
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wide flex justify-between text-gray-400">
          <span>Password strength: {label}</span>
          <span>{pct}%</span>
        </div>
      </div>
    );
  };

  const [showMissingOnly, setShowMissingOnly] = useState(false); // theme toggle removed
  type FaceSort = 'none' | 'enrolled' | 'missing';
  const [faceSort, setFaceSort] = useState<FaceSort>('none');
  const cycleFaceSort = () => {
    setFaceSort(prev => prev === 'none' ? 'enrolled' : prev === 'enrolled' ? 'missing' : 'none');
  };
  const filtered = showMissingOnly ? users.filter(u => !userHasFace(u)) : users;
  const sorted = [...filtered].sort((a,b) => {
    if (faceSort === 'none') return 0;
    const aHas = userHasFace(a);
    const bHas = userHasFace(b);
    if (aHas === bHas) return 0;
    if (faceSort === 'enrolled') return aHas ? -1 : 1; // enrolled first
    if (faceSort === 'missing') return aHas ? 1 : -1; // missing first
    return 0;
  });
  const visibleUsers = sorted;

  return (
    <>
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">{t('users.title')}</h1>
            <p className="text-gray-400">{t('users.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Theme toggle removed */}
            <label className="flex items-center gap-2 text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer">
              <input type="checkbox" className="accent-amber-400" checked={showMissingOnly} onChange={(e)=>setShowMissingOnly(e.target.checked)} />
              <span className="opacity-80">Show missing Face ID</span>
            </label>
            <button
              className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-yellow-300 to-amber-300 text-black hover:shadow-[0_6px_24px_-6px_rgba(234,179,8,0.6)]"
              onClick={() => setCreateOpen(true)}
            >
              {t('users.addUser')}
            </button>
          </div>
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
                <th className="py-3 pr-4 sticky top-0 bg-white/5">
                  <button
                    type="button"
                    onClick={cycleFaceSort}
                    className="flex items-center gap-1 group text-left"
                    title={faceSort === 'none' ? 'Click to sort: enrolled first' : faceSort === 'enrolled' ? 'Click to sort: missing first' : 'Click to clear sorting'}
                  >
                    <span>Face ID</span>
                    <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">
                      {faceSort === 'none' && '↕'}
                      {faceSort === 'enrolled' && '✓'}
                      {faceSort === 'missing' && '✕'}
                    </span>
                  </button>
                </th>
                <th className="py-3 pr-4 sticky top-0 bg-white/5" aria-label="Actions">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u._id} className="border-t border-white/10 hover:bg-white/10 transition-colors">
                  <td className="py-2 pl-4 pr-4">{u.username}</td>
                  <td className="py-2 pr-4">{u.firstName} {u.lastName}</td>
                  <td className="py-2 pr-4 break-words">{u.email}</td>
                  <td className="py-2 pr-4">
                    <RoleSelect value={u.role as any} onChange={(role) => changeRole(u, role as any)} />
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
                  <td className="py-2 pr-4" title={userHasFace(u) ? 'Face embedding stored for this user' : 'No face embedding enrolled yet'}>
                    {userHasFace(u) ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300 text-xs font-medium">
                        <span className="w-4 h-4 inline-flex items-center justify-center rounded bg-emerald-500/20 border border-emerald-400/40 text-[10px]">✓</span>
                        Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-300 text-xs font-medium">
                        <span className="w-4 h-4 inline-flex items-center justify-center rounded bg-rose-500/20 border border-rose-400/40 text-[11px]">✕</span>
                        Not Enrolled
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs" onClick={() => setEditUser(u)}>{t('users.edit')}</button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs border border-amber-300/30"
                        title={userHasFace(u) ? 'Update existing face embedding' : 'Capture a new face embedding'}
                        onClick={async () => { const ok = await ensureModels(); if (ok) setEnrollUser(u); }}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 w-full">
            <div className="flex-1 hidden sm:block text-xs text-gray-400">
              {saving ? 'Creating user and preparing Face ID option…' : 'Passwords are stored securely. You can enroll Face ID after creation.'}
            </div>
            <button
              className="px-4 py-2 rounded-lg bg-white/8 hover:bg-white/15 text-sm font-medium text-gray-300 border border-white/10 transition-colors"
              onClick={() => setCreateOpen(false)}
              type="button"
            >{t('users.cancel')}</button>
            <button
              className="relative px-5 py-2 rounded-lg font-semibold text-sm text-black disabled:opacity-50 overflow-hidden group shadow-[0_4px_18px_-4px_rgba(255,225,0,0.45)]"
              style={{ background: 'linear-gradient(135deg,#FFE100 0%,#FFD100 50%,#FFC400 100%)' }}
              disabled={saving}
              onClick={() => {
                const form = document.getElementById('create-user-form') as HTMLFormElement | null;
                if (!form) return;
                const data = new FormData(form);
                const str = (v: FormDataEntryValue | null) => typeof v === 'string' ? v : '';
                const pwd = str(data.get('password'));
                const confirm = str(data.get('confirmPassword'));
                if (pwd !== confirm) { alert(t('users.passwordsNoMatch')); return; }
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
              <span className="relative z-10">{saving ? t('users.saving') : t('users.create')}</span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-white/40 via-transparent to-white/30" />
            </button>
          </div>
        }
      >
        <form id="create-user-form" className="space-y-5">
          {saving && (
            <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-md">
              <div className="h-full w-full animate-[progress_1.2s_linear_infinite] bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500" style={{backgroundSize:'200% 100%'}} />
            </div>
          )}
          <style>{`@keyframes progress{0%{transform:translateX(-50%)}100%{transform:translateX(50%)}}`}</style>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.username')}</label>
              <input name="username" onChange={(e)=> { const v = e.target.value; const vRes = validateUsername(v); setUsernameCheck({ value: v, status: vRes.status, message: vRes.message }); }} className="mt-2 w-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 border border-white/10 placeholder-gray-500" placeholder="e.g. johndoe" required />
              {usernameCheck.value && (
                <p className={`mt-1 text-xs ${usernameCheck.status==='ok'?'text-emerald-400':'text-rose-400'}`}>{usernameCheck.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.email')}</label>
              <input type="email" name="email" onChange={(e)=> setEmailCheck(validateEmail(e.target.value))} className="mt-2 w-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 border border-white/10 placeholder-gray-500" placeholder="name@example.com" required />
              {emailCheck && (
                <p className={`mt-1 text-xs ${emailCheck.valid?'text-emerald-400':'text-rose-400'}`}>{emailCheck.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.firstName')}</label>
              <input name="firstName" className="mt-2 w-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 border border-white/10" required />
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.lastName')}</label>
              <input name="lastName" className="mt-2 w-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 border border-white/10" required />
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.password')}</label>
              <div className="relative group mt-2">
                <input type={showPwd? 'text':'password'} name="password" onChange={(e)=> setPwdState(e.target.value)} className="w-full pr-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 border border-white/10" required />
                <button
                  type="button"
                  onClick={()=>setShowPwd(p=>!p)}
                  aria-label={showPwd? 'Hide password':'Show password'}
                  className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-md text-gray-600 hover:text-black focus:outline-none focus:ring-2 focus:ring-amber-300 transition-colors"
                  style={{ background:'#F5F5F5', border:'1px solid #E2E2E2', boxShadow:'0 1px 2px rgba(0,0,0,0.06)' }}
                >
                  {showPwd? <EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
              <PasswordStrengthBar password={pwdState} />
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.confirmPassword')}</label>
              <div className="mt-2">
                <input type={showPwd? 'text':'password'} name="confirmPassword" className="w-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 border border-white/10" required />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.role')}</label>
              <div className="mt-2">
                <RoleSelect value={(document.getElementById('role-hidden') as HTMLInputElement | null)?.value as any || 'store_owner'} onChange={(val)=>{ const hidden = document.getElementById('role-hidden') as HTMLInputElement | null; if(hidden) hidden.value = val; }} />
                <input id="role-hidden" type="hidden" name="role" defaultValue="store_owner" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide text-gray-300 uppercase">{t('users.language')}</label>
              <div className="mt-2">
                <LanguageSelect value={(document.getElementById('lang-hidden') as HTMLInputElement | null)?.value as any || 'en'} onChange={(val)=> { const hidden = document.getElementById('lang-hidden') as HTMLInputElement | null; if(hidden) hidden.value = val; }} />
                <input id="lang-hidden" type="hidden" name="language" defaultValue="en" />
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer group">
              <input type="checkbox" className="accent-amber-400 h-4 w-4 rounded" checked={enrollAfterCreate} onChange={(e) => setEnrollAfterCreate(e.target.checked)} />
              <span className="group-hover:text-white transition-colors">Enroll Face ID after creation (optional)</span>
            </label>
            {!modelsLoaded && (
              <p className="text-xs text-amber-300/80">Face models still loading; enrollment will open automatically once ready.</p>
            )}
          </div>
        </form>
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
              <div className="col-span-2">
                <label className="text-sm font-medium" htmlFor="edit-language">{t('users.language')}</label>
                <div className="mt-1">
                  <LanguageSelect value={(document.getElementById('edit-lang-hidden') as HTMLInputElement | null)?.value as any || (editUser.language || 'en')} onChange={(val)=> { const hidden = document.getElementById('edit-lang-hidden') as HTMLInputElement | null; if(hidden) hidden.value = val; }} />
                  <input id="edit-lang-hidden" type="hidden" name="language" defaultValue={editUser.language || 'en'} />
                </div>
              </div>
            </div>
          </form>
        )}
      </FormModal>
  </AppLayout>
    {/* Face ID Enrollment Modal */}
    {enrollUser && (
      <FormModal
        isOpen={true}
        title={`Enroll Face ID — ${enrollUser.username}`}
        onClose={() => setEnrollUser(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded bg-white/10" onClick={() => setEnrollUser(null)}>Cancel</button>
            <button
              className="px-3 py-2 rounded bg-indigo-500 text-white disabled:opacity-50"
              disabled={!modelsLoaded || saving || !faceDetected}
              onClick={async () => {
                const videoEl = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
                if (!videoEl) return;
                setSaving(true);
                try {
                  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 192, scoreThreshold: 0.5 });
                  const det = await faceapi
                    .detectSingleFace(videoEl, options)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                  if (!det) {
                    toast.error('No face detected');
                    return;
                  }
                  const embedding = Array.from(det.descriptor as Float32Array).map((x) => Number(Number(x).toFixed(6)));
                  await usersApi.setFaceEmbedding(enrollUser._id, embedding);
                  toast.success('Face ID saved');
                  setEnrollUser(null);
                  fetchPage();
                } catch (e:any) {
                  console.error(e);
                  toast.error(e?.response?.data?.message || 'Failed to save Face ID');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Saving...' : 'Save Face ID'}
            </button>
          </div>
        }
      >
        <div className="rounded-xl overflow-hidden relative" style={{ background: '#000' }}>
          <Webcam ref={webcamRef as any} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: 'user' }} style={{ width: '100%', height: 'auto' }} />
          {isScanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Outer soft glow */}
              <div className="absolute w-80 h-80 rounded-full blur-2xl" style={{ boxShadow: faceDetected ? '0 0 60px rgba(16,185,129,0.35)' : '0 0 60px rgba(251,191,36,0.25)' }} />
              {/* Animated concentric rings */}
              <div className={`relative w-72 h-72 rounded-full ${faceDetected ? 'ring-8 ring-emerald-400/80' : 'ring-8 ring-amber-300/70'} shadow-[0_0_30px_rgba(0,0,0,0.35)]`}>
                {!faceDetected && (
                  <div className="absolute inset-0 rounded-full ring-4 ring-amber-200/40 animate-ping" />
                )}
                <div className={`absolute inset-6 rounded-full ${faceDetected ? 'ring-2 ring-emerald-300/70' : 'ring-2 ring-amber-200/50'}`} />
                <div className={`absolute inset-12 rounded-full ${faceDetected ? 'ring-2 ring-emerald-200/50' : 'ring-2 ring-amber-100/40'}`} />
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 text-xs px-3 py-2 bg-gradient-to-t from-black/70 to-black/0 backdrop-blur-sm">
            {faceDetected ? (
              <span className="text-emerald-300 font-medium">Face detected ✓ — Press \"Save Face ID\" to store</span>
            ) : (
              <span className="text-gray-100">Recognizing... Center your face and ensure even lighting.</span>
            )}
          </div>
        </div>
      </FormModal>
    )}
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
