import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'PROFESSIONAL']).default('PROFESSIONAL'),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {
  name!: string;
  email!: string;
  password!: string;
  role!: 'ADMIN' | 'PROFESSIONAL';
}