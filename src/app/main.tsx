import React from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from '../pages/home/Home';
import { localePath, localePreferenceKey, resolveLocale } from '../shared/i18n/locale';
import './style.css';

let preference: string | null = null;
try { preference = localStorage.getItem(localePreferenceKey); } catch { /* Browser language still works without storage. */ }
const locale = resolveLocale(location.pathname, preference, navigator.languages);
document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';
if (!/^\/(pt|en)\/$/.test(location.pathname)) {
  history.replaceState(null, '', localePath(locale) + location.search + location.hash);
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Home locale={locale} /></React.StrictMode>);
