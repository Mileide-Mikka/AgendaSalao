import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import {
  parseSalonDayEnd,
  parseSalonDayStart,
  todaySalonDateKey,
  assertAppointmentInBusinessHours,
  type SalonHoursConfig,
} from '../../common/datetime/salon-time';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const appointmentInclude = {
  client: { select: { id: true, name: true, phone: true, email: true } },
  service: {
    select: { id: true, name: true, price: true, durationInMinutes: true },
  },
  professional: { select: { id: true, name: true, email: true } },
} as const;

const ALLOWED_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  PENDING: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.WAITING,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  CONFIRMED: [
    AppointmentStatus.PENDING,
    AppointmentStatus.WAITING,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  WAITING: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  COMPLETED: [],
  CANCELLED: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private business: BusinessService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const [service, professional, client, settings] = await Promise.all([
      this.prisma.service.findUnique({ where: { id: dto.serviceId } }),
      this.prisma.user.findUnique({ where: { id: dto.professionalId } }),
      this.prisma.client.findUnique({ where: { id: dto.clientId } }),
      this.business.getSettings(),
    ]);

    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    if (professional.role !== Role.PROFESSIONAL) {
      throw new BadRequestException('O usuário informado não é um profissional');
    }
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const start = new Date(dto.startTime);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Data de início inválida');
    }
    this.assertNotInPast(start);

    const end = new Date(start.getTime() + service.durationInMinutes * 60_000);
    this.assertBusinessHours(start, end, settings);

    return this.prisma.$transaction(
      async (tx) => {
        await this.assertNoConflict(tx, dto.professionalId, start, end);

        return tx.appointment.create({
          data: {
            clientId: dto.clientId,
            startTime: start,
            endTime: end,
            professionalId: dto.professionalId,
            serviceId: dto.serviceId,
            status: dto.status ?? AppointmentStatus.CONFIRMED,
            notes: dto.notes,
          },
          include: appointmentInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findAgenda(options: {
    date?: string;
    from?: string;
    to?: string;
    professionalId?: string;
    status?: AppointmentStatus;
  }) {
    const where: Prisma.AppointmentWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }

    if (options.professionalId) {
      where.professionalId = options.professionalId;
    }

    if (options.date) {
      const range = this.parseDayRange(options.date);
      where.startTime = { gte: range.start, lte: range.end };
    } else if (options.from && options.to) {
      const from = this.parseDateOnly(options.from, false);
      const to = this.parseDateOnly(options.to, true);
      const maxMs = 93 * 24 * 60 * 60 * 1000;
      if (to.getTime() < from.getTime()) {
        throw new BadRequestException('O período "to" deve ser após "from"');
      }
      if (to.getTime() - from.getTime() > maxMs) {
        throw new BadRequestException(
          'O intervalo da agenda não pode ultrapassar 93 dias',
        );
      }
      where.startTime = { gte: from, lte: to };
    } else {
      const today = todaySalonDateKey();
      const range = this.parseDayRange(today);
      where.startTime = { gte: range.start, lte: range.end };
    }

    return this.prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto) {
    const current = await this.findOne(id);

    if (current.status === dto.status) {
      return current;
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Não é possível alterar de ${current.status} para ${dto.status}`,
      );
    }

    const needsConflictCheck =
      current.status === AppointmentStatus.CANCELLED &&
      (dto.status === AppointmentStatus.PENDING ||
        dto.status === AppointmentStatus.CONFIRMED);

    if (needsConflictCheck) {
      return this.prisma.$transaction(
        async (tx) => {
          await this.assertNoConflict(
            tx,
            current.professionalId,
            current.startTime,
            current.endTime,
            id,
          );
          return tx.appointment.update({
            where: { id },
            data: { status: dto.status },
            include: appointmentInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: dto.status },
      include: appointmentInclude,
    });
  }

  async cancel(id: string) {
    return this.updateStatus(id, { status: AppointmentStatus.CANCELLED });
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto) {
    const appointment = await this.findOne(id);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        'Não é possível reagendar um agendamento cancelado',
      );
    }

    const professionalId = dto.professionalId ?? appointment.professionalId;
    const serviceId = dto.serviceId ?? appointment.serviceId;

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');

    if (dto.professionalId) {
      const professional = await this.prisma.user.findUnique({
        where: { id: professionalId },
      });
      if (!professional || professional.role !== Role.PROFESSIONAL) {
        throw new BadRequestException(
          'O usuário informado não é um profissional',
        );
      }
    }

    const start = new Date(dto.startTime);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Data de início inválida');
    }
    this.assertNotInPast(start);

    const end = new Date(start.getTime() + service.durationInMinutes * 60_000);
    const settings = await this.business.getSettings();
    this.assertBusinessHours(start, end, settings);

    return this.prisma.$transaction(
      async (tx) => {
        await this.assertNoConflict(tx, professionalId, start, end, id);

        return tx.appointment.update({
          where: { id },
          data: {
            startTime: start,
            endTime: end,
            professionalId,
            serviceId,
            status: AppointmentStatus.CONFIRMED,
          },
          include: appointmentInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private parseDayRange(dateStr: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Use o formato de data YYYY-MM-DD');
    }
    return {
      start: parseSalonDayStart(dateStr),
      end: parseSalonDayEnd(dateStr),
    };
  }

  private parseDateOnly(dateStr: string, endOfDay: boolean) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Use o formato de data YYYY-MM-DD');
    }
    return endOfDay
      ? parseSalonDayEnd(dateStr)
      : parseSalonDayStart(dateStr);
  }

  private assertNotInPast(start: Date) {
    const graceMs = 2 * 60_000;
    if (start.getTime() < Date.now() - graceMs) {
      throw new BadRequestException(
        'Não é possível agendar ou reagendar no passado',
      );
    }
  }

  private assertBusinessHours(
    start: Date,
    end: Date,
    settings: SalonHoursConfig,
  ) {
    try {
      assertAppointmentInBusinessHours(start, end, settings);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Fora do horário de funcionamento',
      );
    }
  }

  private async assertNoConflict(
    tx: Prisma.TransactionClient,
    professionalId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ) {
    const conflict = await tx.appointment.findFirst({
      where: {
        professionalId,
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.WAITING,
          ],
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflict) {
      throw new ConflictException(
        'O profissional já possui um agendamento neste horário',
      );
    }
  }
}
