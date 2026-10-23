/**
 * Contratos del contexto de comunicaciones (`apreu-api/src/modules/communications`).
 * Reflejan los read models de `application/views.ts` y los DTO de `infrastructure/http/dto`.
 */
import type { Page } from '../../../core';
import type { BadgeTone } from '../../../shared/ui';

/** Respuesta paginada de la API (`{ items, total, page, limit }`). */
export interface ApiPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Convierte la paginación de la API (`limit`) a la convención del frontend (`pageSize`). */
export function toPage<T>(res: ApiPaginated<T>): Page<T> {
  return {
    items: res.items ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    pageSize: res.limit,
  };
}

export interface PagedQuery {
  page?: number;
  pageSize?: number;
  search?: string | null;
}

/** Totales de un envío masivo. */
export interface DeliverySummary {
  total: number;
  sent: number;
  failed: number;
  /** Destinatarios sin el dato de contacto requerido por el canal. */
  skipped: number;
  failures: { to: string; error: string }[];
}

// ───────────────────────────── Correo ─────────────────────────────

export const EMAIL_TYPES = ['aviso', 'factura_cobro', 'factura_dian', 'otro'] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];
export const EMAIL_STATUSES = ['sent', 'failed', 'pending'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  aviso: 'Aviso',
  factura_cobro: 'Cobro',
  factura_dian: 'DIAN',
  otro: 'Otro',
};
export const EMAIL_TYPE_TONES: Record<EmailType, BadgeTone> = {
  aviso: 'info',
  factura_cobro: 'success',
  factura_dian: 'warning',
  otro: 'neutral',
};

export interface EmailKpis {
  total: number;
  notices: number;
  billing: number;
  dian: number;
  failed: number;
}

export interface EmailLog {
  id: number;
  toEmail: string;
  toName: string | null;
  subject: string;
  bodyPreview: string | null;
  type: EmailType;
  status: EmailStatus;
  errorMessage: string | null;
  sentBy: number | null;
  sentByName: string | null;
  createdAt: string | null;
}

export interface EmailLogQuery extends PagedQuery {
  type?: EmailType | null;
  status?: EmailStatus | null;
}

export const AUDIENCE_KINDS = [
  'all_parents',
  'by_grade',
  'by_classroom',
  'all_employees',
  'manual',
] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

export const AUDIENCE_LABELS: Record<AudienceKind, string> = {
  all_parents: 'Todos los acudientes',
  by_grade: 'Acudientes por grado',
  by_classroom: 'Acudientes por salón',
  all_employees: 'Todos los empleados',
  manual: 'Correos manuales',
};

export interface SendNoticeRequest {
  audience: AudienceKind;
  gradeId?: number | null;
  classroomId?: number | null;
  /** Correos separados por coma (audience = manual). */
  manualEmails?: string | null;
  subject: string;
  bodyHtml: string;
  attachments: readonly File[];
}

/** Límites de adjuntos (validados también en el servidor). */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
  'gif',
];
export const MAX_MANUAL_EMAILS = 500;

export type SmtpProfile = 'general' | 'invoicing';
export interface SmtpTestResult {
  to: string;
  host: string;
  port: number;
  security: string;
}

export type EmailImageKind = 'logo' | 'promo';
export const MAX_EMAIL_IMAGE_BYTES = 2 * 1024 * 1024;
export const EMAIL_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
export interface EmailImageResult {
  kind: EmailImageKind;
  path: string;
  contentType: string;
  size: number;
}

// ─────────────────────────── Avisos de cobro ───────────────────────────

export const BILLING_CHANNELS = ['email', 'whatsapp'] as const;
export type BillingChannel = (typeof BILLING_CHANNELS)[number];

export interface BillingPreview {
  month: string;
  charges: number;
  totalAmount: number;
  guardiansWithEmail: number;
  guardiansWithMobile: number;
  studentsWithoutEmail: number;
}

export interface SendBillingRequest {
  month: string;
  conceptId?: number | null;
  channels: BillingChannel[];
  templateName?: string | null;
}

export interface BillingResult {
  charges: number;
  email: DeliverySummary | null;
  whatsapp: DeliverySummary | null;
}

/** Catálogos de otros contextos usados por los formularios (solo lectura). */
export interface BillingConceptOption {
  id: number;
  name: string;
  isActive: boolean;
}
export interface GradeOption {
  id: number;
  name: string;
  level: string;
}
export interface ClassroomOption {
  id: number;
  name: string;
  gradeName: string;
}

// ───────────────────────────── WhatsApp ─────────────────────────────

export const WHATSAPP_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const;
export type WhatsAppStatus = (typeof WHATSAPP_STATUSES)[number];
export const WHATSAPP_STATUS_LABELS: Record<WhatsAppStatus, string> = {
  sent: 'Enviado',
  delivered: 'Entregado',
  read: 'Leído',
  failed: 'Fallido',
};

export interface WhatsAppDashboard {
  configured: boolean;
  totals: Record<WhatsAppStatus, number>;
}

export interface WhatsAppLog {
  id: number;
  studentId: number | null;
  studentName: string | null;
  templateName: string | null;
  phone: string;
  status: WhatsAppStatus;
  waMessageId: string | null;
  response: string | null;
  createdAt: string | null;
}

export interface WhatsAppLogQuery extends PagedQuery {
  status?: WhatsAppStatus | null;
}

export const TEMPLATE_CATEGORIES = ['utility', 'marketing', 'authentication'] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  utility: 'Utilidad',
  marketing: 'Marketing',
  authentication: 'Autenticación',
};
export const TEMPLATE_STATUSES = ['active', 'pending', 'rejected'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];
export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  active: 'Activa',
  pending: 'Pendiente',
  rejected: 'Rechazada',
};
export const HEADER_TYPES = ['none', 'text', 'image'] as const;
export type HeaderType = (typeof HEADER_TYPES)[number];
export const TEMPLATE_LANGUAGES = ['es_CO', 'es_MX', 'es', 'en_US'] as const;
export const MAX_TEMPLATE_BODY = 1024;

export interface TemplateButton {
  type?: string;
  text?: string;
  url?: string | null;
  [key: string]: unknown;
}

export interface WhatsAppTemplate {
  id: number;
  name: string;
  metaTemplateId: string | null;
  language: string;
  category: TemplateCategory;
  body: string;
  variables: string[];
  placeholderCount: number;
  status: TemplateStatus;
  headerType: HeaderType;
  headerText: string | null;
  headerImageUrl: string | null;
  footerText: string | null;
  buttons: TemplateButton[];
  createdAt: string | null;
}

export type WhatsAppTemplateInput = Omit<WhatsAppTemplate, 'id' | 'placeholderCount' | 'createdAt'>;

export interface SendWhatsAppRequest {
  phone: string;
  templateName: string;
  variables: string[];
}

export interface WhatsAppSendResult {
  phone: string;
  messageId: string;
}

export interface NotifyEventRequest {
  date: string;
  name: string;
  details?: string | null;
}

/** Pago listado por finanzas (`GET /api/finance/payments`), usado para confirmar por WhatsApp. */
export interface PaymentOption {
  id: number;
  receiptNumber: string;
  studentName: string;
  studentCode: string;
  amount: number;
  paidAt: string;
  status: string;
}

/** Placeholders `{{n}}` de un cuerpo de plantilla (cantidad = mayor índice). */
export function countPlaceholders(body: string): number {
  let max = 0;
  for (const match of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) max = Math.max(max, Number(match[1]));
  return max;
}

/** Reemplaza `{{n}}` por el valor de la variable (o deja el marcador si está vacía). */
export function renderTemplate(body: string, values: readonly string[]): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (all, n: string) => values[Number(n) - 1] || all);
}

// ─────────────────────────────── IA ───────────────────────────────

export const MAX_CHAT_MESSAGE = 2000;

export interface ChatExchange {
  id: number;
  role: string;
  userMessage: string;
  aiResponse: string | null;
  createdAt: string | null;
}

export interface ChatLog extends ChatExchange {
  userId: number;
  userName: string | null;
  userEmail: string | null;
}

export interface ChatLogQuery extends PagedQuery {
  role?: string | null;
  from?: string | null;
  to?: string | null;
}

export const MARKETING_TYPES = [
  'estrategia',
  'sociales',
  'email',
  'whatsapp',
  'contenido',
  'tendencias',
] as const;
export type MarketingType = (typeof MARKETING_TYPES)[number];
export const MIN_MARKETING_CONTEXT = 10;
export const MAX_MARKETING_CONTEXT = 2000;

export interface MarketingTypeInfo {
  type: MarketingType;
  icon: string;
  title: string;
  description: string;
  color: string;
}

export interface MarketingGeneration {
  id: number;
  type: MarketingType;
  contextInput: string;
  crmData: Record<string, unknown>;
  aiResponse: string | null;
  createdAt: string | null;
}

export interface MarketingHistoryQuery extends PagedQuery {
  type?: MarketingType | null;
  date?: string | null;
}

// ─────────────────────────── Notificaciones internas ───────────────────────────

export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const MAX_NOTIFICATION_MESSAGE = 2000;

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string | null;
}

/** `GET /api/notifications`: página de notificaciones propias + total de no leídas (badge). */
export interface MyNotifications extends Page<AppNotification> {
  unread: number;
}

export interface NotificationsQuery {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface SendNotificationRequest {
  userIds: number[];
  title: string;
  message: string;
  type?: NotificationType;
}
