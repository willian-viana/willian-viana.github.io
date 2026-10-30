import { useEffect, useRef } from 'react';

type TurnstileApi = {
  render(container: HTMLElement, options: {
    sitekey: string;
    action: string;
    size: 'flexible';
    callback(token: string): void;
    'expired-callback'(): void;
    'error-callback'(): boolean;
  }): string;
  remove(id: string): void;
};

declare global { interface Window { turnstile?: TurnstileApi; onBrisinhaTurnstileLoad?: () => void } }
let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile() {
  if (loading) return loading;
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => { script.remove(); reject(Error('Turnstile timeout')); }, 20_000);
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onBrisinhaTurnstileLoad';
    script.async = true;
    window.onBrisinhaTurnstileLoad = () => {
      if (!window.turnstile) { clearTimeout(timer); script.remove(); reject(Error('Turnstile unavailable')); return; }
      clearTimeout(timer);
      resolve(window.turnstile);
    };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(Error('Turnstile unavailable')); };
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export function Turnstile({ action, siteKey, onToken, onError }: {
  action: 'rsvp' | 'message';
  siteKey: string;
  onToken(token: string): void;
  onError(message: string): void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let widget: string | undefined;
    let api: TurnstileApi | undefined;
    loadTurnstile().then(loaded => {
      if (cancelled || !container.current) return;
      api = loaded;
      widget = loaded.render(container.current, {
        sitekey: siteKey, action, size: 'flexible',
        callback: token => { if (!cancelled) { onToken(token); onError(''); } },
        'expired-callback': () => { if (!cancelled) { onToken(''); onError('A verificação expirou. Verifique novamente.'); } },
        'error-callback': () => { if (!cancelled) { onToken(''); onError('Não foi possível verificar sua segurança. Tente novamente.'); } return true; },
      });
    }).catch(() => { if (!cancelled) onError('Não foi possível carregar a verificação de segurança. Tente novamente.'); });
    return () => { cancelled = true; if (widget !== undefined) api?.remove(widget); };
  }, [action, siteKey, onToken, onError]);

  return <div className="turnstile-widget" ref={container} role="group" aria-label="Verificação de segurança" />;
}
