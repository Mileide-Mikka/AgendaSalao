import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'WAITING', 'COMPLETED', 'CANCELLED']),
});

export class UpdateAppointmentStatusDto extends createZodDto(
  UpdateAppointmentStatusSchema,
) {}
