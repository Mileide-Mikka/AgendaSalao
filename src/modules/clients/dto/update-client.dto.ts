import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  isValidBrMobile,
  isValidBrPhone,
  phoneDigits,
} from '../../../common/validation/phone';

const optionalEmail = z
  .union([
    z.literal(''),
    z.string().trim().email('E-mail inválido'),
  ])
  .optional();

export const UpdateClientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter pelo menos 2 caracteres')
      .max(120)
      .optional(),
    phone: z
      .string()
      .trim()
      .refine(isValidBrPhone, {
        message:
          'Telefone inválido. Use DDD + número (ex.: (11) 98765-4321)',
      })
      .optional(),
    email: optionalEmail,
    notes: z.string().trim().max(500).optional(),
    phoneIsWhatsapp: z.boolean().optional(),
    prefersMessageContact: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo',
  })
  .superRefine((data, ctx) => {
    const wantsWhatsapp = data.phoneIsWhatsapp === true;
    const wantsMessage = data.prefersMessageContact === true;

    if (wantsWhatsapp && data.phone !== undefined && !isValidBrMobile(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message:
          'Para WhatsApp, informe um celular com DDD (11 dígitos, ex.: (11) 98765-4321)',
      });
    }

    if (wantsMessage && data.phoneIsWhatsapp === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prefersMessageContact'],
        message:
          'Para preferir atendimento por mensagem, marque que o número é WhatsApp',
      });
    }
  })
  .transform((data) => ({
    ...data,
    phone: data.phone !== undefined ? phoneDigits(data.phone) : undefined,
    email:
      data.email === undefined
        ? undefined
        : data.email === ''
          ? ''
          : data.email.trim(),
    notes: data.notes !== undefined ? data.notes.trim() : undefined,
  }));

export class UpdateClientDto extends createZodDto(UpdateClientSchema) {}
