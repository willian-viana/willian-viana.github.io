import React from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from '../pages/home/Home';
import { detectLocale, localePath, localePreferenceKey, resolveLocale } from '../shared/i18n/locale';
import './style.css';

async function start() {
  let preference: string | null = null;
  try { preference = localStorage.getItem(localePreferenceKey); } catch { /* Region detection still works without storage. */ }
  const hasChoice = /^\/(pt|en)\/?$/.test(location.pathname) || preference === 'pt' || preference === 'en';
  const regionLocale = hasChoice ? 'pt' : await detectLocale(import.meta.env.VITE_API_BASE_URL);
  const locale = resolveLocale(location.pathname, preference, regionLocale);
  document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';
  if (!/^\/(pt|en)\/$/.test(location.pathname)) {
    history.replaceState(null, '', localePath(locale) + location.search + location.hash);
  }
  createRoot(document.getElementById('root')!).render(<React.StrictMode><Home locale={locale} /></React.StrictMode>);
}

void start();
