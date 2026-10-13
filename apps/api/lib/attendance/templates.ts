/** #907 Shift template shape and body schema. */
import { z } from 'zod';
import { hhmmSchema, shiftColorSchema } from './schemas';

export interface TemplateRow {
  id: number;
  outletId: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: string;
  isActive: boolean;
}

export function templateView(t: TemplateRow, used: boolean) {
  return {
    id: t.id,
    outletId: t.outletId,
    name: t.name,
    startTime: t.startTime,
    endTime: t.endTime,
    breakMinutes: t.breakMinutes,
    color: t.color,
    isActive: t.isActive,
    used,
  };
}

export const templateBodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  startTime: hhmmSchema,
  endTime: hhmmSchema,
  breakMinutes: z.number().int().min(0).max(600),
  color: shiftColorSchema,
});

/** #907 Weekly rule shape. */
export interface RuleRow {
  id: number;
  outletId: number;
  userId: number;
  templateId: number;
  weekdays: number[];
  startDate: string;
  endDate?: string | null;
}

export function ruleView(r: RuleRow) {
  return {
    id: r.id,
    outletId: r.outletId,
    userId: r.userId,
    templateId: r.templateId,
    weekdays: r.weekdays,
    startDate: r.startDate,
    endDate: r.endDate ?? null,
  };
}
