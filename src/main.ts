import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ZodValidationPipe } from "nestjs-zod";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors();

  await app.listen(3000);
  console.log(
    "🚀 API do Salão de Beleza rodando em: http://localhost:3000/api",
  );
}
bootstrap();
