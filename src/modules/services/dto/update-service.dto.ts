import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateServiceSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    category: z.string().min(2).optional(),
    price: z.number().positive().optional(),
    durationInMinutes: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export class UpdateServiceDto extends createZodDto(UpdateServiceSchema) {}
