import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  assertValidWeeklyHours,
  defaultWeeklyHours,
  legacyFieldsFromWeekly,
  normalizeWeeklyHours,
  type WeeklyHours,
} from '../../common/datetime/salon-time';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

const DEFAULT_ID = 'default';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const row = await this.ensureRow();
    return this.present(row);
  }

  async updateSettings(dto: UpdateBusinessSettingsDto) {
    const current = await this.ensureRow();
    const currentWeekly = normalizeWeeklyHours(current.weeklyHours, {
      openTime: current.openTime,
      closeTime: current.closeTime,
      saturdayOpenTime: current.saturdayOpenTime,
      saturdayCloseTime: current.saturdayCloseTime,
    });

    let weekly: WeeklyHours = currentWeekly;
    if (dto.weeklyHours) {
      weekly = normalizeWeeklyHours(dto.weeklyHours, {
        openTime: dto.openTime ?? current.openTime,
        closeTime: dto.closeTime ?? current.closeTime,
        saturdayOpenTime: dto.saturdayOpenTime ?? current.saturdayOpenTime,
        saturdayCloseTime: dto.saturdayCloseTime ?? current.saturdayCloseTime,
      });
    } else if (
      dto.openTime !== undefined ||
      dto.closeTime !== undefined ||
      dto.saturdayOpenTime !== undefined ||
      dto.saturdayCloseTime !== undefined
    ) {
      // Legacy partial update — rebuild week from flat fields
      weekly = defaultWeeklyHours({
        openTime: dto.openTime ?? current.openTime,
        closeTime: dto.closeTime ?? current.closeTime,
        saturdayOpenTime: dto.saturdayOpenTime ?? current.saturdayOpenTime,
        saturdayCloseTime: dto.saturdayCloseTime ?? current.saturdayCloseTime,
      });
    }

    try {
      assertValidWeeklyHours(weekly);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Horário inválido',
      );
    }

    const legacy = legacyFieldsFromWeekly(weekly);

    const updated = await this.prisma.businessSettings.update({
      where: { id: DEFAULT_ID },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        openTime: legacy.openTime,
        closeTime: legacy.closeTime,
        saturdayOpenTime: legacy.saturdayOpenTime,
        saturdayCloseTime: legacy.saturdayCloseTime,
        weeklyHours: weekly as unknown as Prisma.InputJsonValue,
        ...(dto.whatsappReminder !== undefined
          ? { whatsappReminder: dto.whatsappReminder }
          : {}),
        ...(dto.cancelAlerts !== undefined
          ? { cancelAlerts: dto.cancelAlerts }
          : {}),
      },
    });

    return this.present(updated);
  }

  private async ensureRow() {
    const existing = await this.prisma.businessSettings.findUnique({
      where: { id: DEFAULT_ID },
    });
    if (existing) return existing;

    const weekly = defaultWeeklyHours();
    return this.prisma.businessSettings.create({
      data: {
        id: DEFAULT_ID,
        weeklyHours: weekly as unknown as Prisma.InputJsonValue,
        openTime: weekly.mon.openTime,
        closeTime: weekly.mon.closeTime,
        saturdayOpenTime: weekly.sat.openTime,
        saturdayCloseTime: weekly.sat.closeTime,
      },
    });
  }

  private present(row: {
    id: string;
    name: string;
    address: string;
    openTime: string;
    closeTime: string;
    saturdayOpenTime: string;
    saturdayCloseTime: string;
    weeklyHours: Prisma.JsonValue | null;
    whatsappReminder: boolean;
    cancelAlerts: boolean;
    updatedAt: Date;
  }) {
    const weeklyHours = normalizeWeeklyHours(row.weeklyHours, {
      openTime: row.openTime,
      closeTime: row.closeTime,
      saturdayOpenTime: row.saturdayOpenTime,
      saturdayCloseTime: row.saturdayCloseTime,
    });
    const legacy = legacyFieldsFromWeekly(weeklyHours);
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      openTime: legacy.openTime,
      closeTime: legacy.closeTime,
      saturdayOpenTime: legacy.saturdayOpenTime,
      saturdayCloseTime: legacy.saturdayCloseTime,
      weeklyHours,
      whatsappReminder: row.whatsappReminder,
      cancelAlerts: row.cancelAlerts,
      updatedAt: row.updatedAt,
    };
  }
}
