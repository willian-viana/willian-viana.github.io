import { Dialog } from 'radix-ui';
import { giftPrice, type Gift } from '../../entities/gift/model';
import { copy } from '../../shared/i18n/copy';
import type { Locale } from '../../shared/i18n/locale';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';

export function GiftCard({ gift, locale = 'pt' }: { gift: Gift; locale?: Locale }) {
  const c = copy[locale];
  const price = giftPrice(gift, locale) ?? c.pricePending;

  return (
    <article className="gift-card">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button className="gift-image" aria-label={`${c.details}: ${gift.name}`}>
            <img src={gift.photoUrl} alt={gift.name} loading="lazy" />
          </button>
        </Dialog.Trigger>
        <div className="gift-copy">
          <h3 title={gift.name}>{gift.name}</h3>
          <p className="gift-price">{price}</p>
          <div className="gift-action">
            <Dialog.Trigger asChild>
              <Button variant="secondary" aria-label={`${c.give}: ${gift.name}`}>{c.give}</Button>
            </Dialog.Trigger>
          </div>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="gift-dialog">
            <Dialog.Close className="dialog-close" aria-label={c.close}><Icon name="close" /></Dialog.Close>
            <img className="dialog-image" src={gift.photoUrl} alt="" />
            <Dialog.Title>{gift.name}</Dialog.Title>
            <Dialog.Description>{gift.description || c.giftDescription}</Dialog.Description>
            <p className="gift-price">{price}</p>
            <p>{c.paymentNote}</p>
            {gift.paymentUrl && gift.priceCents !== null ? (
              <Button asChild><a href={gift.paymentUrl} target="_blank" rel="noopener noreferrer">{c.pay} <Icon name="arrow" /></a></Button>
            ) : <Button disabled>{gift.priceCents === null ? c.pricePending : c.paymentPending}</Button>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </article>
  );
}
