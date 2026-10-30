import { useRef, useState, type FormEvent } from 'react';
import { submissionLimits, type MessageSubmission, type RsvpSubmission } from '../../shared/api/contracts';
import { Button } from '../../shared/ui/button';
import { Turnstile } from './Turnstile';

export function Form({ rsvp = false }: { rsvp?: boolean }) {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [companions, setCompanions] = useState<string[]>([]);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const [challengeError, setChallengeError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const submitting = useRef(false);
  const api = import.meta.env.VITE_API_BASE_URL;
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const configured = Boolean(api && siteKey);

  function resetChallenge() { setToken(''); setChallengeError(''); setAttempt(value => value + 1); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !token || submitting.current || (rsvp && attending === null)) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const payload: RsvpSubmission | MessageSubmission = rsvp
      ? { name, attending: attending!, companions: attending ? companions.map(value => value.trim()) : [], turnstileToken: token }
      : { name, message: String(data.get('message') || '').trim(), turnstileToken: token };
    if (!name || ('message' in payload && !payload.message) || ('companions' in payload && payload.companions.some(value => !value))) {
      setStatus({ kind: 'error', message: 'Preencha os campos sem usar apenas espaços.' });
      return;
    }
    submitting.current = true;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`${api.replace(/\/$/, '')}/api/${rsvp ? 'rsvp' : 'message'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw Error(result.error?.message || 'Não foi possível enviar. Tente novamente.');
      }
      setStatus({ kind: 'success', message: rsvp ? 'Resposta registrada!' : 'Recado encaminhado por email!' });
      form.reset();
      setCompanions([]);
    } catch (error) {
      const message = error instanceof Error && error.name === 'Error'
        ? error.message : 'Não foi possível confirmar o envio. Seus dados foram mantidos; tente novamente.';
      setStatus({ kind: 'error', message });
    } finally {
      submitting.current = false;
      setBusy(false);
      // Siteverify tokens are single-use, including when storage or email fails afterward.
      resetChallenge();
    }
  }

  return (
    <form onSubmit={submit} className="response-form" aria-busy={busy}>
      <fieldset disabled={busy}>
        {rsvp && (
          <fieldset className="attendance-options">
            <legend className="sr-only">Sua resposta</legend>
            {[{ value: true, label: 'Vou, com certeza' }, { value: false, label: 'Não vou conseguir' }].map(option => (
              <label className="attendance-option" key={String(option.value)}>
                <span>{option.label}</span>
                <input type="radio" name="attending" value={String(option.value)} checked={attending === option.value} onChange={() => setAttending(option.value)} required />
              </label>
            ))}
          </fieldset>
        )}
        {(!rsvp || attending !== null) && (
          <>
            <label className="form-field">Seu nome<input name="name" autoComplete="name" required maxLength={submissionLimits.name} pattern={'.*\\S.*'} /></label>
            {rsvp ? attending && (
              <div className="companions">
                {companions.map((name, i) => (
                  <div className="companion-row" key={i}>
                    <label className="form-field">Nome do acompanhante {i + 1}
                      <input required maxLength={submissionLimits.name} pattern={'.*\\S.*'} value={name} onChange={event => setCompanions(companions.map((value, j) => j === i ? event.target.value : value))} />
                    </label>
                    <button className="text-button" type="button" aria-label={`Remover acompanhante ${i + 1}`} onClick={() => setCompanions(companions.filter((_, j) => i !== j))}>Remover</button>
                  </div>
                ))}
                <button className="text-button" type="button" disabled={companions.length >= submissionLimits.companions} onClick={() => setCompanions([...companions, ''])}>+ Adicionar acompanhante</button>
              </div>
            ) : <label className="form-field">Seu recado<textarea name="message" required maxLength={submissionLimits.message} rows={5} /></label>}
            {!configured && <p className="form-notice">Envios ainda indisponíveis. Volte em breve.</p>}
            {configured && <Turnstile key={attempt} siteKey={siteKey} action={rsvp ? 'rsvp' : 'message'} onToken={setToken} onError={setChallengeError} />}
            {challengeError && <div className="form-notice" role="alert"><p>{challengeError}</p><button className="text-button" type="button" onClick={resetChallenge}>Tentar verificação novamente</button></div>}
            <Button className="form-submit" disabled={!configured || !token || busy}>{busy ? 'Enviando…' : rsvp ? 'Confirmar resposta' : 'Enviar recado'}</Button>
          </>
        )}
      </fieldset>
      <p className="form-status" role={status?.kind === 'error' ? 'alert' : 'status'} data-kind={status?.kind}>{status?.message}</p>
    </form>
  );
}
