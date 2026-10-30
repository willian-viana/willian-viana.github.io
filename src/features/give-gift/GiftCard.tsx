import { Dialog } from 'radix-ui';
import type catalog from '../../entities/gift/catalog.json';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';

type Gift = Omit<(typeof catalog.items)[number], 'paymentUrl'> & { paymentUrl: string | null };
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function GiftCard({ gift }: { gift: Gift }) {
  const price = currency.format(gift.priceCents / 100);

  return (
    <article className="gift-card">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button className="gift-image" aria-label={`Ver detalhes: ${gift.name}`}>
            <img src={gift.photoUrl} alt={gift.name} loading="lazy" />
          </button>
        </Dialog.Trigger>
        <div className="gift-copy">
          <h3 title={gift.name}>{gift.name}</h3>
          <p className="gift-price">{price}</p>
          <div className="gift-action">
            <Dialog.Trigger asChild>
              <Button variant="secondary" aria-label={`Presentear: ${gift.name}`}>Presentear</Button>
            </Dialog.Trigger>
          </div>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="gift-dialog">
            <Dialog.Close className="dialog-close" aria-label="Fechar detalhes"><Icon name="close" /></Dialog.Close>
            <img className="dialog-image" src={gift.photoUrl} alt="" />
            <Dialog.Title>{gift.name}</Dialog.Title>
            <Dialog.Description>{gift.description || 'Um presente simbólico para fazer parte do nosso novo cantinho.'}</Dialog.Description>
            <p className="gift-price">{price}</p>
            <p>O presente é simbólico. O pagamento é feito em um serviço externo, diretamente para os anfitriões.</p>
            {gift.paymentUrl ? (
              <Button asChild><a href={gift.paymentUrl} target="_blank" rel="noopener noreferrer">Ir para pagamento <Icon name="arrow" /></a></Button>
            ) : <Button disabled>Link de pagamento em breve</Button>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </article>
  );
}
