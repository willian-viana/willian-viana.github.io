import { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';

const methods = [
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

export function InternationalPayments() {
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

  return <section className="international-payments" aria-label="International contributions">
    <h3><Icon name="wallet" />Choose how you'd like to contribute</h3>
    {methods.map(method => <div className="payment-method" key={method.id}>
      <div className="payment-method-heading">
        <h4>{method.name}</h4>
        <span>Amount of your choice</span>
      </div>
      <p className="payment-description">{method.description}</p>
      <p className="payment-detail">{method.value}</p>
      <div className="payment-actions">
        <Button asChild><a href={method.url} target="_blank" rel="noopener noreferrer">Open {method.name}<Icon name="arrow" /></a></Button>
        <Button variant="outline" type="button" onClick={() => copyDetail(method.id, method.value)}>
          {copied === method.id ? 'Copied!' : method.copyLabel}<Icon name="copy" />
        </Button>
      </div>
      <p className="payment-copy-status" role="status">
        {copied === method.id ? `${method.name} details copied.` : copyError === method.id ? "Couldn't copy automatically. Please select and copy the details above." : ''}
      </p>
    </div>)}
  </section>;
}
