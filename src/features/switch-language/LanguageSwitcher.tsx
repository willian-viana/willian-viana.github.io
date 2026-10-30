import { localePath, localePreferenceKey, type Locale } from '../../shared/i18n/locale';

export function LanguageSwitcher({ locale, hash = '' }: { locale: Locale; hash?: string }) {
  return <nav className="language-switcher" aria-label={locale === 'pt' ? 'Idioma' : 'Language'}>
    {(['pt', 'en'] as const).map(language => <a
      key={language} href={localePath(language, hash)}
      lang={language === 'pt' ? 'pt-BR' : 'en'} hrefLang={language === 'pt' ? 'pt-BR' : 'en'}
      aria-current={locale === language ? 'page' : undefined}
      onClick={() => { try { localStorage.setItem(localePreferenceKey, language); } catch { /* Preference storage may be unavailable. */ } }}
    >{language === 'pt' ? 'Português' : 'English'}</a>)}
  </nav>;
}
