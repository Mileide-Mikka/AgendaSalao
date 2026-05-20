import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateServiceSchema = z.object({
  name: z.string().min(2, "O nome do serviço deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  price: z.number().positive("O preço deve ser um valor positivo"),
  durationInMinutes: z
    .number()
    .int()
    .positive("A duração deve ser um número inteiro de minutos"),
});

export class CreateServiceDto extends createZodDto(CreateServiceSchema) {
  name!: string;
  description?: string;
  price!: number;
  durationInMinutes!: number;
}
