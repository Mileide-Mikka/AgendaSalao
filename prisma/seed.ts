import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const professional = await prisma.user.create({
    data: {
      name: 'Vítor Cabeleireiro',
      email: 'vitor@salaoflow.com',
      password: 'senhaSegura123',
      role: 'PROFESSIONAL',
    },
  });

  const service = await prisma.service.create({
    data: {
      name: 'Corte de Cabelo Masculino',
      description: 'Corte moderno com lavagem incluída',
      price: 25.00,
      durationInMinutes: 30,
    },
  });

  console.log('🌱 Banco de dados populado com sucesso!');
  console.log(`ID do Profissional: ${professional.id}`);
  console.log(`ID do Serviço: ${service.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });