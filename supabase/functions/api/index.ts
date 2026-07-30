import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const JWT_SECRET = Deno.env.get('JWT_SECRET') || '';
const ADMIN_SETUP_TOKEN = Deno.env.get('ADMIN_SETUP_TOKEN') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
const BITRIX24_WEBHOOK_URL = Deno.env.get('BITRIX24_WEBHOOK_URL') || '';
const APP_NOTIFICATION_TITLE = 'Aviso da Biblioteca';
const BITRIX_NOTIFICATION_TITLE = '[b][color=#FF0000]⚠️ Aviso da Biblioteca ⚠️[/color][/b]';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '*')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes('*') || !origin
    ? '*'
    : allowed.includes(origin)
      ? origin
      : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-setup-token, x-cron-secret',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

async function body(req: Request) {
  return await req.json().catch(() => ({}));
}

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET) {
    throw new HttpError(500, 'ambiente incompleto');
  }
}

function dbError(error: { message?: string } | null) {
  if (error) throw new HttpError(500, error.message || 'erro no banco');
}

function base64Url(input: string | Uint8Array) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let output = '';
  for (const byte of bytes) output += String.fromCharCode(byte);
  return btoa(output).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

async function signJwt(payload: Record<string, unknown>) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
  }));
  const data = `${header}.${body}`;
  return `${data}.${base64Url(await hmac(data))}`;
}

async function verifyJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'token inválido');
  const data = `${parts[0]}.${parts[1]}`;
  const expected = base64Url(await hmac(data));
  if (expected !== parts[2]) throw new HttpError(401, 'token inválido');
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'token expirado');
  }
  return payload;
}

async function requireAdmin(req: Request) {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'sem token');
  const payload = await verifyJwt(token);
  if (!payload.is_admin) throw new HttpError(403, 'sem permissão');
  return payload;
}

async function requestIsAdmin(req: Request) {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  try {
    const payload = await verifyJwt(token);
    return !!payload.is_admin;
  } catch {
    return false;
  }
}

async function requireReader(req: Request) {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'código obrigatório');
  const payload = await verifyJwt(token);
  if (!payload.id || (payload.role !== 'user' && !payload.is_admin)) throw new HttpError(403, 'sem permissão');
  return payload;
}

function randomToken(size = 8) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let output = '';
  for (const byte of bytes) output += alphabet[byte % alphabet.length];
  return output;
}

function publicUser(user: Record<string, unknown>) {
  const { password_hash: _passwordHash, access_code: _accessCode, ...rest } = user;
  return rest;
}

async function userSession(user: Record<string, unknown>) {
  await supabase
    .from('app_users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id);
  const token = await signJwt({
    role: user.is_admin ? 'admin' : 'user',
    is_admin: !!user.is_admin,
    is_super: !!user.is_super,
    id: user.id,
    name: user.name,
    force_password_change: !!user.force_password_change
  });
  return { token, user: publicUser(user) };
}

async function hiddenAccessCode() {
  for (let i = 0; i < 5; i++) {
    const code = `TEMP-${randomToken(16).toUpperCase()}`;
    if (!await findUserByCode(code)) return code;
  }
  throw new HttpError(500, 'falha ao gerar código');
}

async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  dbError(error);
  return data;
}

async function updateSettings(patch: Record<string, unknown>) {
  const allowed = ['auto_approve', 'default_days', 'default_waitlist_hold_hours', 'show_top_readers'];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) if (key in patch) clean[key] = patch[key];
  const { data, error } = await supabase.from('settings').update(clean).eq('id', 1).select('*').single();
  dbError(error);
  return data;
}

async function findBook(id: string | number) {
  const { data, error } = await supabase.from('books').select('*').eq('id', id).maybeSingle();
  dbError(error);
  return data;
}

async function activeLoanForBook(bookId: string | number) {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('book_id', bookId)
    .in('status', ['pending', 'approved'])
    .limit(1)
    .maybeSingle();
  dbError(error);
  return data;
}

async function waitlistForBook(bookId: string | number) {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .eq('book_id', bookId)
    .eq('expired', false)
    .order('created_at');
  dbError(error);
  return data || [];
}

function needsApproval(book: Record<string, unknown>, settings: Record<string, unknown>) {
  if (book.auto_approve_override === true) return false;
  if (book.auto_approve_override === false) return true;
  return !settings.auto_approve;
}

function holdHoursForBook(book: Record<string, unknown>, settings: Record<string, unknown>) {
  return typeof book.waitlist_hold_hours === 'number'
    ? book.waitlist_hold_hours
    : Number(settings.default_waitlist_hold_hours || 24);
}

async function maybeNotifyCleanupDue(now: Date) {
  const settings = await getSettings();
  const last = settings.notifications_last_cleanup_at
    ? new Date(settings.notifications_last_cleanup_at)
    : now;
  const daysSince = (now.getTime() - last.getTime()) / 86400000;
  if (daysSince < 90 || settings.notifications_cleanup_reminder_sent) return;
  await createNotification({
    type: 'notification_cleanup_due',
    title: '90 dias se passaram desde a ultima limpeza',
    message: 'Revise e limpe notificações antigas para liberar espaço.'
  });
  const { error } = await supabase
    .from('settings')
    .update({ notifications_cleanup_reminder_sent: true })
    .eq('id', 1);
  dbError(error);
}

async function bookWithStatus(book: Record<string, unknown>) {
  const [active, queue, settings, reviews] = await Promise.all([
    activeLoanForBook(book.id as number),
    waitlistForBook(book.id as number),
    getSettings(),
    supabase.from('reviews').select('rating').eq('book_id', book.id)
  ]);
  dbError(reviews.error);
  const reviewRows = reviews.data || [];
  const rating_count = reviewRows.length;
  const rating_avg = rating_count ? reviewRows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rating_count : null;
  let status = 'available';
  let due_at = null;
  let renewed_count = 0;
  if (active) {
    status = active.status === 'approved' ? 'borrowed' : 'pending';
    due_at = active.due_at;
    renewed_count = active.renewed_count || 0;
  }
  const firstWithHold = queue.find(item => item.hold_until && new Date(item.hold_until) > new Date());
  return {
    ...book,
    status,
    due_at,
    renewed_count,
    waitlist_count: queue.length,
    rating_avg,
    rating_count,
    needs_approval: needsApproval(book, settings),
    held_for_user_id: firstWithHold?.user_id || null,
    held_until: firstWithHold?.hold_until || null
  };
}

function bookOutput(book: Record<string, unknown>, includeOwner: boolean) {
  if (includeOwner) return book;
  const { owner_name: _ownerName, ...rest } = book;
  return rest;
}

async function listBooks(includeOwner = false) {
  const { data, error } = await supabase.from('books').select('*').order('category').order('title');
  dbError(error);
  const books = await Promise.all((data || []).map(bookWithStatus));
  return books.map(book => bookOutput(book, includeOwner));
}

async function ensureCategory(name: unknown) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const { data, error } = await supabase
    .from('categories')
    .upsert({ name: clean }, { onConflict: 'name' })
    .select('*')
    .single();
  dbError(error);
  return data;
}

async function findUser(id: string | number) {
  const { data, error } = await supabase.from('app_users').select('*').eq('id', id).maybeSingle();
  dbError(error);
  return data;
}

async function findUserByCode(code: string) {
  const { data, error } = await supabase.from('app_users').select('*').eq('access_code', code).maybeSingle();
  dbError(error);
  return data;
}

async function findUserByIdentifier(identifier: string) {
  const code = identifier.trim().toUpperCase();
  const byCode = await findUserByCode(code);
  if (byCode) return byCode;
  const { data, error } = await supabase.from('app_users').select('*').limit(500);
  dbError(error);
  return (data || []).find(user => String(user.name).toLowerCase() === identifier.trim().toLowerCase()) || null;
}

async function resolveActionUser(req: Request, input: Record<string, unknown>) {
  if (input.code) {
    const user = await findUserByCode(String(input.code).trim().toUpperCase());
    if (!user) throw new HttpError(401, 'código inválido');
    return user;
  }
  const auth = await requireReader(req);
  const user = await findUser(auth.id as number);
  if (!user) throw new HttpError(404, 'usuário não existe');
  if (user.force_password_change) throw new HttpError(403, 'troque a senha primeiro');
  return user;
}

async function hashPassword(password: string) {
  const { data, error } = await supabase.rpc('hash_password', { password_plain: password });
  dbError(error);
  return data;
}

async function verifyPassword(password: string, passwordHash: string) {
  const { data, error } = await supabase.rpc('verify_password', {
    password_plain: password,
    password_hash: passwordHash
  });
  dbError(error);
  return !!data;
}

async function createNotification(input: Record<string, unknown>) {
  const payload = {
    type: input.type,
    title: input.title,
    message: input.message,
    loan_id: input.loan_id || null,
    book_id: input.book_id || null,
    user_id: input.user_id || null,
    waitlist_id: input.waitlist_id || null,
    recipient_role: input.recipient_role || 'admin',
    recipient_user_id: input.recipient_user_id || null
  };
  const { data, error } = await supabase.from('notifications').insert(payload).select('*').single();
  dbError(error);
  return data;
}

async function callBitrix(method: string, params: Record<string, unknown>) {
  if (!BITRIX24_WEBHOOK_URL) throw new Error('webhook do Bitrix24 não configurado');
  const endpoint = `${BITRIX24_WEBHOOK_URL.replace(/\/+$/, '')}/${method}.json`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error_description || payload?.error || `Bitrix24 respondeu ${response.status}`);
  }
  return payload?.result;
}

async function sendBitrixUserNotification(user: Record<string, unknown>, message: string) {
  const email = String(user.email || '').trim();
  if (!email) throw new Error('usuário sem email para localizar no Bitrix24');

  const matches = await callBitrix('user.get', {
    filter: { EMAIL: email, ACTIVE: true }
  });
  const exactMatches = (Array.isArray(matches) ? matches : []).filter(
    item => String(item?.EMAIL || '').trim().toLowerCase() === email.toLowerCase()
  );
  if (exactMatches.length === 0) throw new Error('usuário não encontrado no Bitrix24 pelo email');
  if (exactMatches.length > 1) throw new Error('mais de um usuário encontrado no Bitrix24 pelo email');

  const bitrixUserId = String(exactMatches[0].ID || '').trim();
  if (!bitrixUserId) throw new Error('usuário do Bitrix24 sem identificador');
  const messageId = await callBitrix('im.message.add', {
    DIALOG_ID: bitrixUserId,
    MESSAGE: `${BITRIX_NOTIFICATION_TITLE}\n\n${message}`,
    SYSTEM: 'N',
    URL_PREVIEW: 'N'
  });
  return { status: 'sent', user_id: bitrixUserId, message_id: messageId };
}

const AUTOMATION_DEFAULTS = [
  {
    key: 'builtin:due_soon',
    name: 'Empréstimo a expirar',
    trigger: 'loan_due_soon',
    enabled: true,
    days_before: 1,
    title: APP_NOTIFICATION_TITLE,
    message: 'Olá, {usuario}. O empréstimo de {livro} expira em {dias} dia(s), em {data_devolucao}.'
  },
  {
    key: 'builtin:waitlist_release',
    name: 'Livro liberado para o próximo da fila',
    trigger: 'waitlist_release',
    enabled: true,
    days_before: null,
    title: APP_NOTIFICATION_TITLE,
    message: 'Olá, {usuario}. {livro} foi devolvido e está reservado para você até {data_limite}.'
  }
];
const AUTOMATION_TRIGGERS = new Set(['loan_due_soon', 'waitlist_release']);

function cleanAutomation(input: Record<string, unknown>, base: Record<string, unknown> = {}) {
  const trigger = String(input.trigger || base.trigger || '');
  if (!AUTOMATION_TRIGGERS.has(trigger)) throw new HttpError(400, 'gatilho de automação inválido');
  const name = String(input.name ?? base.name ?? '').trim();
  const message = String(input.message ?? base.message ?? '').trim();
  if (!name || !message) throw new HttpError(400, 'nome e mensagem são obrigatórios');
  const daysBeforeRaw = Number(input.days_before ?? base.days_before ?? 1);
  const daysBefore = trigger === 'loan_due_soon'
    ? Math.min(60, Math.max(1, Math.round(daysBeforeRaw || 1)))
    : null;
  return {
    name,
    trigger,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : base.enabled !== false,
    days_before: daysBefore,
    title: APP_NOTIFICATION_TITLE,
    message
  };
}

function automationFromRow(row: Record<string, any>): Record<string, any> | null {
  try {
    const config = JSON.parse(String(row.message || '{}'));
    return {
      id: row.id,
      key: row.title,
      built_in: String(row.title || '').startsWith('builtin:'),
      ...cleanAutomation(config)
    };
  } catch {
    return null;
  }
}

function isAutomation(item: Record<string, any> | null): item is Record<string, any> {
  return item !== null;
}

async function ensureDefaultAutomations() {
  const { data, error } = await supabase
    .from('notifications')
    .select('title')
    .eq('type', 'automation_config')
    .in('title', AUTOMATION_DEFAULTS.map(item => item.key));
  dbError(error);
  const existing = new Set((data || []).map(item => item.title));
  const missing = AUTOMATION_DEFAULTS
    .filter(item => !existing.has(item.key))
    .map(item => ({
      type: 'automation_config',
      title: item.key,
      message: JSON.stringify(item),
      recipient_role: 'user',
      recipient_user_id: null
    }));
  if (missing.length > 0) {
    const { error: insertError } = await supabase.from('notifications').insert(missing);
    dbError(insertError);
  }
}

async function listAutomations(enabledOnly = false) {
  await ensureDefaultAutomations();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'automation_config')
    .order('created_at');
  dbError(error);
  const automations = (data || []).map(automationFromRow).filter(isAutomation);
  return enabledOnly ? automations.filter(item => item.enabled) : automations;
}

function formatAutomationDate(value: unknown) {
  if (!value) return '';
  return new Date(String(value)).toLocaleString('pt-BR');
}

function renderAutomationText(template: string, values: Record<string, unknown>) {
  return template.replace(/\{([a-z_]+)\}/gi, (_match, key) => String(values[key] ?? ''));
}

async function automationAlreadySent(automationId: number, context: Record<string, any>) {
  let query = supabase
    .from('notifications')
    .select('id')
    .eq('type', `automation_delivery:${automationId}`)
    .eq('recipient_role', 'user')
    .eq('recipient_user_id', context.user.id)
    .limit(1);
  if (context.loan?.id) query = query.eq('loan_id', context.loan.id);
  if (context.waitlist?.id) query = query.eq('waitlist_id', context.waitlist.id);
  const { data, error } = await query;
  dbError(error);
  return (data || []).length > 0;
}

async function dispatchAutomation(automation: Record<string, any>, context: Record<string, any>) {
  if (await automationAlreadySent(automation.id, context)) return false;
  const values = {
    usuario: context.user.name || 'usuário',
    livro: context.book.title || 'Livro',
    dias: context.days ?? '',
    data_devolucao: formatAutomationDate(context.loan?.due_at),
    data_limite: formatAutomationDate(context.hold_until)
  };
  const title = APP_NOTIFICATION_TITLE;
  const message = renderAutomationText(automation.message, values);
  await createNotification({
    type: `automation_delivery:${automation.id}`,
    title,
    message,
    loan_id: context.loan?.id,
    book_id: context.book.id,
    user_id: context.user.id,
    waitlist_id: context.waitlist?.id,
    recipient_role: 'user',
    recipient_user_id: context.user.id
  });
  try {
    await sendBitrixUserNotification(context.user, message);
  } catch (error) {
    await createNotification({
      type: 'automation_bitrix_failed',
      title: 'Falha em automação no Bitrix24',
      message: `${automation.name} para ${context.user.name || 'usuário'}: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      book_id: context.book.id,
      user_id: context.user.id
    });
  }
  return true;
}

async function runWaitlistReleaseAutomations(book: Record<string, any>, waitlist: Record<string, any>, holdUntil: string) {
  const user = await findUser(waitlist.user_id);
  if (!user) return;
  const automations = (await listAutomations(true)).filter(item => item.trigger === 'waitlist_release');
  for (const automation of automations) {
    await dispatchAutomation(automation, { user, book, waitlist, hold_until: holdUntil });
  }
}

async function enrichLoan(loan: Record<string, unknown>) {
  const [book, user, approver, returner] = await Promise.all([
    findBook(loan.book_id as number),
    findUser(loan.user_id as number),
    loan.approved_by ? findUser(loan.approved_by as number) : null,
    loan.returned_by ? findUser(loan.returned_by as number) : null
  ]);
  return {
    ...loan,
    book_title: book?.title || '?',
    cover_url: book?.cover_url || '',
    user_name: user?.name || '?',
    approver_name: approver?.name || null,
    returner_name: returner?.name || null
  };
}

async function listLoans() {
  const { data, error } = await supabase.from('loans').select('*').order('requested_at', { ascending: false });
  dbError(error);
  return await Promise.all((data || []).map(enrichLoan));
}

async function createLoan(input: Record<string, unknown>) {
  const now = new Date();
  const days = Number(input.days || 14);
  const status = String(input.status || 'pending');
  const payload = {
    book_id: Number(input.book_id),
    user_id: Number(input.user_id),
    status,
    days,
    requested_at: now.toISOString(),
    approved_at: status === 'approved' ? now.toISOString() : null,
    approved_by: input.approved_by || null,
    auto_approved: !!input.auto_approved,
    due_at: status === 'approved' ? new Date(now.getTime() + days * 86400000).toISOString() : null,
    returned_at: null,
    returned_by: null,
    renewed_count: 0,
    reminder_sent: false,
    overdue_notified: false
  };
  const { data, error } = await supabase.from('loans').insert(payload).select('*').single();
  dbError(error);
  return data;
}

async function updateLoan(id: string | number, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('loans').update(patch).eq('id', id).select('*').single();
  dbError(error);
  return data;
}

async function findLoan(id: string | number) {
  const { data, error } = await supabase.from('loans').select('*').eq('id', id).maybeSingle();
  dbError(error);
  return data;
}

async function listWaitlist() {
  const { data, error } = await supabase.from('waitlist').select('*').order('created_at');
  dbError(error);
  return await Promise.all((data || []).map(async item => {
    const [book, user] = await Promise.all([findBook(item.book_id), findUser(item.user_id)]);
    return {
      ...item,
      book_title: book?.title || '?',
      cover_url: book?.cover_url || '',
      user_name: user?.name || '?'
    };
  }));
}

async function isUserInWaitlist(bookId: number, userId: number) {
  const { data, error } = await supabase
    .from('waitlist')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .eq('expired', false)
    .maybeSingle();
  dbError(error);
  return !!data;
}

async function readStats(start: string | null, end: string | null) {
  let query = supabase.from('loans').select('*').eq('status', 'returned').not('returned_at', 'is', null);
  if (start) query = query.gte('returned_at', start);
  if (end) query = query.lte('returned_at', end);
  const { data, error } = await query;
  dbError(error);
  const counts = new Map<number, number>();
  for (const loan of data || []) counts.set(loan.user_id, (counts.get(loan.user_id) || 0) + 1);
  const result = [];
  for (const [userId, count] of counts) {
    const user = await findUser(userId);
    result.push({
      user_id: userId,
      user_name: user?.name || '?',
      avatar_url: user?.avatar_url || '',
      count
    });
  }
  return result.sort((a, b) => b.count - a.count);
}

async function readEntries(start: string | null, end: string | null) {
  let query = supabase
    .from('loans')
    .select('*')
    .eq('status', 'returned')
    .not('returned_at', 'is', null)
    .order('returned_at', { ascending: false });
  if (start) query = query.gte('returned_at', start);
  if (end) query = query.lte('returned_at', end);
  const { data, error } = await query;
  dbError(error);
  return await Promise.all((data || []).map(enrichLoan));
}

async function recalcBooksRead(userId: string | number | null | undefined) {
  if (!userId) return;
  const { count, error } = await supabase
    .from('loans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'returned')
    .not('returned_at', 'is', null);
  dbError(error);
  const { error: updateError } = await supabase
    .from('app_users')
    .update({ books_read: count || 0 })
    .eq('id', userId);
  dbError(updateError);
}

function normalizePeriod(value: string | null, end = false) {
  if (!value) return null;
  if (/^\d{4}-\d{2}$/.test(value)) {
    if (!end) return `${value}-01T00:00:00`;
    const [year, month] = value.split('-').map(Number);
    const last = new Date(year, month, 0).getDate();
    return `${value}-${String(last).padStart(2, '0')}T23:59:59`;
  }
  return value;
}

async function fromGoogle(q: string) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&printType=books`;
    const response = await fetch(url);
    const data = await response.json();
    return (data.items || []).map((item: Record<string, any>) => {
      const volume = item.volumeInfo || {};
      const cover = volume.imageLinks?.thumbnail || volume.imageLinks?.smallThumbnail || '';
      return {
        source: 'google',
        title: volume.title || '',
        author: (volume.authors || []).join(', '),
        category: (volume.categories || [])[0] || '',
        cover_url: String(cover).replace('http://', 'https://'),
        synopsis: volume.description || '',
        year: volume.publishedDate ? volume.publishedDate.slice(0, 4) : ''
      };
    });
  } catch {
    return [];
  }
}

async function fromOpenLibrary(q: string) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=key,title,author_name,cover_i,first_publish_year,subject,first_sentence`;
    const response = await fetch(url);
    const data = await response.json();
    return (data.docs || []).map((item: Record<string, any>) => ({
      source: 'openlibrary',
      title: item.title || '',
      author: (item.author_name || []).slice(0, 2).join(', '),
      category: (item.subject || [])[0] || '',
      cover_url: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : '',
      synopsis: Array.isArray(item.first_sentence) ? item.first_sentence[0] : (item.first_sentence || ''),
      year: item.first_publish_year ? String(item.first_publish_year) : ''
    }));
  } catch {
    return [];
  }
}

async function searchExternal(q: string) {
  const [google, openLibrary] = await Promise.all([fromGoogle(q), fromOpenLibrary(q)]);
  const norm = (value: string) => (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  const seen = new Set<string>();
  const merged = [];
  const maxLen = Math.max(google.length, openLibrary.length);
  for (let i = 0; i < maxLen; i++) {
    for (const item of [google[i], openLibrary[i]]) {
      if (!item?.title) continue;
      const key = `${norm(item.title)}|${norm(item.author)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged.slice(0, 30);
}

async function uploadImageData(rawData: unknown, prefix: string, maxBytes: number) {
  const raw = String(rawData || '');
  const match = raw.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new HttpError(400, 'imagem inválida');
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  if (!['jpg', 'png', 'webp'].includes(ext)) throw new HttpError(400, 'formato inválido');
  const bytes = decodeBase64Url(match[2].replace(/\+/g, '-').replace(/\//g, '_'));
  if (bytes.byteLength > maxBytes) throw new HttpError(400, `imagem grande demais (${Math.floor(maxBytes / 1024 / 1024)}MB)`);
  const filename = `${prefix}/${randomToken(12)}.${ext}`;
  const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const file = new Blob([bytes], { type: contentType });
  const { error } = await supabase.storage.from('book-covers').upload(filename, file, { contentType });
  dbError(error);
  const { data } = supabase.storage.from('book-covers').getPublicUrl(filename);
  return data.publicUrl;
}

async function uploadImage(req: Request) {
  const input = await body(req);
  const url = await uploadImageData(input.data, 'covers', 10 * 1024 * 1024);
  return json(req, { url });
}

async function setupAdmin(req: Request) {
  if (!ADMIN_SETUP_TOKEN) throw new HttpError(403, 'setup desativado');
  if (req.headers.get('x-setup-token') !== ADMIN_SETUP_TOKEN) throw new HttpError(403, 'token setup inválido');
  const input = await body(req);
  if (!input.name || !input.access_code || !input.password || String(input.password).length < 8) {
    throw new HttpError(400, 'nome, código e senha forte obrigatórios');
  }
  const { data: existing, error: existingError } = await supabase
    .from('app_users')
    .select('id')
    .eq('is_super', true)
    .limit(1);
  dbError(existingError);
  if (existing && existing.length > 0) throw new HttpError(400, 'super admin já existe');
  const password_hash = await hashPassword(String(input.password));
  const { data, error } = await supabase.from('app_users').insert({
    name: String(input.name),
    email: String(input.email || ''),
    access_code: String(input.access_code).trim().toUpperCase(),
    is_admin: true,
    is_super: true,
    password_hash,
    force_password_change: false
  }).select('*').single();
  dbError(error);
  return json(req, { user: publicUser(data) });
}

async function activateFirstWaitlistHold(book: Record<string, unknown>, waitlistItem: Record<string, unknown>, title: string) {
  const settings = await getSettings();
  const holdHours = holdHoursForBook(book, settings);
  const hold = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
  await supabase.from('waitlist').update({ hold_until: hold }).eq('id', waitlistItem.id);
  const user = await findUser(waitlistItem.user_id as number);
  await createNotification({
    type: 'waitlist_turn',
    title,
    message: `${book.title} reservado para ${user?.name || 'usuário'} por ${holdHours} hora(s), até ${new Date(hold).toLocaleString('pt-BR')}.`,
    book_id: book.id,
    user_id: waitlistItem.user_id,
    waitlist_id: waitlistItem.id
  });
  await createNotification({
    type: 'reader_waitlist_turn',
    title: 'Livro disponível para você',
    message: `${book.title} está disponível para você por ${holdHours} hora(s), até ${new Date(hold).toLocaleString('pt-BR')}.`,
    book_id: book.id,
    user_id: waitlistItem.user_id,
    waitlist_id: waitlistItem.id,
    recipient_role: 'user',
    recipient_user_id: waitlistItem.user_id
  });
}

async function runReminders() {
  const now = new Date();
  const dueAutomations = (await listAutomations(true)).filter(item => item.trigger === 'loan_due_soon');
  const { data: loans, error } = await supabase.from('loans').select('*').eq('status', 'approved');
  dbError(error);
  for (const loan of loans || []) {
    if (!loan.due_at) continue;
    const due = new Date(loan.due_at);
    const hoursUntil = (due.getTime() - now.getTime()) / 3600000;
    const queue = await waitlistForBook(loan.book_id);
    for (const automation of dueAutomations) {
      if (hoursUntil <= 0 || hoursUntil > Number(automation.days_before || 1) * 24) continue;
      const [book, user] = await Promise.all([findBook(loan.book_id), findUser(loan.user_id)]);
      if (!book || !user) continue;
      await dispatchAutomation(automation, {
        user,
        book,
        loan,
        days: Math.max(1, Math.ceil(hoursUntil / 24))
      });
    }
    if (!loan.reminder_sent && hoursUntil <= 24 && hoursUntil > 0) {
      if (queue.length > 0) {
        const enriched = await enrichLoan(loan);
        await createNotification({
          type: 'due_soon_with_queue',
          title: 'Devolução em menos de 24h com fila',
          message: `${enriched.book_title} com ${enriched.user_name} vence em breve. ${queue.length} pessoa(s) na fila.`,
          loan_id: loan.id,
          book_id: loan.book_id,
          user_id: loan.user_id
        });
      }
      await updateLoan(loan.id, { reminder_sent: true });
    }
    if (hoursUntil < 0 && !loan.overdue_notified) {
      const enriched = await enrichLoan(loan);
      if (queue.length > 0 && !queue[0].hold_until) {
        const book = await findBook(loan.book_id);
        if (book) await activateFirstWaitlistHold(book, queue[0], 'Livro liberado para o primeiro da fila');
      }
      await createNotification({
        type: 'reader_overdue',
        title: 'Empréstimo atrasado',
        message: `${enriched.book_title} passou do prazo. Renove ou devolva manualmente.`,
        loan_id: loan.id,
        book_id: loan.book_id,
        user_id: loan.user_id,
        recipient_role: 'user',
        recipient_user_id: loan.user_id
      });
      await createNotification({
        type: 'overdue',
        title: 'Empréstimo atrasado',
        message: `${enriched.book_title} com ${enriched.user_name} está atrasado.`,
        loan_id: loan.id,
        book_id: loan.book_id,
        user_id: loan.user_id
      });
      await updateLoan(loan.id, { overdue_notified: true });
    }
  }

  const { data: waits, error: waitError } = await supabase
    .from('waitlist')
    .select('*')
    .not('hold_until', 'is', null)
    .eq('expired', false);
  dbError(waitError);
  for (const item of waits || []) {
    if (new Date(item.hold_until) >= now) continue;
    await supabase.from('waitlist').update({ expired: true }).eq('id', item.id);
    const next = (await waitlistForBook(item.book_id))[0];
    if (!next) continue;
    const book = await findBook(item.book_id);
    if (!book) continue;
    await activateFirstWaitlistHold(book, next, 'Próximo da fila ativado');
  }
  await maybeNotifyCleanupDue(now);
}

async function handle(req: Request) {
  assertEnv();
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  const url = new URL(req.url);
  const marker = '/api';
  const index = url.pathname.indexOf(marker);
  const path = index >= 0 ? (url.pathname.slice(index + marker.length) || '/') : url.pathname;
  const method = req.method;

  if (method === 'POST' && path === '/setup/admin') return await setupAdmin(req);

  if (method === 'POST' && path === '/auth/user') {
    const input = await body(req);
    const identifier = String(input.identifier || '');
    if (!identifier.trim() || !input.password) throw new HttpError(400, 'nome/código e senha obrigatórios');
    const user = await findUserByIdentifier(identifier);
    if (!user) throw new HttpError(404, 'usuário não existe');
    if (!user.password_hash) throw new HttpError(401, 'senha não cadastrada');
    if (!await verifyPassword(String(input.password || ''), user.password_hash)) {
      throw new HttpError(401, 'credenciais inválidas');
    }
    return json(req, await userSession(user));
  }

  if (method === 'POST' && path === '/auth/register') {
    const input = await body(req);
    const name = String(input.name || '').trim();
    const access_code = String(input.access_code || '').trim().toUpperCase();
    const password = String(input.password || '');
    if (!name || !access_code || password.length < 4) {
      throw new HttpError(400, 'nome, código e senha obrigatórios');
    }
    const password_hash = await hashPassword(password);
    const existing = await findUserByCode(access_code);
    if (existing) {
      if (existing.is_admin || existing.password_hash) throw new HttpError(400, 'código já em uso');
      const { data, error } = await supabase.from('app_users').update({
        name,
        email: String(input.email || ''),
        password_hash,
        force_password_change: false,
        avatar_url: String(input.avatar_url || existing.avatar_url || '')
      }).eq('id', existing.id).select('*').single();
      dbError(error);
      return json(req, await userSession(data));
    }
    const { data, error } = await supabase.from('app_users').insert({
      name,
      email: String(input.email || ''),
      access_code,
      is_admin: false,
      is_super: false,
      password_hash,
      force_password_change: false,
      avatar_url: String(input.avatar_url || ''),
      books_read: 0
    }).select('*').single();
    dbError(error);
    return json(req, await userSession(data));
  }

  if (method === 'POST' && path === '/auth/admin') {
    const input = await body(req);
    const identifier = String(input.identifier || input.username || '');
    const user = await findUserByIdentifier(identifier);
    if (!user || !user.is_admin || !user.password_hash) throw new HttpError(401, 'credenciais inválidas');
    if (!await verifyPassword(String(input.password || ''), user.password_hash)) {
      throw new HttpError(401, 'credenciais inválidas');
    }
    const token = await signJwt({
      role: 'admin',
      is_admin: true,
      is_super: !!user.is_super,
      id: user.id,
      name: user.name
    });
    return json(req, {
      token,
      user: { id: user.id, name: user.name, is_super: !!user.is_super }
    });
  }

  if (method === 'GET' && path === '/settings') return json(req, await getSettings());
  if (method === 'PUT' && path === '/settings') {
    await requireAdmin(req);
    return json(req, await updateSettings(await body(req)));
  }
  if (method === 'GET' && path === '/automations') {
    await requireAdmin(req);
    return json(req, await listAutomations());
  }
  if (method === 'POST' && path === '/automations') {
    await requireAdmin(req);
    throw new HttpError(403, 'novas automações estão temporariamente desabilitadas');
  }
  const automationId = path.match(/^\/automations\/(\d+)$/)?.[1];
  if (automationId && method === 'PUT') {
    await requireAdmin(req);
    const { data: row, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', automationId)
      .eq('type', 'automation_config')
      .maybeSingle();
    dbError(error);
    if (!row) throw new HttpError(404, 'automação não existe');
    const current = automationFromRow(row);
    if (!current) throw new HttpError(500, 'automação inválida');
    const input = await body(req);
    if (current.built_in) input.trigger = current.trigger;
    const config = cleanAutomation(input, current);
    const { data, error: updateError } = await supabase
      .from('notifications')
      .update({ message: JSON.stringify(config) })
      .eq('id', automationId)
      .select('*')
      .single();
    dbError(updateError);
    return json(req, automationFromRow(data));
  }
  if (automationId && method === 'DELETE') {
    await requireAdmin(req);
    const { data: row, error } = await supabase
      .from('notifications')
      .select('title')
      .eq('id', automationId)
      .eq('type', 'automation_config')
      .maybeSingle();
    dbError(error);
    if (!row) throw new HttpError(404, 'automação não existe');
    if (String(row.title || '').startsWith('builtin:')) throw new HttpError(400, 'automação padrão não pode ser excluída');
    const { error: deleteError } = await supabase.from('notifications').delete().eq('id', automationId);
    dbError(deleteError);
    return json(req, { ok: true });
  }

  if (method === 'GET' && path === '/books') return json(req, await listBooks(await requestIsAdmin(req)));
  if (method === 'GET' && path === '/books/search-external') {
    await requireAdmin(req);
    const q = url.searchParams.get('q') || '';
    return json(req, q.length < 2 ? [] : await searchExternal(q));
  }
  if (method === 'POST' && path === '/books') {
    await requireAdmin(req);
    const input = await body(req);
    if (!input.title) throw new HttpError(400, 'título obrigatório');
    await ensureCategory(input.category || 'Geral');
    const { data, error } = await supabase.from('books').insert({
      title: input.title,
      author: input.author || '',
      category: input.category || 'Geral',
      cover_url: input.cover_url || '',
      synopsis: input.synopsis || '',
      owner_name: String(input.owner_name || 'Empresa').trim() || 'Empresa',
      default_days: typeof input.default_days === 'number' ? input.default_days : 14,
      auto_approve_override: input.auto_approve_override === true || input.auto_approve_override === false ? input.auto_approve_override : null,
      waitlist_hold_hours: typeof input.waitlist_hold_hours === 'number' ? input.waitlist_hold_hours : null
    }).select('id').single();
    dbError(error);
    if (!data) throw new HttpError(500, 'livro não foi criado');
    return json(req, { id: data.id });
  }
  const bookId = path.match(/^\/books\/(\d+)$/)?.[1];
  if (bookId && method === 'GET') {
    const book = await findBook(bookId);
    if (!book) throw new HttpError(404, 'não encontrado');
    return json(req, bookOutput(await bookWithStatus(book), await requestIsAdmin(req)));
  }
  if (bookId && method === 'PUT') {
    await requireAdmin(req);
    const patch = await body(req);
    if (patch.category) await ensureCategory(patch.category);
    if (!String(patch.owner_name || '').trim()) patch.owner_name = 'Empresa';
    if (patch.auto_approve_override !== true && patch.auto_approve_override !== false) patch.auto_approve_override = null;
    if (typeof patch.waitlist_hold_hours !== 'number') patch.waitlist_hold_hours = null;
    const { error } = await supabase.from('books').update(patch).eq('id', bookId);
    dbError(error);
    return json(req, { ok: true });
  }
  if (bookId && method === 'DELETE') {
    await requireAdmin(req);
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    dbError(error);
    return json(req, { ok: true });
  }

  if (method === 'POST' && path === '/upload') {
    await requireAdmin(req);
    return await uploadImage(req);
  }

  if (method === 'POST' && path === '/me/avatar') {
    const auth = await requireReader(req);
    const input = await body(req);
    const url = await uploadImageData(input.data, 'avatars', 3 * 1024 * 1024);
    const { data, error } = await supabase
      .from('app_users')
      .update({ avatar_url: url })
      .eq('id', auth.id)
      .select('*')
      .single();
    dbError(error);
    return json(req, { url, user: publicUser(data) });
  }

  if (method === 'POST' && path === '/me/complete-setup') {
    const auth = await requireReader(req);
    const input = await body(req);
    const access_code = String(input.access_code || '').trim().toUpperCase();
    const password = String(input.password || '');
    if (!access_code || password.length < 4) throw new HttpError(400, 'código e senha obrigatórios');
    const user = await findUser(auth.id as number);
    if (!user) throw new HttpError(404, 'usuário não existe');
    const other = await findUserByCode(access_code);
    if (other && other.id !== user.id) throw new HttpError(400, 'código já em uso');
    const password_hash = await hashPassword(password);
    const { data, error } = await supabase
      .from('app_users')
      .update({ access_code, password_hash, force_password_change: false })
      .eq('id', auth.id)
      .select('*')
      .single();
    dbError(error);
    return json(req, await userSession(data));
  }

  if (method === 'GET' && path === '/users') {
    await requireAdmin(req);
    const { data, error } = await supabase
      .from('app_users')
      .select('id,name,email,is_admin,is_super,avatar_url,books_read,created_at,force_password_change,last_seen_at')
      .order('name');
    dbError(error);
    const { data: reads, error: readsError } = await supabase
      .from('loans')
      .select('user_id')
      .eq('status', 'returned')
      .not('returned_at', 'is', null);
    dbError(readsError);
    const counts = new Map<number, number>();
    for (const read of reads || []) counts.set(read.user_id, (counts.get(read.user_id) || 0) + 1);
    return json(req, (data || []).map(user => ({
      ...user,
      books_read: counts.get(user.id) || 0
    })));
  }
  if (method === 'POST' && path === '/users') {
    await requireAdmin(req);
    const input = await body(req);
    if (!input.name) throw new HttpError(400, 'nome obrigatório');
    if (!input.password || String(input.password).length < 4) throw new HttpError(400, 'senha mínima 4 caracteres');
    const finalCode = await hiddenAccessCode();
    const password_hash = await hashPassword(String(input.password));
    const { data, error } = await supabase.from('app_users').insert({
      name: input.name,
      email: input.email || '',
      access_code: finalCode,
      is_admin: !!input.is_admin,
      password_hash,
      force_password_change: true,
      avatar_url: input.avatar_url || ''
    }).select('id,is_admin,force_password_change').single();
    dbError(error);
    return json(req, data);
  }
  const userId = path.match(/^\/users\/(\d+)$/)?.[1];
  if (userId && method === 'PUT') {
    const auth = await requireAdmin(req);
    const target = await findUser(userId);
    if (!target) throw new HttpError(404, 'usuário não existe');
    if (target.is_super && auth.id !== target.id) throw new HttpError(403, 'usuário protegido');
    const input = await body(req);
    const patch: Record<string, unknown> = { name: input.name, email: input.email };
    if (typeof input.avatar_url === 'string') patch.avatar_url = input.avatar_url;
    if (typeof input.is_admin === 'boolean') {
      patch.is_admin = input.is_admin;
      if (input.is_admin && !target.password_hash && (!input.password || String(input.password).length < 4)) {
        throw new HttpError(400, 'senha obrigatória para promover a admin');
      }
      if (!input.is_admin) patch.force_password_change = true;
    }
    if (input.password && String(input.password).length >= 4) {
      patch.password_hash = await hashPassword(String(input.password));
      patch.force_password_change = true;
    }
    const { error } = await supabase.from('app_users').update(patch).eq('id', userId);
    dbError(error);
    return json(req, { ok: true });
  }
  if (userId && method === 'DELETE') {
    await requireAdmin(req);
    const target = await findUser(userId);
    if (!target) throw new HttpError(404, 'usuário não existe');
    if (target.is_super) throw new HttpError(403, 'usuário protegido');
    const { error } = await supabase.from('app_users').delete().eq('id', userId);
    dbError(error);
    return json(req, { ok: true });
  }
  const regenUserId = path.match(/^\/users\/(\d+)\/regenerate-code$/)?.[1];
  if (regenUserId && method === 'POST') {
    await requireAdmin(req);
    throw new HttpError(403, 'código oculto');
  }

  if (method === 'POST' && path === '/loans/request') {
    const input = await body(req);
    const user = await resolveActionUser(req, input);
    const book = await findBook(input.book_id);
    if (!book) throw new HttpError(404, 'livro não existe');
    if (await activeLoanForBook(input.book_id)) throw new HttpError(400, 'livro indisponível');
    const queue = await waitlistForBook(input.book_id);
    const firstWithHold = queue.find(item => item.hold_until && new Date(item.hold_until) > new Date());
    if (firstWithHold && firstWithHold.user_id !== user.id) {
      const heldFor = await findUser(firstWithHold.user_id);
      throw new HttpError(403, `livro reservado para ${heldFor?.name || 'outro usuário'} até ${new Date(firstWithHold.hold_until).toLocaleString('pt-BR')}`);
    }
    if (queue[0] && queue[0].user_id === user.id && queue[0].hold_until && new Date(queue[0].hold_until) < new Date()) {
      await supabase.from('waitlist').update({ expired: true }).eq('id', queue[0].id);
      return json(req, {
        error: 'tempo_expirado',
        message: 'Você perdeu o tempo para retirada. Deseja entrar novamente na fila?',
        can_rejoin: true
      }, 410);
    }
    if (queue[0] && queue[0].user_id === user.id) await supabase.from('waitlist').delete().eq('id', queue[0].id);
    const settings = await getSettings();
    const auto = !needsApproval(book, settings);
    const days = book.default_days || settings.default_days || 14;
    const loan = await createLoan({ book_id: input.book_id, user_id: user.id, status: auto ? 'approved' : 'pending', days, auto_approved: auto });
    await createNotification({
      type: auto ? 'loan_auto' : 'loan_request',
      title: auto ? 'Empréstimo automático' : 'Solicitação aguardando aprovação',
      message: auto ? `${user.name} pegou ${book.title}` : `${user.name} solicitou ${book.title}`,
      loan_id: loan.id,
      book_id: book.id,
      user_id: user.id
    });
    return json(req, {
      id: loan.id,
      user_name: user.name,
      status: loan.status,
      days,
      due_at: loan.due_at,
      auto_approved: !!auto,
      book_title: book.title
    });
  }

  if (method === 'POST' && path === '/loans/self-approve') {
    const auth = await requireAdmin(req);
    const input = await body(req);
    const targetUserId = input.user_id || auth.id;
    const targetUser = await findUser(targetUserId);
    if (!targetUser) throw new HttpError(404, 'usuário não existe');
    const book = await findBook(input.book_id);
    if (!book) throw new HttpError(404, 'livro não existe');
    if (await activeLoanForBook(input.book_id)) throw new HttpError(400, 'livro indisponível');
    const loan = await createLoan({
      book_id: input.book_id,
      user_id: targetUserId,
      status: 'approved',
      approved_by: auth.id,
      days: parseInt(String(input.days || ''), 10) || book.default_days || 14
    });
    return json(req, { id: loan.id });
  }

  if (method === 'GET' && path === '/loans') {
    await requireAdmin(req);
    return json(req, await listLoans());
  }

  const approveLoanId = path.match(/^\/loans\/(\d+)\/approve$/)?.[1];
  if (approveLoanId && method === 'POST') {
    const auth = await requireAdmin(req);
    const loan = await findLoan(approveLoanId);
    if (!loan || loan.status !== 'pending') throw new HttpError(400, 'empréstimo não está pendente');
    const book = await findBook(loan.book_id);
    const input = await body(req);
    const days = parseInt(String(input.days || ''), 10) || book?.default_days || 14;
    const now = new Date();
    await updateLoan(loan.id, {
      status: 'approved',
      approved_at: now.toISOString(),
      due_at: new Date(now.getTime() + days * 86400000).toISOString(),
      days,
      approved_by: auth.id,
      reminder_sent: false,
      overdue_notified: false
    });
    return json(req, { ok: true });
  }

  const rejectLoanId = path.match(/^\/loans\/(\d+)\/reject$/)?.[1];
  if (rejectLoanId && method === 'POST') {
    await requireAdmin(req);
    const loan = await findLoan(rejectLoanId);
    if (loan && loan.status === 'pending') await updateLoan(loan.id, { status: 'rejected' });
    return json(req, { ok: true });
  }

  const returnLoanId = path.match(/^\/loans\/(\d+)\/return$/)?.[1];
  if (returnLoanId && method === 'POST') {
    const auth = await requireAdmin(req);
    const loan = await findLoan(returnLoanId);
    if (!loan || loan.status !== 'approved') return json(req, { ok: false });
    await updateLoan(loan.id, {
      status: 'returned',
      returned_at: new Date().toISOString(),
      returned_by: auth.id
    });
    const user = await findUser(loan.user_id);
    await supabase.from('app_users').update({ books_read: (user?.books_read || 0) + 1 }).eq('id', loan.user_id);
    const queue = await waitlistForBook(loan.book_id);
    if (queue.length > 0) {
      const [book, settings] = await Promise.all([findBook(loan.book_id), getSettings()]);
      if (book) {
        const hold = new Date(Date.now() + holdHoursForBook(book, settings) * 3600 * 1000).toISOString();
        await supabase.from('waitlist').update({ hold_until: hold }).eq('id', queue[0].id);
        const nextUser = await findUser(queue[0].user_id);
        await createNotification({
          type: 'waitlist_turn',
          title: 'Vez na fila chegou',
          message: `${book.title} disponível para ${nextUser?.name || 'usuário'}. Hold até ${new Date(hold).toLocaleString('pt-BR')}`,
          book_id: book.id,
          user_id: queue[0].user_id,
          waitlist_id: queue[0].id
        });
        await runWaitlistReleaseAutomations(book, queue[0], hold);
      }
    }
    return json(req, { ok: true });
  }

  const renewLoanId = path.match(/^\/loans\/(\d+)\/renew$/)?.[1];
  if ((method === 'POST' && !!renewLoanId) || (method === 'POST' && path === '/loans/renew-by-book')) {
    const input = await body(req);
    const loan = renewLoanId
      ? await findLoan(renewLoanId)
      : await activeLoanForBook(input.book_id);
    if (!loan || loan.status !== 'approved') throw new HttpError(400, 'empréstimo não está ativo');
    const user = await resolveActionUser(req, input);
    if (!user || user.id !== loan.user_id) throw new HttpError(401, 'código não confere com o empréstimo');
    const queue = await waitlistForBook(loan.book_id);
    if (queue.length > 0) throw new HttpError(400, 'há fila de espera, renovação não permitida');
    const book = await findBook(loan.book_id);
    const addDays = book?.default_days || 14;
    const newDue = new Date((loan.due_at ? new Date(loan.due_at).getTime() : Date.now()) + addDays * 86400000);
    await updateLoan(loan.id, {
      due_at: newDue.toISOString(),
      renewed_count: (loan.renewed_count || 0) + 1,
      reminder_sent: false,
      overdue_notified: false
    });
    return json(req, { ok: true, due_at: newDue.toISOString(), renewed_count: (loan.renewed_count || 0) + 1 });
  }

  if (method === 'POST' && path === '/loans/return-by-book') {
    const input = await body(req);
    const loan = await activeLoanForBook(input.book_id);
    if (!loan || loan.status !== 'approved') throw new HttpError(400, 'empréstimo não está ativo');
    const user = await resolveActionUser(req, input);
    if (!user || user.id !== loan.user_id) throw new HttpError(401, 'código não confere com o empréstimo');
    const book = await findBook(loan.book_id);
    await updateLoan(loan.id, {
      status: 'returned',
      returned_at: new Date().toISOString(),
      returned_by: user.id,
      self_returned: true
    });
    const rating = Number(input.rating);
    if (rating >= 1 && rating <= 5) {
      const { error: reviewError } = await supabase.from('reviews').upsert({
        loan_id: loan.id,
        book_id: loan.book_id,
        user_id: user.id,
        rating,
        comment: String(input.review || '').trim()
      }, { onConflict: 'loan_id' });
      dbError(reviewError);
    }
    await supabase.from('app_users').update({ books_read: (user.books_read || 0) + 1 }).eq('id', user.id);
    const queue = await waitlistForBook(loan.book_id);
    if (queue.length > 0 && book) {
      const settings = await getSettings();
      const hold = new Date(Date.now() + holdHoursForBook(book, settings) * 3600 * 1000).toISOString();
      await supabase.from('waitlist').update({ hold_until: hold }).eq('id', queue[0].id);
      const nextUser = await findUser(queue[0].user_id);
      await createNotification({
        type: 'waitlist_turn',
        title: 'Vez na fila chegou',
        message: `${book.title} disponível para ${nextUser?.name || 'usuário'}. Hold até ${new Date(hold).toLocaleString('pt-BR')}`,
        book_id: book.id,
        user_id: queue[0].user_id,
        waitlist_id: queue[0].id
      });
      await runWaitlistReleaseAutomations(book, queue[0], hold);
    }
    await createNotification({
      type: 'self_return',
      title: 'Devolução pelo leitor — verificar',
      message: `${user.name} marcou ${book?.title || 'livro'} como devolvido. Confira fisicamente.`,
      loan_id: loan.id,
      book_id: loan.book_id,
      user_id: user.id
    });
    return json(req, { ok: true });
  }

  if (method === 'POST' && path === '/waitlist/join') {
    const input = await body(req);
    const user = await resolveActionUser(req, input);
    const book = await findBook(input.book_id);
    if (!book) throw new HttpError(404, 'livro não existe');
    const active = await activeLoanForBook(input.book_id);
    if (!active) throw new HttpError(400, 'livro disponível, faça empréstimo direto');
    if (active.user_id === user.id) throw new HttpError(400, 'você já está com o livro');
    if (await isUserInWaitlist(Number(input.book_id), user.id)) throw new HttpError(400, 'você já está na fila');
    const { data, error } = await supabase.from('waitlist').insert({
      book_id: Number(input.book_id),
      user_id: user.id
    }).select('*').single();
    dbError(error);
    const position = (await waitlistForBook(input.book_id)).findIndex(item => item.id === data.id) + 1;
    await createNotification({
      type: 'waitlist_join',
      title: 'Entrou na fila',
      message: `${user.name} entrou na fila de ${book.title} (posição ${position})`,
      book_id: book.id,
      user_id: user.id,
      waitlist_id: data.id
    });
    return json(req, { id: data.id, position, user_name: user.name, book_title: book.title });
  }

  if (method === 'GET' && path === '/waitlist') {
    await requireAdmin(req);
    return json(req, await listWaitlist());
  }
  const waitlistId = path.match(/^\/waitlist\/(\d+)$/)?.[1];
  if (waitlistId && method === 'DELETE') {
    await requireAdmin(req);
    const { error } = await supabase.from('waitlist').delete().eq('id', waitlistId);
    dbError(error);
    return json(req, { ok: true });
  }

  if (method === 'GET' && path === '/categories') {
    const { data, error } = await supabase.from('categories').select('name').order('name');
    dbError(error);
    return json(req, (data || []).map(item => item.name).filter(Boolean));
  }
  if (method === 'POST' && path === '/categories') {
    await requireAdmin(req);
    const input = await body(req);
    const category = await ensureCategory(input.name);
    if (!category) throw new HttpError(400, 'categoria obrigatória');
    return json(req, category);
  }
  const categoryName = path.match(/^\/categories\/(.+)$/)?.[1];
  if (categoryName && method === 'DELETE') {
    await requireAdmin(req);
    const { error } = await supabase.from('categories').delete().eq('name', decodeURIComponent(categoryName));
    dbError(error);
    return json(req, { ok: true });
  }

  if (method === 'GET' && path === '/stats/reads') {
    await requireAdmin(req);
    return json(req, await readStats(
      normalizePeriod(url.searchParams.get('start')),
      normalizePeriod(url.searchParams.get('end'), true)
    ));
  }

  if (method === 'GET' && path === '/reads') {
    await requireAdmin(req);
    return json(req, await readEntries(
      normalizePeriod(url.searchParams.get('start')),
      normalizePeriod(url.searchParams.get('end'), true)
    ));
  }
  const readId = path.match(/^\/reads\/(\d+)$/)?.[1];
  if (readId && method === 'PUT') {
    await requireAdmin(req);
    const loan = await findLoan(readId);
    if (!loan || loan.status !== 'returned') throw new HttpError(404, 'registro não encontrado');
    const input = await body(req);
    const returnedAt = new Date(String(input.returned_at || ''));
    if (!input.user_id || !input.book_id || Number.isNaN(returnedAt.getTime())) {
      throw new HttpError(400, 'usuário, livro e data obrigatórios');
    }
    await updateLoan(readId, {
      user_id: Number(input.user_id),
      book_id: Number(input.book_id),
      returned_at: returnedAt.toISOString()
    });
    await recalcBooksRead(loan.user_id);
    await recalcBooksRead(Number(input.user_id));
    return json(req, { ok: true });
  }
  if (readId && method === 'DELETE') {
    await requireAdmin(req);
    const loan = await findLoan(readId);
    if (!loan || loan.status !== 'returned') throw new HttpError(404, 'registro não encontrado');
    const { error } = await supabase.from('loans').delete().eq('id', readId);
    dbError(error);
    await recalcBooksRead(loan.user_id);
    return json(req, { ok: true });
  }

  if (method === 'GET' && path === '/stats/top-readers') {
    const settings = await getSettings();
    if (!settings.show_top_readers) return json(req, []);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return json(req, (await readStats(start, end)).slice(0, 3));
  }

  if (method === 'POST' && path === '/suggestions') {
    const auth = await requireReader(req);
    const input = await body(req);
    const message = String(input.message || '').trim();
    if (!message) throw new HttpError(400, 'texto obrigatório');
    const { data, error } = await supabase.from('suggestions').insert({
      user_id: auth.id,
      title: String(input.title || 'Sugestão').trim() || 'Sugestão',
      message
    }).select('*').single();
    dbError(error);
    await createNotification({
      type: 'suggestion',
      title: 'Nova sugestão',
      message: `${auth.name || 'Usuário'} enviou uma sugestão`,
      user_id: auth.id
    });
    return json(req, data);
  }

  if (method === 'GET' && path === '/suggestions') {
    await requireAdmin(req);
    const { data, error } = await supabase
      .from('suggestions')
      .select('*, app_users(name)')
      .order('created_at', { ascending: false });
    dbError(error);
    return json(req, (data || []).map(item => ({
      ...item,
      user_name: item.app_users?.name || '?'
    })));
  }
  const suggestionId = path.match(/^\/suggestions\/(\d+)$/)?.[1];
  if (suggestionId && method === 'DELETE') {
    await requireAdmin(req);
    const { error } = await supabase.from('suggestions').delete().eq('id', suggestionId);
    dbError(error);
    return json(req, { ok: true });
  }

  if (method === 'GET' && path === '/reviews') {
    await requireAdmin(req);
    const { data, error } = await supabase
      .from('reviews')
      .select('*, app_users(name), books(title,cover_url)')
      .order('created_at', { ascending: false });
    dbError(error);
    return json(req, (data || []).map(item => ({
      ...item,
      user_name: item.app_users?.name || '?',
      book_title: item.books?.title || '?',
      cover_url: item.books?.cover_url || ''
    })));
  }
  const reviewId = path.match(/^\/reviews\/(\d+)$/)?.[1];
  if (reviewId && method === 'DELETE') {
    await requireAdmin(req);
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    dbError(error);
    return json(req, { ok: true });
  }

  if (method === 'GET' && path === '/notifications') {
    await requireAdmin(req);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_role', 'admin')
      .order('created_at', { ascending: false })
      .limit(50);
    dbError(error);
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_role', 'admin')
      .eq('read', false);
    dbError(countError);
    return json(req, { list: data || [], unread: count || 0 });
  }
  if (method === 'POST' && path === '/notifications/send-user') {
    await requireAdmin(req);
    const input = await body(req);
    const userId = Number(input.user_id);
    const message = String(input.message || '').trim();
    if (!userId || !message) throw new HttpError(400, 'usuário e aviso obrigatórios');
    const user = await findUser(userId);
    if (!user) throw new HttpError(404, 'usuário não existe');
    const { data: activeLoans, error: activeLoansError } = await supabase
      .from('loans')
      .select('id,book_id,due_at')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('due_at');
    dbError(activeLoansError);
    const bookIds = [...new Set((activeLoans || []).map(loan => loan.book_id))];
    const { data: books, error: booksError } = bookIds.length
      ? await supabase.from('books').select('id,title').in('id', bookIds)
      : { data: [], error: null };
    dbError(booksError);
    const bookTitles = new Map((books || []).map(book => [book.id, book.title]));
    const loanDetails = (activeLoans || []).map(loan => {
      const days = loan.due_at
        ? Math.ceil((new Date(loan.due_at).getTime() - Date.now()) / 86400000)
        : 0;
      return `${bookTitles.get(loan.book_id) || 'Livro'} — devolução: ${formatAutomationDate(loan.due_at)} — ${days} dia(s) restante(s)`;
    }).join('\n') || 'Nenhum empréstimo ativo.';
    const firstLoan = activeLoans?.[0];
    const variables = {
      usuario: user.name || 'usuário',
      email: user.email || '',
      emprestimo: loanDetails,
      livro: firstLoan ? bookTitles.get(firstLoan.book_id) || 'Livro' : '',
      dias: firstLoan?.due_at
        ? Math.ceil((new Date(firstLoan.due_at).getTime() - Date.now()) / 86400000)
        : '',
      data_devolucao: formatAutomationDate(firstLoan?.due_at)
    };
    const title = APP_NOTIFICATION_TITLE;
    const renderedMessage = renderAutomationText(message, variables);
    const notification = await createNotification({
      type: 'admin_message',
      title,
      message: renderedMessage,
      user_id: userId,
      recipient_role: 'user',
      recipient_user_id: userId
    });
    let bitrixDelivery: Record<string, unknown> = { status: 'not_applicable' };
    try {
      bitrixDelivery = await sendBitrixUserNotification(user, renderedMessage);
    } catch (error) {
      bitrixDelivery = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'falha ao enviar para o Bitrix24'
      };
    }
    return json(req, { ...notification, bitrix_delivery: bitrixDelivery });
  }
  if (method === 'POST' && path === '/notifications/send-all') {
    await requireAdmin(req);
    const input = await body(req);
    const message = String(input.message || '').trim();
    if (!message) throw new HttpError(400, 'aviso obrigatório');
    const { data: users, error } = await supabase.from('app_users').select('id');
    dbError(error);
    let sent = 0;
    for (const user of users || []) {
      await createNotification({
        type: 'admin_message',
        title: APP_NOTIFICATION_TITLE,
        message,
        user_id: user.id,
        recipient_role: 'user',
        recipient_user_id: user.id
      });
      sent += 1;
    }
    return json(req, { ok: true, sent });
  }
  if (method === 'GET' && path === '/me/notifications') {
    const auth = await requireReader(req);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_role', 'user')
      .eq('recipient_user_id', auth.id)
      .order('created_at', { ascending: false })
      .limit(50);
    dbError(error);
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_role', 'user')
      .eq('recipient_user_id', auth.id)
      .eq('read', false);
    dbError(countError);
    return json(req, { list: data || [], unread: count || 0 });
  }
  const readNotificationId = path.match(/^\/notifications\/(\d+)\/read$/)?.[1];
  if (readNotificationId && method === 'POST') {
    await requireAdmin(req);
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', readNotificationId).eq('recipient_role', 'admin');
    dbError(error);
    return json(req, { ok: true });
  }
  const readMyNotificationId = path.match(/^\/me\/notifications\/(\d+)\/read$/)?.[1];
  if (readMyNotificationId && method === 'POST') {
    const auth = await requireReader(req);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', readMyNotificationId)
      .eq('recipient_role', 'user')
      .eq('recipient_user_id', auth.id);
    dbError(error);
    return json(req, { ok: true });
  }
  if (method === 'POST' && path === '/notifications/read-all') {
    await requireAdmin(req);
    const { error } = await supabase.from('notifications').update({ read: true }).eq('recipient_role', 'admin').eq('read', false);
    dbError(error);
    return json(req, { ok: true });
  }
  if (method === 'POST' && path === '/notifications/cleanup') {
    await requireAdmin(req);
    const input = await body(req);
    const start = new Date(String(input.start || ''));
    const end = new Date(String(input.end || ''));
    if (!input.start || !input.end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new HttpError(400, 'período obrigatório');
    }
    const { count, error } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .not('type', 'like', 'automation_%')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    dbError(error);
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .update({
        notifications_last_cleanup_at: new Date().toISOString(),
        notifications_cleanup_reminder_sent: false
      })
      .eq('id', 1)
      .select('*')
      .single();
    dbError(settingsError);
    return json(req, { ok: true, deleted: count || 0, settings });
  }
  if (method === 'POST' && path === '/me/notifications/read-all') {
    const auth = await requireReader(req);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_role', 'user')
      .eq('recipient_user_id', auth.id)
      .eq('read', false);
    dbError(error);
    return json(req, { ok: true });
  }

  if (method === 'POST' && path === '/cron/reminders') {
    if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) throw new HttpError(403, 'cron negado');
    await runReminders();
    return json(req, { ok: true });
  }

  throw new HttpError(404, 'não encontrado');
}

Deno.serve(async req => {
  try {
    return await handle(req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'erro';
    return json(req, { error: message }, status);
  }
});
