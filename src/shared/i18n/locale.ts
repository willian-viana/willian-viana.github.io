export type Locale = 'pt' | 'en';
export const localePreferenceKey = 'brisinha.locale';

export function resolveLocale(pathname: string, preference: string | null, regionLocale: Locale = 'pt'): Locale {
  const explicit = pathname.match(/^\/(pt|en)\/?$/)?.[1];
  if (explicit === 'pt' || explicit === 'en') return explicit;
  if (preference === 'pt' || preference === 'en') return preference;
  return regionLocale;
}

export async function detectLocale(apiBaseUrl: string | undefined): Promise<Locale> {
  if (!apiBaseUrl) return 'pt';
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/locale`, {
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return 'pt';
    const result: unknown = await response.json();
    return result && typeof result === 'object' && 'locale' in result && result.locale === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

export function localePath(locale: Locale, hash = '') {
  return `/${locale}/${locale === 'en' && hash === '#presenca' ? '#inicio' : hash}`;
}
