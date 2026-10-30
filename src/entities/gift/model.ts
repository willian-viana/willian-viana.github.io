import catalog from './catalog.json';
import english from './catalog.en.json';
import type { Locale } from '../../shared/i18n/locale';

export interface Gift {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string;
  priceCents: number | null;
  paymentUrl: string | null;
}

export function giftCatalog(locale: Locale): Gift[] {
  if (locale === 'pt') return catalog.items;
  return english.map(item => ({ ...item, photoUrl: catalog.items.find(source => source.id === item.id)!.photoUrl }));
}

export function giftPrice(gift: Gift, locale: Locale) {
  if (gift.priceCents === null) return null;
  return new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    style: 'currency', currency: locale === 'pt' ? 'BRL' : 'USD',
  }).format(gift.priceCents / 100);
}
