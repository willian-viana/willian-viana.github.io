import { useState } from 'react';
import { giftCatalog, giftPrice } from '../../entities/gift/model';
import { copy } from '../../shared/i18n/copy';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';

export function Payment({ giftId }: { giftId: string | null }) {
  const gift = giftCatalog('pt').find(item => item.id === giftId);
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copyLink() {
    if (!gift?.paymentUrl) return;
    setStatus('idle');
    try {
      await navigator.clipboard.writeText(gift.paymentUrl);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  return <main className="payment-page gift-payments">
    <p>República da Brisinha</p>
    <h1>Pagamento do presente</h1>
    {gift?.paymentUrl && gift.priceCents !== null ? <>
      <h2>{gift.name}</h2>
      <p className="gift-price">{giftPrice(gift, 'pt')}</p>
      <p>Toque em “Continuar no Mercado Pago” para abrir o pagamento nesta aba.</p>
      {/* A user click after this page loads starts a separate navigation; an automatic redirect may remain in Chrome's initial app-handoff chain. */}
      <Button asChild><a href={gift.paymentUrl} target="_self" rel="noopener noreferrer">Continuar no Mercado Pago <Icon name="arrow" /></a></Button>
      <p>{copy.pt.paymentDisclaimer}</p>
      <p className="payment-detail">{gift.paymentUrl}</p>
      <Button type="button" variant="outline" onClick={copyLink}>{status === 'copied' ? 'Link copiado!' : 'Copiar link sem abrir'} <Icon name="copy" /></Button>
      <p role="status">{status === 'copied' ? 'Link copiado. Cole na barra de endereços de uma nova aba do navegador.' : status === 'error' ? 'Não foi possível copiar automaticamente. Selecione e copie o link acima.' : ''}</p>
    </> : <p>Presente indisponível. Volte à lista para escolher um presente.</p>}
    <Button asChild variant="secondary"><a href={`${import.meta.env.BASE_URL}pt/#presentes`}>Voltar à lista de presentes</a></Button>
  </main>;
}
