import { submissionLimits } from '../../src/shared/api/contracts.ts';

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ENVIRONMENT: 'production' | 'local';
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  HOST_EMAIL: string;
}

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const bodyLimit = 16 * 1024;
const testSecrets = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);

function text(value: unknown, max: number, label: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new HttpError(400, 'INVALID_INPUT', `${label}: informe um texto de até ${max} caracteres.`);
  }
  return value.trim();
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envie os dados em JSON.');
  }
  if (Number(request.headers.get('Content-Length')) > bodyLimit) {
    throw new HttpError(413, 'BODY_TOO_LARGE', 'Os dados enviados são muito grandes.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'INVALID_JSON', 'Informe os dados do formulário.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > bodyLimit) {
        await reader.cancel();
        throw new HttpError(413, 'BODY_TOO_LARGE', 'Os dados enviados são muito grandes.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)); }
  catch { throw new HttpError(400, 'INVALID_JSON', 'Não foi possível ler os dados enviados.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Informe os dados do formulário.');
  }
  return body as Record<string, unknown>;
}

async function verifyTurnstile(token: string, action: string, origin: string, request: Request, env: Env) {
  const hostname = new URL(origin).hostname;
  const localTest = env.ENVIRONMENT === 'local' && ['localhost', '127.0.0.1'].includes(hostname) && testSecrets.has(env.TURNSTILE_SECRET_KEY);
  if (!env.TURNSTILE_SECRET_KEY || (testSecrets.has(env.TURNSTILE_SECRET_KEY) && !localTest)) {
    throw new HttpError(503, 'NOT_CONFIGURED', 'A verificação de segurança está indisponível.');
  }
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);
  let result: { success?: boolean; hostname?: string; action?: string; 'error-codes'?: string[] };
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: form, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw Error();
    result = await response.json();
  } catch {
    throw new HttpError(503, 'TURNSTILE_UNAVAILABLE', 'A verificação de segurança está indisponível. Tente novamente.');
  }
  if (!result || typeof result.success !== 'boolean' || (Array.isArray(result['error-codes']) && result['error-codes'].some(code => ['missing-input-secret', 'invalid-input-secret', 'internal-error'].includes(code)))) {
    throw new HttpError(503, 'TURNSTILE_UNAVAILABLE', 'A verificação de segurança está indisponível. Tente novamente.');
  }
  if (result.success !== true || (!localTest && (result.hostname !== hostname || result.action !== action))) {
    throw new HttpError(403, 'TURNSTILE_FAILED', 'Refaça a verificação de segurança e tente novamente.');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    const json = (body: unknown, status: number) => Response.json(body, { status, headers });
    try {
      const origin = request.headers.get('Origin');
      const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
      if (!origin || !allowedOrigins.includes(origin) || origin === 'null') {
        throw new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origem não permitida.');
      }
      headers.set('Access-Control-Allow-Origin', origin);
      const path = new URL(request.url).pathname;
      if (path !== '/api/rsvp' && path !== '/api/message') throw new HttpError(404, 'NOT_FOUND', 'Recurso não encontrado.');
      if (request.method === 'OPTIONS') {
        const method = request.headers.get('Access-Control-Request-Method');
        const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') || '').split(',').filter(Boolean);
        if (method !== 'POST' || requestedHeaders.some(value => value.trim().toLowerCase() !== 'content-type')) {
          throw new HttpError(403, 'PREFLIGHT_NOT_ALLOWED', 'Requisição não permitida.');
        }
        headers.set('Access-Control-Allow-Methods', 'POST');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
        return new Response(null, { status: 204, headers });
      }
      if (request.method !== 'POST') {
        headers.set('Allow', 'POST, OPTIONS');
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
      }
      const body = await readBody(request);
      const name = text(body.name, submissionLimits.name, 'Seu nome');
      const token = text(body.turnstileToken, submissionLimits.token, 'Verificação de segurança');
      if (path === '/api/rsvp') {
        if (typeof body.attending !== 'boolean' || !Array.isArray(body.companions) || body.companions.length > submissionLimits.companions) {
          throw new HttpError(400, 'INVALID_INPUT', `Informe a presença e até ${submissionLimits.companions} acompanhantes.`);
        }
        const companions = body.companions.map(value => text(value, submissionLimits.name, 'Nome do acompanhante'));
        if (!body.attending && companions.length) throw new HttpError(400, 'INVALID_INPUT', 'Uma recusa de presença não pode incluir acompanhantes.');
        await verifyTurnstile(token, 'rsvp', origin, request, env);
        const id = crypto.randomUUID();
        try {
          const result = await env.DB.prepare('INSERT INTO rsvps (id, guest_name, attending, companions_json) VALUES (?, ?, ?, ?)')
            .bind(id, name, Number(body.attending), JSON.stringify(companions)).run();
          if (!result.success) throw Error();
        } catch {
          throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'Não foi possível salvar sua resposta. Tente novamente.');
        }
        return json({ ok: true, id }, 201);
      }
      const message = text(body.message, submissionLimits.message, 'Seu recado');
      if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.HOST_EMAIL) {
        throw new HttpError(503, 'NOT_CONFIGURED', 'O envio de recados está indisponível.');
      }
      await verifyTurnstile(token, 'message', origin, request, env);
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: env.RESEND_FROM, to: [env.HOST_EMAIL],
            subject: 'Novo recado — República da Brisinha',
            text: `De: ${name}\n\n${message}`,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw Error();
        const result: { id?: string } = await response.json();
        if (!result.id) throw Error();
      } catch {
        throw new HttpError(502, 'EMAIL_UNAVAILABLE', 'Não foi possível enviar seu recado. Tente novamente.');
      }
      return json({ ok: true }, 200);
    } catch (error) {
      const failure = error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR', 'Ocorreu um erro. Tente novamente.');
      return json({ error: { code: failure.code, message: failure.message } }, failure.status);
    }
  },
};
