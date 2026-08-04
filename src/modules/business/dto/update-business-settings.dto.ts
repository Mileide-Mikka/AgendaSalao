import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  parseHmToMinutes,
  WEEKDAY_KEYS,
} from '../../../common/datetime/salon-time';

const hm = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, 'Use o formato HH:mm')
  .refine((v) => !Number.isNaN(parseHmToMinutes(v)), {
    message: 'Horário inválido',
  });

const dayScheduleSchema = z
  .object({
    open: z.boolean(),
    openTime: hm,
    closeTime: hm,
  })
  .superRefine((day, ctx) => {
    if (!day.open) return;
    const o = parseHmToMinutes(day.openTime);
    const c = parseHmToMinutes(day.closeTime);
    if (o >= c) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closeTime'],
        message: 'O fechamento deve ser depois da abertura',
      });
    }
  });

const weeklyHoursSchema = z
  .object({
    sun: dayScheduleSchema,
    mon: dayScheduleSchema,
    tue: dayScheduleSchema,
    wed: dayScheduleSchema,
    thu: dayScheduleSchema,
    fri: dayScheduleSchema,
    sat: dayScheduleSchema,
  })
  .superRefine((weekly, ctx) => {
    if (!WEEKDAY_KEYS.some((k) => weekly[k].open)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Marque pelo menos um dia de funcionamento',
      });
    }
  });

function assertOpenBeforeClose(
  open: string | undefined,
  close: string | undefined,
  closePath: string,
  ctx: z.RefinementCtx,
) {
  if (!open || !close) return;
  const o = parseHmToMinutes(open);
  const c = parseHmToMinutes(close);
  if (o >= c) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [closePath],
      message: 'O fechamento deve ser depois da abertura',
    });
  }
}

export const UpdateBusinessSettingsSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    address: z.string().trim().max(200).optional(),
    openTime: hm.optional(),
    closeTime: hm.optional(),
    saturdayOpenTime: hm.optional(),
    saturdayCloseTime: hm.optional(),
    weeklyHours: weeklyHoursSchema.optional(),
    whatsappReminder: z.boolean().optional(),
    cancelAlerts: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    assertOpenBeforeClose(data.openTime, data.closeTime, 'closeTime', ctx);
    assertOpenBeforeClose(
      data.saturdayOpenTime,
      data.saturdayCloseTime,
      'saturdayCloseTime',
      ctx,
    );
  });

export class UpdateBusinessSettingsDto extends createZodDto(
  UpdateBusinessSettingsSchema,
) {}
