import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Load persisted language (if any) before init
const persistedLng = ((): string | null => {
  try { return localStorage.getItem('app_language'); } catch { return null; }
})();

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'si'],
    debug: false,
  // Force explicit default to English when no persisted choice
  lng: persistedLng || 'en',
    react: { useSuspense: false },
    
    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
  });

// Persist and reflect language changes
i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem('app_language', lng); } catch {}
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

// Set initial html lang
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
}

export default i18n;