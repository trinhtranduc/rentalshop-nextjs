/**
 * Attendance module API client (#908 web, routes of #907).
 * Every call goes through `authenticatedFetch`, except the public kiosk QR (`publicFetch` + `X-Kiosk-Token`),
 * which must not redirect a counter tablet to /login on 401.
 */
import { authenticatedFetch, parseApiResponse, publicFetch } from '../core';
import type { ApiResponse } from '../core';
import type {
  AttendanceExportPart,
  AttendanceKioskQr,
  AttendanceOutletSummary,
  AttendancePersonMonth,
  AttendanceRecordCreate,
  AttendanceRecordEdit,
  AttendanceSettings,
  AttendanceSettingsUpdate,
  AttendanceTimesheet,
  EffectiveSchedule,
  ShiftDayChange,
  ShiftRule,
  ShiftRuleCreate,
  ShiftTemplate,
  ShiftTemplateInput,
} from '@rentalshop/types';

const BASE = '/api/attendance';

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function send<T>(url: string, method: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await authenticatedFetch(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return parseApiResponse<T>(response);
}

const get = <T>(url: string) => send<T>(url, 'GET');

export type AttendanceKioskResult =
  | { ok: true; data: AttendanceKioskQr }
  | { ok: false; status: number; code: string };

export const attendanceApi = {
  // Outlet settings and QR (rules 7–11)
  listSettings: () => get<AttendanceOutletSummary[] | { outlets: AttendanceOutletSummary[] }>(`${BASE}/settings`),
  getSettings: (outletId: number) => get<AttendanceSettings>(`${BASE}/settings${qs({ outletId })}`),
  updateSettings: (body: AttendanceSettingsUpdate) => send<AttendanceSettings>(`${BASE}/settings`, 'PUT', body),
  newQr: (outletId: number) => send<AttendanceSettings>(`${BASE}/settings/qr`, 'POST', { outletId }),
  newKioskLink: (outletId: number) =>
    send<{ kioskToken: string } & Partial<AttendanceSettings>>(`${BASE}/settings/kiosk-link`, 'POST', { outletId }),

  /** Rule 12: public, no session. Never throws on 4xx and never redirects. */
  async kioskQr(token: string): Promise<AttendanceKioskResult> {
    const response = await publicFetch(`${BASE}/kiosk/qr`, { headers: { 'X-Kiosk-Token': token } });
    let json: { success?: boolean; data?: AttendanceKioskQr; code?: string } | null = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    if (response.ok && json?.data) return { ok: true, data: json.data };
    return { ok: false, status: response.status, code: json?.code || 'UNKNOWN' };
  },

  // Shift templates (rule 19)
  listTemplates: (outletId: number) =>
    get<ShiftTemplate[] | { templates: ShiftTemplate[] }>(`${BASE}/shift-templates${qs({ outletId })}`),
  createTemplate: (body: ShiftTemplateInput) => send<ShiftTemplate>(`${BASE}/shift-templates`, 'POST', body),
  updateTemplate: (id: number, body: ShiftTemplateInput) => send<ShiftTemplate>(`${BASE}/shift-templates/${id}`, 'PUT', body),
  setTemplateActive: (id: number, isActive: boolean) =>
    send<ShiftTemplate>(`${BASE}/shift-templates/${id}`, 'PATCH', { isActive }),
  deleteTemplate: (id: number) => send<unknown>(`${BASE}/shift-templates/${id}`, 'DELETE'),

  // Weekly rules (rule 20)
  listRules: (outletId: number) => get<ShiftRule[] | { rules: ShiftRule[] }>(`${BASE}/shift-rules${qs({ outletId })}`),
  createRules: (body: ShiftRuleCreate) => send<unknown>(`${BASE}/shift-rules`, 'POST', body),
  updateRule: (id: number, body: { templateId?: number; weekdays?: number[]; effectiveFrom: string }) =>
    send<unknown>(`${BASE}/shift-rules/${id}`, 'PUT', body),
  stopRule: (id: number, lastDate: string) => send<unknown>(`${BASE}/shift-rules/${id}/stop`, 'POST', { lastDate }),
  deleteRule: (id: number) => send<unknown>(`${BASE}/shift-rules/${id}`, 'DELETE'),

  // Effective schedule and one-day changes (rules 21, 23)
  listShifts: (outletId: number, from: string, to: string) => get<EffectiveSchedule>(`${BASE}/shifts${qs({ outletId, from, to })}`),
  setDay: (body: ShiftDayChange) => send<unknown>(`${BASE}/shifts/day`, 'PUT', body),
  clearDay: (outletId: number, userId: number, date: string) =>
    send<unknown>(`${BASE}/shifts/day${qs({ outletId, userId, date })}`, 'DELETE'),

  // Timesheet, person month, records, month lock (rules 26–31)
  timesheet: (outletId: number, month: string) =>
    get<AttendanceTimesheet>(`${BASE}/timesheet${qs({ outletId, month })}`),
  personMonth: (userId: number, outletId: number, month: string) =>
    get<AttendancePersonMonth>(`${BASE}/people/${userId}/month${qs({ outletId, month })}`),
  editRecord: (id: number, body: AttendanceRecordEdit) => send<unknown>(`${BASE}/records/${id}`, 'PATCH', body),
  addRecord: (body: AttendanceRecordCreate) => send<unknown>(`${BASE}/records`, 'POST', body),
  lockMonth: (outletId: number, month: string) => send<unknown>(`${BASE}/months/lock`, 'POST', { outletId, month }),
  unlockMonth: (outletId: number, month: string) => send<unknown>(`${BASE}/months/unlock`, 'POST', { outletId, month }),

  /** Rule 31: the `.xlsx` file. */
  async exportTimesheet(outletId: number, month: string, parts: AttendanceExportPart[]): Promise<Blob> {
    const response = await authenticatedFetch(`${BASE}/timesheet/export${qs({ outletId, month, parts: parts.join(',') })}`);
    if (!response.ok) {
      await parseApiResponse(response);
      throw new Error('Failed to export timesheet');
    }
    return response.blob();
  },
};
