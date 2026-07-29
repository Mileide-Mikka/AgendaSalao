import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from '../auth/auth.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  title: true,
  role: true,
  mustChangePassword: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const emailExists = await this.prisma.user.findUnique({ where: { email } });

    if (emailExists) {
      throw new ConflictException('Este e-mail já está registrado no sistema');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hashedPassword,
        phone: dto.phone?.trim() || null,
        title: dto.title?.trim() || null,
        role: dto.role,
        mustChangePassword: true,
      },
      select: userSelect,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findAllProfessionals() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const professionals = await this.prisma.user.findMany({
      where: { role: 'PROFESSIONAL' },
      select: {
        ...userSelect,
        appointments: {
          where: {
            startTime: { gte: startOfMonth },
            status: { not: AppointmentStatus.CANCELLED },
          },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return professionals.map(({ appointments, ...pro }) => ({
      ...pro,
      monthlyAppointments: appointments.length,
    }));
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const exists = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (exists) {
        throw new ConflictException('Este e-mail já está em uso');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.title !== undefined) data.title = dto.title.trim() || null;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async remove(id: string) {
    const user = await this.findById(id);

    if (user.role === 'ADMIN') {
      throw new BadRequestException(
        'Não é possível excluir uma conta de administrador por aqui',
      );
    }

    // Cascade no banco remove agendamentos vinculados
    await this.prisma.user.delete({ where: { id } });
  }

  async updateOwnCredentials(
    userId: string,
    input: {
      currentPassword: string;
      name?: string;
      title?: string;
      phone?: string;
      email?: string;
      newPassword?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const valid = await bcrypt.compare(input.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    if (user.mustChangePassword && !input.newPassword) {
      throw new BadRequestException(
        'No primeiro acesso é obrigatório definir uma nova senha',
      );
    }

    if (user.mustChangePassword && (!input.name || input.name.trim().length < 2)) {
      throw new BadRequestException(
        'No primeiro acesso informe seu nome completo',
      );
    }

    const data: Record<string, unknown> = {};

    if (input.newPassword) {
      data.password = await bcrypt.hash(input.newPassword, 10);
      data.mustChangePassword = false;
    }

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }

    if (input.title !== undefined) {
      data.title = input.title.trim() || null;
    }

    if (input.phone !== undefined) {
      data.phone = input.phone.trim() || null;
    }

    if (input.email) {
      const email = input.email.trim().toLowerCase();
      if (email !== user.email) {
        const exists = await this.prisma.user.findFirst({
          where: { email, NOT: { id: userId } },
        });
        if (exists) {
          throw new ConflictException('Este e-mail já está em uso');
        }
        data.email = email;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nenhuma alteração informada');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
  }

  async registerFailedLogin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const lockExpired =
      !user.lockedUntil || user.lockedUntil.getTime() <= Date.now();
    const baseAttempts = lockExpired ? 0 : user.failedLoginAttempts;
    const attempts = baseAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_MINUTES * 60_000)
          : null,
      },
    });
  }

  async resetLoginAttempts(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }
}
