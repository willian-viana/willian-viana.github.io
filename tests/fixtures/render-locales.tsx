import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from '../../src/pages/home/Home';
import { GiftCard } from '../../src/features/give-gift/GiftCard';
import { Form } from '../../src/features/respond/Form';
import { giftCatalog, giftPrice, type Gift } from '../../src/entities/gift/model';
import type { Locale } from '../../src/shared/i18n/locale';

export function renderPage(locale: Locale) { return renderToStaticMarkup(<Home locale={locale} />); }
export function renderCard(gift: Gift, locale: Locale) { return renderToStaticMarkup(<GiftCard gift={gift} locale={locale} />); }
export function renderForm(locale: Locale, rsvp: boolean) { return renderToStaticMarkup(<Form locale={locale} rsvp={rsvp} />); }
export { giftCatalog, giftPrice };
