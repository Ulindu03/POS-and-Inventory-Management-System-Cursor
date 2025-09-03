import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

export function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export async function uploadToSupabase(params: {
  path: string;
  filename: string;
  contentType?: string;
}) {
  const client = getSupabase();
  if (!client) return { url: null as string | null, error: 'Supabase not configured' };
  const fileBuffer = await (await import('fs')).promises.readFile(params.path);
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).upload(params.filename, fileBuffer, {
    contentType: params.contentType || 'application/octet-stream',
    upsert: true,
  });
  if (error) return { url: null, error: error.message };
  const { data: pub } = client.storage.from(SUPABASE_BUCKET).getPublicUrl(data.path);
  return { url: pub.publicUrl, error: null };
}
