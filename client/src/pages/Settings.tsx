// This file shows the Settings page.
// In simple English: It lets users view and change the POS system settings, like logo and preferences.
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { settingsApi } from '@/lib/api/settings.api';
import { replaceSupabasePublicImage, deleteSupabasePublicImage } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { proxyImage } from '@/lib/proxyImage';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => setSettings(res.data?.data || res.data || {}))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
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
    <AppLayout className="bg-[#242424]">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        </div>

        {loading ? (
          <div>{t('common.loading')}</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            className="space-y-8"
          >
              {/* Branding Section */}
              <section className="bg-white/5 rounded-xl shadow-sm p-6 border border-white/10 mb-2">
                <h2 className="font-semibold text-lg mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-icons text-xl align-middle" aria-hidden="true"></span>
                  {t('settings.branding')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
                      {settings?.branding?.logoUrl ? (
                        <img src={proxyImage(settings.branding.logoUrl)} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs opacity-70">{t('settings.logoNone')}</span>
                      )}
                    </div>
                    <label className="px-3 py-2 rounded bg-white/10 cursor-pointer text-xs inline-block mt-1">
                      <span>{t('settings.uploadLogo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const up = await replaceSupabasePublicImage(file, { folder: 'branding', oldUrl: settings?.branding?.logoUrl });
                          setSettings((s: any) => ({
                            ...s,
                            branding: { ...(s?.branding || {}), logoUrl: up.url },
                          }));
                          setLogoMsg(t('settings.logoUploaded'));
                          setTimeout(() => setLogoMsg(null), 2000);
                          if (e.currentTarget) e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    {settings?.branding?.logoUrl && (
                      <button
                        type="button"
                        className="px-3 py-2 rounded bg-red-500/20 text-red-300 text-xs hover:bg-red-500/30"
                        onClick={async () => {
                          const url = settings.branding.logoUrl;
                          setSettings((s: any) => ({
                            ...s,
                            branding: { ...(s?.branding || {}), logoUrl: '' },
                          }));
                          const res: any = await deleteSupabasePublicImage(url).catch(() => ({ success: false }));
                          setLogoMsg(res?.success ? t('settings.logoRemoved') : t('settings.logoRemoveFailed'));
                          setTimeout(() => setLogoMsg(null), 2000);
                        }}
                      >
                        {t('settings.logoRemoved')}
                      </button>
                    )}
                    {logoMsg && <div className="text-xs text-emerald-300">{logoMsg}</div>}
                    <p className="text-xs opacity-70 mt-1">{t('settings.usedIn')}</p>
                  </div>

                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <div className="text-sm font-medium mb-1">{t('settings.storeName')}</div>
                      <input
                        className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings?.branding?.storeName || ''}
                        onChange={(e) =>
                          setSettings((prev: any) => ({
                            ...prev,
                            branding: { ...(prev?.branding || {}), storeName: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="text-sm font-medium mb-1">{t('settings.storePhone')}</div>
                      <input
                        className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings?.branding?.storePhone || ''}
                        onChange={(e) =>
                          setSettings((prev: any) => ({
                            ...prev,
                            branding: { ...(prev?.branding || {}), storePhone: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <div className="text-sm font-medium mb-1">{t('settings.storeAddress')}</div>
                      <textarea
                        className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings?.branding?.storeAddress || ''}
                        onChange={(e) =>
                          setSettings((prev: any) => ({
                            ...prev,
                            branding: { ...(prev?.branding || {}), storeAddress: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <div className="text-sm font-medium mb-1">{t('settings.storeEmail')}</div>
                      <input
                        className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings?.branding?.storeEmail || ''}
                        onChange={(e) =>
                          setSettings((prev: any) => ({
                            ...prev,
                            branding: { ...(prev?.branding || {}), storeEmail: e.target.value },
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* Stickers & Barcodes Section */}
              <section className="bg-white/5 rounded-xl shadow-sm p-6 border border-white/10 mb-2">
                <h2 className="font-semibold text-lg mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-icons text-xl align-middle" aria-hidden="true"></span>
                  {t('settings.stickersBarcodes')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="block">
                    <div className="text-sm font-medium mb-1">{t('settings.defaultBarcodeMode')}</div>
                    <select
                      className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings?.stickers?.defaultBarcodeMode || ''}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          stickers: { ...(prev?.stickers || {}), defaultBarcodeMode: e.target.value },
                        }))
                      }
                    >
                      <option value="reuse">{t('settings.barcodeMode_reuse')}</option>
                      <option value="generate">{t('settings.barcodeMode_unique')}</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium mb-1">{t('settings.defaultLabelSize')}</div>
                    <select
                      className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings?.stickers?.defaultLabelSize || ''}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          stickers: { ...(prev?.stickers || {}), defaultLabelSize: e.target.value },
                        }))
                      }
                    >
                      <option value="50x25">50 x 25 mm</option>
                      <option value="40x20">40 x 20 mm</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium mb-1">{t('settings.defaultMedia')}</div>
                    <select
                      className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings?.stickers?.defaultMedia || ''}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          stickers: { ...(prev?.stickers || {}), defaultMedia: e.target.value },
                        }))
                      }
                    >
                      <option value="roll">{t('settings.media_roll')}</option>
                      <option value="a4">{t('settings.media_a4')}</option>
                    </select>
                  </label>
                </div>
              </section>

              {/* POS Section */}
              <section className="bg-white/5 rounded-xl shadow-sm p-6 border border-white/10 mb-2">
                <h2 className="font-semibold text-lg mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-icons text-xl align-middle" aria-hidden="true"></span>
                  POS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.pos?.allowNegativeStock)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          pos: { ...(prev?.pos || {}), allowNegativeStock: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.allowNegativeStock')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.pos?.quickCheckoutMode)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          pos: { ...(prev?.pos || {}), quickCheckoutMode: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.quickCheckoutMode')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.pos?.allowDiscounts)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          pos: { ...(prev?.pos || {}), allowDiscounts: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.allowDiscounts')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.pos?.printAfterSale)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          pos: { ...(prev?.pos || {}), printAfterSale: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.printAfterSale')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.pos?.autoDeductStock)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          pos: { ...(prev?.pos || {}), autoDeductStock: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.autoDeductStock')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.pos?.requireCustomer)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          pos: { ...(prev?.pos || {}), requireCustomer: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.requireCustomer')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.pos?.allowReturns)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          pos: { ...(prev?.pos || {}), allowReturns: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.allowReturns')}</span>
                  </label>
                </div>
              </section>

              {/* Receipt Section */}
              <section className="bg-white/5 rounded-xl shadow-sm p-6 border border-white/10 mb-2">
                <h2 className="font-semibold text-lg mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-icons text-xl align-middle" aria-hidden="true"></span>
                  {t('settings.receipt')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.receipt?.showLogo)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), showLogo: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.showLogo')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.receipt?.showBarcode)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), showBarcode: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.showBarcode')}</span>
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium mb-1">{t('settings.paperSize')}</div>
                    <select
                      className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings?.receipt?.paperSize || '80mm'}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), paperSize: e.target.value },
                        }))
                      }
                    >
                      <option value="58mm">58mm</option>
                      <option value="80mm">80mm</option>
                      <option value="a4">A4</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.receipt?.includeCashierName) !== false}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), includeCashierName: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.includeCashierName')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.receipt?.includeSku)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), includeSku: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.includeSku')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.receipt?.includeTaxBreakdown)}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), includeTaxBreakdown: e.target.checked },
                        }))
                      }
                    />
                    <span>{t('settings.includeTaxBreakdown')}</span>
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium mb-1">{t('settings.fontSize')}</div>
                    <select
                      className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings?.receipt?.fontSize || 'medium'}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), fontSize: e.target.value },
                        }))
                      }
                    >
                      <option value="small">{t('settings.fontSize_small')}</option>
                      <option value="medium">{t('settings.fontSize_medium')}</option>
                      <option value="large">{t('settings.fontSize_large')}</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium mb-1">{t('settings.printMode')}</div>
                    <select
                      className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings?.receipt?.printMode || 'auto'}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: { ...(prev?.receipt || {}), printMode: e.target.value },
                        }))
                      }
                    >
                      <option value="auto">{t('settings.printMode_auto')}</option>
                      <option value="ask">{t('settings.printMode_ask')}</option>
                      <option value="no-auto">{t('settings.printMode_noauto')}</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium mb-1">{t('settings.numCopies')}</div>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="w-full bg-white/10 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings?.receipt?.numCopies || 1}
                      onChange={(e) =>
                        setSettings((prev: any) => ({
                          ...prev,
                          receipt: {
                            ...(prev?.receipt || {}),
                            numCopies: Math.max(1, Math.min(10, Number(e.target.value))),
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </section>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  className="btn btn-primary px-10 py-2 text-lg rounded-lg shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                  {t('settings.save')}
                </button>
              </div>
            </form>
          )}
        </div>
      </AppLayout>
    );
}
