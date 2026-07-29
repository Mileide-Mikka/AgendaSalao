import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RescheduleAppointmentSchema = z.object({
  startTime: z
    .string()
    .datetime({ message: 'A data de início deve ser uma string ISO datetime válida' }),
  professionalId: z.string().uuid('ID do profissional inválido').optional(),
  serviceId: z.string().uuid('ID do serviço inválido').optional(),
});

export class RescheduleAppointmentDto extends createZodDto(
  RescheduleAppointmentSchema,
) {}
