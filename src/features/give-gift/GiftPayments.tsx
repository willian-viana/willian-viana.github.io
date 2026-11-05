import { useState } from 'react';
import type { Gift } from '../../entities/gift/model';
import type { Locale } from '../../shared/i18n/locale';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import { copy } from '../../shared/i18n/copy';

const internationalMethods = [
  {
    id: 'paypal', name: 'PayPal',
    description: "Copy our PayPal email, then open PayPal to send any amount you'd like.",
    url: 'https://www.paypal.com/myaccount/transfer/send',
    value: 'willian.batista.viana@gmail.com', copyLabel: 'Copy email',
  },
  {
    id: 'wise', name: 'Wise',
    description: 'Use our Wisetag to send any amount.',
    url: 'https://wise.com/pay/me/willianb67',
    value: '@willianb67', copyLabel: 'Copy Wisetag',
  },
];

const labels = {
  en: {
    title: "Choose how you'd like to contribute", amount: 'Amount of your choice',
    open: 'Open', copied: 'Copied!', success: 'details copied.',
    error: "Couldn't copy automatically. Please select and copy the details above.",
  },
  pt: {
    title: 'Escolha como você quer contribuir', amount: 'Valor à sua escolha',
    open: 'Abrir', copied: 'Copiado!', success: '— dados copiados.',
    error: 'Não foi possível copiar automaticamente. Selecione e copie os dados acima.',
  },
};

export function GiftPayments({ gift, locale }: { gift: Gift; locale: Locale }) {
  const c = labels[locale];
  const methods = locale === 'en' ? internationalMethods : [
    ...(gift.paymentUrl && gift.priceCents !== null ? [{
      id: 'mercado-pago', name: 'Mercado Pago',
      description: copy.pt.paymentDisclaimer,
      url: gift.paymentUrl, value: gift.paymentUrl, copyLabel: 'Copiar link',
    }] : []),
    { ...internationalMethods[1], description: 'Use nossa Wisetag para enviar o valor que quiser.', copyLabel: 'Copiar Wisetag' },
  ];
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copyDetail(id: string, value: string) {
    setCopied(null);
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
    } catch {
      setCopyError(id);
    }
  }

  return <section className="gift-payments" aria-label={c.title}>
    <h3><Icon name="wallet" />{c.title}</h3>
    {methods.map(method => <div className="payment-method" key={method.id}>
      <div className="payment-method-heading">
        <h4>{method.name}</h4>
        {method.id !== 'mercado-pago' && <span>{c.amount}</span>}
      </div>
      <p className="payment-description">{method.description}</p>
      <p className="payment-detail">{method.value}</p>
      <div className="payment-actions">
        <Button asChild><a href={method.url} target={locale === 'pt' ? '_self' : '_blank'} rel="noopener noreferrer">{method.id === 'mercado-pago' ? 'Continuar no Mercado Pago' : `${c.open} ${method.name}`}<Icon name="arrow" /></a></Button>
        <Button variant="outline" type="button" onClick={() => copyDetail(method.id, method.value)}>
          {copied === method.id ? c.copied : method.copyLabel}<Icon name="copy" />
        </Button>
      </div>
      <p className="payment-copy-status" role="status">
        {copied === method.id ? `${method.name} ${c.success}` : copyError === method.id ? c.error : ''}
      </p>
    </div>)}
  </section>;
}
