import React from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from '../pages/home/Home';
import { Payment } from '../pages/payment/Payment';
import { detectLocale, localePath, resolveLocale } from '../shared/i18n/locale';
import './style.css';

async function start() {
  if (location.pathname.replace(/\/$/, '') === `${import.meta.env.BASE_URL}pt/pagamento`) {
    document.documentElement.lang = 'pt-BR';
    document.title = 'Pagamento | República da Brisinha';
    createRoot(document.getElementById('root')!).render(<React.StrictMode><Payment giftId={new URLSearchParams(location.search).get('presente')} /></React.StrictMode>);
    return;
  }
  const hasExplicitLocale = /^\/(pt|en)\/?$/.test(location.pathname);
  const regionLocale = hasExplicitLocale ? 'pt' : await detectLocale(import.meta.env.VITE_API_BASE_URL);
  const locale = resolveLocale(location.pathname, regionLocale);
  document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';
  if (!/^\/(pt|en)\/$/.test(location.pathname)) {
    history.replaceState(null, '', localePath(locale) + location.search + location.hash);
  }
  createRoot(document.getElementById('root')!).render(<React.StrictMode><Home locale={locale} /></React.StrictMode>);
}

void start();
