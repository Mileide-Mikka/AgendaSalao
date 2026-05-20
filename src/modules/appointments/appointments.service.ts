import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service) throw new NotFoundException('O serviço solicitado não existe');

    const professional = await this.prisma.user.findUnique({
      where: { id: dto.professionalId },
    });
    if (!professional) throw new NotFoundException('O profissional solicitado não existe');

    const start = new Date(dto.startTime);
    const end = new Date(start.getTime() + service.durationInMinutes * 60000);

    const hasConflict = await this.prisma.appointment.findFirst({
      where: {
        professionalId: dto.professionalId,
        status: { not: 'CANCELLED' },
        OR: [
          {
            startTime: { lte: start },
            endTime: { gt: start },
          },
          {
            startTime: { lt: end },
            endTime: { gte: end },
          },
          {
            startTime: { gte: start },
            endTime: { lte: end },
          },
        ],
      },
    });

    if (hasConflict) {
      throw new ConflictException('O profissional já possui um agendamento neste horário');
    }

    return this.prisma.appointment.create({
      data: {
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        startTime: start,
        endTime: end,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        status: 'CONFIRMED',
      },
      include: {
        service: true,
        professional: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findAgenda(dateStr?: string, professionalId?: string) {
    const whereClause: any = {};

    if (professionalId) {
      whereClause.professionalId = professionalId;
    }

    if (dateStr) {
      const targetDate = new Date(dateStr);
      const startOfDay = new Date(targetDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setUTCHours(23, 59, 59, 999));

      whereClause.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    return this.prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: { select: { name: true, price: true } },
        professional: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}