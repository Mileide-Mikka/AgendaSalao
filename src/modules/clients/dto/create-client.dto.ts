import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  isValidBrMobile,
  isValidBrPhone,
  phoneDigits,
} from '../../../common/validation/phone';

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(z.string().email('E-mail inválido').optional());

export const CreateClientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter pelo menos 2 caracteres')
      .max(120, 'Nome muito longo'),
    phone: z
      .string()
      .trim()
      .min(1, 'Informe o telefone ou celular')
      .refine(isValidBrPhone, {
        message:
          'Telefone inválido. Use DDD + número (ex.: (11) 98765-4321)',
      }),
    email: optionalEmail,
    notes: z.string().trim().max(500, 'Máximo de 500 caracteres').optional(),
    phoneIsWhatsapp: z.boolean().default(false),
    prefersMessageContact: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.phoneIsWhatsapp && !isValidBrMobile(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message:
          'Para WhatsApp, informe um celular com DDD (11 dígitos, ex.: (11) 98765-4321)',
      });
    }
    if (data.prefersMessageContact && !data.phoneIsWhatsapp) {
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
    phone: phoneDigits(data.phone),
    email: data.email,
    notes: data.notes?.trim() ? data.notes.trim() : undefined,
  }));

export class CreateClientDto extends createZodDto(CreateClientSchema) {}
