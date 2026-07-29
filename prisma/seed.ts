import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed mínimo: só a conta admin.
 * O salão começa vazio — clientes, serviços, profissionais e agenda
 * são cadastrados pelo usuário.
 */
async function main() {
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('senhaSegura123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@salaoflow.com',
      password: passwordHash,
      role: Role.ADMIN,
      mustChangePassword: true,
    },
  });

  console.log('Seed concluído — base vazia, pronta para cadastros.');
  console.log(`Admin: ${admin.email} / senhaSegura123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
