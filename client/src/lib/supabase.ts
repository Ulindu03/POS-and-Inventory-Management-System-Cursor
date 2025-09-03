import { createClient } from '@supabase/supabase-js';

// Prefer env vars, fall back to provided values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xuhaikzzwmuxmfnxbyin.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aGFpa3p6d211eG1mbnhieWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTMxNjEsImV4cCI6MjA3MTk2OTE2MX0.1npfWI10jdp4-Qw_xp2Z6qLqjMu5R8e42fHJNPt4a0w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function uploadToSupabaseImages(
  file: File,
  opts?: { folder?: string }
): Promise<{ path: string; url: string }> {
  const folder = (opts?.folder || 'products').replace(/[^a-zA-Z0-9/_-]/g, '_');
  const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const key = `${folder}/${base}-${unique}${ext}`;

  const { error } = await supabase.storage.from('Images').upload(key, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('Images').getPublicUrl(key);
  return { path: key, url: data.publicUrl };
}

// Utility: derive the storage path from a public URL in the Images bucket
export function getImagesPathFromPublicUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = '/storage/v1/object/public/Images/';
    const idx = u.pathname.indexOf('/storage/v1/object/public/Images/');
    if (idx === -1) return null;
    const path = u.pathname.substring(idx + marker.length);
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

// Utility: delete an object in Images bucket given a public URL
export async function deleteSupabasePublicImage(publicUrl: string): Promise<{ success: boolean; error?: string }> {
  const path = getImagesPathFromPublicUrl(publicUrl);
  if (!path) return { success: false, error: 'Not a Supabase Images URL' };
  const { error } = await supabase.storage.from('Images').remove([path]);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Utility: replace an existing public image (delete old if provided, then upload new)
export async function replaceSupabasePublicImage(
  newFile: File,
  opts?: { folder?: string; oldUrl?: string }
): Promise<{ path: string; url: string }> {
  if (opts?.oldUrl) {
    // best-effort delete; non-blocking failure
    try { await deleteSupabasePublicImage(opts.oldUrl); } catch { /* ignore */ }
  }
  return uploadToSupabaseImages(newFile, { folder: opts?.folder });
}
