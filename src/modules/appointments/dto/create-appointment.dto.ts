import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  clientId: z.string().uuid('ID do cliente inválido'),
  startTime: z
    .string()
    .datetime({ message: 'A data de início deve ser uma string ISO datetime válida' }),
  professionalId: z.string().uuid('ID do profissional inválido'),
  serviceId: z.string().uuid('ID do serviço inválido'),
  status: z.enum(['PENDING', 'CONFIRMED']).optional(),
  notes: z.string().max(500).optional(),
});

export class CreateAppointmentDto extends createZodDto(CreateAppointmentSchema) {}
