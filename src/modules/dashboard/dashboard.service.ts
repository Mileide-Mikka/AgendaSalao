import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { todaySalonDateKey } from '../../common/datetime/salon-time';
import {
  parseSalonDayEnd,
  parseSalonDayStart,
} from '../../common/datetime/salon-time';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const today = todaySalonDateKey(now);
    const startOfDay = parseSalonDayStart(today);
    const endOfDay = parseSalonDayEnd(today);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [todayAppointments, activeClients, recentClients, nextAppointment] =
      await Promise.all([
        this.prisma.appointment.findMany({
          where: {
            startTime: { gte: startOfDay, lte: endOfDay },
            status: { not: AppointmentStatus.CANCELLED },
          },
          include: {
            client: { select: { id: true, name: true, phone: true } },
            service: { select: { name: true, price: true } },
            professional: { select: { id: true, name: true } },
          },
          orderBy: { startTime: 'asc' },
        }),
        this.prisma.client.count(),
        this.prisma.client.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.appointment.findFirst({
          where: {
            startTime: { gte: now },
            status: {
              in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
            },
          },
          include: {
            client: { select: { name: true } },
            service: { select: { name: true } },
          },
          orderBy: { startTime: 'asc' },
        }),
      ]);

    const confirmedToday = todayAppointments.filter(
      (a) => a.status === AppointmentStatus.CONFIRMED,
    ).length;

    const expectedRevenue = todayAppointments.reduce(
      (sum, a) => sum + Number(a.service.price),
      0,
    );

    return {
      appointmentsToday: todayAppointments.length,
      confirmedToday,
      expectedRevenue,
      activeClients,
      newClientsLast30Days: recentClients,
      nextAppointment: nextAppointment
        ? {
            time: nextAppointment.startTime,
            clientName: nextAppointment.client.name,
            serviceName: nextAppointment.service.name,
          }
        : null,
      todayAgenda: todayAppointments,
    };
  }
}
