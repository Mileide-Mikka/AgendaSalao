import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  clientName: z.string().min(2, 'O nome do cliente é obrigatório'),
  clientPhone: z.string().min(8, 'O telefone informado é inválido'),
  startTime: z.string().datetime({ message: 'A data de início deve ser uma string ISO datetime válida' }),
  professionalId: z.string().uuid('ID do profissional inválido'),
  serviceId: z.string().uuid('ID do serviço inválido'),
});

export class CreateAppointmentDto extends createZodDto(CreateAppointmentSchema) {}