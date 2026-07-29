import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SendWhatsAppMessageSchema = z.object({
  to: z
    .string()
    .min(10, 'Telefone do destinatário inválido')
    .transform((v) => v.replace(/\D/g, '')),
  message: z
    .string()
    .trim()
    .min(1, 'Informe a mensagem')
    .max(4096, 'Mensagem muito longa'),
});

export class SendWhatsAppMessageDto extends createZodDto(
  SendWhatsAppMessageSchema,
) {}
