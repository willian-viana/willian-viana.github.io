export type Locale = 'pt' | 'en';
export const localePreferenceKey = 'brisinha.locale';

export function resolveLocale(pathname: string, preference: string | null, languages: readonly string[]): Locale {
  const explicit = pathname.match(/^\/(pt|en)\/?$/)?.[1];
  if (explicit === 'pt' || explicit === 'en') return explicit;
  if (preference === 'pt' || preference === 'en') return preference;
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'pt' || base === 'en') return base;
  }
  return 'en';
}

export function localePath(locale: Locale, hash = '') {
  return `/${locale}/${locale === 'en' && hash === '#presenca' ? '#inicio' : hash}`;
}
