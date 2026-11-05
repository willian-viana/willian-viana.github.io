import { giftCatalog, giftPrice } from '../../entities/gift/model';
import { GiftPayments } from '../../features/give-gift/GiftPayments';
import { Button } from '../../shared/ui/button';

export function Payment({ giftId }: { giftId: string | null }) {
  const gift = giftCatalog('pt').find(item => item.id === giftId);
  return <main className="payment-page">
    <p>República da Brisinha</p>
    <h1>Pagamento do presente</h1>
    {gift?.paymentUrl && gift.priceCents !== null ? <>
      <h2>{gift.name}</h2>
      <p className="gift-price">{giftPrice(gift, 'pt')}</p>
      <GiftPayments gift={gift} locale="pt" />
    </> : <p>Presente indisponível. Volte à lista para escolher um presente.</p>}
    <Button asChild variant="secondary"><a href={`${import.meta.env.BASE_URL}pt/#presentes`}>Voltar à lista de presentes</a></Button>
  </main>;
}
