import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/ui/button';

export function Form({ rsvp = false }: { rsvp?: boolean }) {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [companions, setCompanions] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const api = import.meta.env.VITE_API_BASE_URL;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api || busy || (rsvp && attending === null)) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch(`${api.replace(/\/$/, '')}/${rsvp ? 'rsvps' : 'messages'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvp
          ? { name: data.get('name'), attending, companions: attending ? companions : [] }
          : { name: data.get('name'), message: data.get('message') }),
      });
      if (!response.ok) throw Error();
      setStatus(rsvp ? 'Resposta registrada!' : 'Recado enviado!');
      form.reset();
      setCompanions([]);
    } catch {
      setStatus('Não foi possível enviar. Seus dados foram mantidos; tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="response-form">
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
          <label className="form-field">Seu nome<input name="name" autoComplete="name" required maxLength={120} pattern={'.*\\S.*'} /></label>
          {rsvp ? attending && (
            <div className="companions">
              {companions.map((name, i) => (
                <div className="companion-row" key={i}>
                  <label className="form-field">Nome do acompanhante {i + 1}
                    <input required maxLength={120} pattern={'.*\\S.*'} value={name} onChange={event => setCompanions(companions.map((value, j) => j === i ? event.target.value : value))} />
                  </label>
                  <button className="text-button" type="button" aria-label={`Remover acompanhante ${i + 1}`} onClick={() => setCompanions(companions.filter((_, j) => i !== j))}>Remover</button>
                </div>
              ))}
              <button className="text-button" type="button" onClick={() => setCompanions([...companions, ''])}>+ Adicionar acompanhante</button>
            </div>
          ) : <label className="form-field">Seu recado<textarea name="message" required maxLength={3000} rows={5} /></label>}
          {!api && <p className="form-notice">Envios ainda indisponíveis. Volte em breve.</p>}
          <Button className="form-submit" disabled={!api || busy}>{busy ? 'Enviando…' : rsvp ? 'Confirmar resposta' : 'Enviar recado'}</Button>
        </>
      )}
      <p className="form-status" role="status">{status}</p>
    </form>
  );
}
