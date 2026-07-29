import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import {
  isValidBrMobile,
  phoneDigits,
} from '../../common/validation/phone';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        phone: phoneDigits(dto.phone),
        phoneIsWhatsapp: dto.phoneIsWhatsapp ?? false,
        prefersMessageContact: dto.prefersMessageContact ?? false,
        email: dto.email?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async findAll(search?: string) {
    const clients = await this.prisma.client.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        appointments: {
          where: {
            status: {
              in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
            },
          },
          select: {
            startTime: true,
            service: { select: { price: true } },
          },
          orderBy: { startTime: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clients.map((client) => {
      const totalSpent = client.appointments.reduce(
        (sum, a) => sum + Number(a.service.price),
        0,
      );
      const lastVisit = client.appointments[0]?.startTime ?? null;
      const { appointments: _a, ...rest } = client;
      return { ...rest, totalSpent, lastVisit };
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const current = await this.findOne(id);

    const phone =
      dto.phone !== undefined ? phoneDigits(dto.phone) : current.phone;
    const phoneIsWhatsapp =
      dto.phoneIsWhatsapp !== undefined
        ? dto.phoneIsWhatsapp
        : current.phoneIsWhatsapp;
    const prefersMessageContact =
      dto.prefersMessageContact !== undefined
        ? dto.prefersMessageContact
        : current.prefersMessageContact;

    if (phoneIsWhatsapp && !isValidBrMobile(phone)) {
      throw new BadRequestException(
        'Para WhatsApp, informe um celular com DDD (11 dígitos)',
      );
    }
    if (prefersMessageContact && !phoneIsWhatsapp) {
      throw new BadRequestException(
        'Para preferir atendimento por mensagem, o número precisa ser WhatsApp',
      );
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone } : {}),
        ...(dto.phoneIsWhatsapp !== undefined ? { phoneIsWhatsapp } : {}),
        ...(dto.prefersMessageContact !== undefined
          ? { prefersMessageContact }
          : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.client.delete({ where: { id } });
  }
}
