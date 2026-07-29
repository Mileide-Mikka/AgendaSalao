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

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  phone: optionalPhone,
  title: z.string().max(80).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'PROFESSIONAL']).default('PROFESSIONAL'),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
