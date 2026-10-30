export function eventCountdown(eventDate: string, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const days = Math.round((Date.parse(eventDate) - Date.parse(today)) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return 'É hoje!';
  return days === 1 ? 'falta 1 dia' : `faltam ${days} dias`;
}
