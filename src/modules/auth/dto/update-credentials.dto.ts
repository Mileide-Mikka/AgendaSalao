import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  isValidBrPhone,
  phoneDigits,
} from '../../../common/validation/phone';

export const UpdateCredentialsSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter pelo menos 2 caracteres')
      .max(120)
      .optional(),
    title: z.string().trim().max(80, 'Profissão muito longa').optional(),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => v === undefined || v === '' || isValidBrPhone(v), {
        message: 'Telefone inválido. Use DDD + número (ex.: (11) 98765-4321)',
      }),
    email: z.string().email('E-mail inválido').optional(),
    newPassword: z
      .string()
      .min(6, 'A nova senha deve ter pelo menos 6 caracteres')
      .max(128)
      .optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasProfile =
      data.name !== undefined ||
      data.title !== undefined ||
      data.phone !== undefined ||
      data.email !== undefined ||
      data.newPassword !== undefined;

    if (!hasProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um dado para atualizar',
        path: ['name'],
      });
    }

    if (data.newPassword && data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A confirmação da senha não confere',
        path: ['confirmPassword'],
      });
    }
  })
  .transform((data) => ({
    ...data,
    phone:
      data.phone === undefined
        ? undefined
        : data.phone === ''
          ? ''
          : phoneDigits(data.phone),
    title: data.title === undefined ? undefined : data.title.trim(),
  }));

export class UpdateCredentialsDto extends createZodDto(UpdateCredentialsSchema) {}
