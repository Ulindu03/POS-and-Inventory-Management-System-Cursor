import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { settingsApi } from '@/lib/api/settings.api';
import { replaceSupabasePublicImage, deleteSupabasePublicImage } from '@/lib/supabase';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.get().then((res) => setSettings(res.data.data || res.data)).finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const { data } = await settingsApi.update(settings);
      setSettings(data.data || data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <button onClick={onSave} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20" disabled={saving}>Save</button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="font-semibold mb-2">Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              <div className="space-y-2">
                <div className="text-sm">Logo</div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                    {settings?.branding?.logoUrl ? (
                      <img src={settings.branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs opacity-70">No logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="px-3 py-2 rounded bg-white/10 cursor-pointer text-xs inline-block">
            <span>Upload Logo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const up = await replaceSupabasePublicImage(file, { folder: 'branding', oldUrl: settings?.branding?.logoUrl });
                          setSettings((s: any) => ({ ...s, branding: { ...(s?.branding || {}), logoUrl: up.url } }));
              setLogoMsg('Logo uploaded successfully');
              setTimeout(() => setLogoMsg(null), 2000);
                          if (e.currentTarget) e.currentTarget.value = '';
                        }} />
                    </label>
                    {settings?.branding?.logoUrl && (
                      <button
                        className="px-3 py-2 rounded bg-red-500/20 text-red-300 text-xs hover:bg-red-500/30"
                        onClick={async () => {
                          const url = settings.branding.logoUrl;
                          setSettings((s: any) => ({ ...s, branding: { ...(s?.branding || {}), logoUrl: '' } }));
              const res = await deleteSupabasePublicImage(url).catch(() => ({ success: false } as any));
              setLogoMsg(res && (res as any).success ? 'Logo removed' : 'Failed to remove logo');
              setTimeout(() => setLogoMsg(null), 2000);
                        }}
                      >Remove</button>
                    )}
                  </div>
                </div>
        {logoMsg && <div className="text-xs text-emerald-300">{logoMsg}</div>}
                <p className="text-xs opacity-70">Used in headers and receipts.</p>
              </div>
            </div>
          </section>
          <section>
            <h2 className="font-semibold mb-2">Stickers & Barcodes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <div className="text-sm mb-1">Default Barcode Mode</div>
                <select
                  className="w-full bg-white/10 rounded px-3 py-2"
                  value={settings?.stickers?.barcodeMode || 'reuse_product_barcode'}
                  onChange={(e) => setSettings({ ...settings, stickers: { ...(settings?.stickers || {}), barcodeMode: e.target.value } })}
                >
                  <option value="reuse_product_barcode">Reuse product barcode</option>
                  <option value="unique_per_unit">Unique per unit</option>
                </select>
              </label>
              <label className="block">
                <div className="text-sm mb-1">Default Label Size</div>
                <select
                  className="w-full bg-white/10 rounded px-3 py-2"
                  value={settings?.stickers?.defaultLabelSize || '50x25'}
                  onChange={(e) => setSettings({ ...settings, stickers: { ...(settings?.stickers || {}), defaultLabelSize: e.target.value } })}
                >
                  <option value="50x25">50 x 25 mm</option>
                  <option value="40x30">40 x 30 mm</option>
                </select>
              </label>
              <label className="block">
                <div className="text-sm mb-1">Default Media</div>
                <select
                  className="w-full bg-white/10 rounded px-3 py-2"
                  value={settings?.stickers?.defaultSheetType || 'roll'}
                  onChange={(e) => setSettings({ ...settings, stickers: { ...(settings?.stickers || {}), defaultSheetType: e.target.value } })}
                >
                  <option value="roll">Roll (continuous)</option>
                  <option value="a4">A4 sheet</option>
                </select>
              </label>
            </div>
          </section>
          <section>
            <h2 className="font-semibold mb-2">POS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(settings?.pos?.allowNegativeStock)} onChange={(e) => setSettings({ ...settings, pos: { ...settings.pos, allowNegativeStock: e.target.checked } })} />
                <span>Allow Negative Stock</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(settings?.pos?.printAfterSale)} onChange={(e) => setSettings({ ...settings, pos: { ...settings.pos, printAfterSale: e.target.checked } })} />
                <span>Print After Sale</span>
              </label>
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Receipt</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(settings?.receipt?.showLogo)} onChange={(e) => setSettings({ ...settings, receipt: { ...settings.receipt, showLogo: e.target.checked } })} />
                <span>Show Logo</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(settings?.receipt?.showBarcode)} onChange={(e) => setSettings({ ...settings, receipt: { ...settings.receipt, showBarcode: e.target.checked } })} />
                <span>Show Barcode</span>
              </label>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
