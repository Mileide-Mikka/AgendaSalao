import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  isValidBrPhone,
  phoneDigits,
} from '../../../common/validation/phone';

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .refine((v) => v === undefined || v === '' || isValidBrPhone(v), {
    message: 'Telefone inválido. Use DDD + número (ex.: (11) 98765-4321)',
  })
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === '') return '';
    return phoneDigits(v);
  });

export const UpdateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: optionalPhone,
    title: z.string().max(80).optional().or(z.literal('')),
    password: z.string().min(6).optional(),
    role: z.enum(['ADMIN', 'PROFESSIONAL']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo',
  });

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
