import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category || 'Geral',
        price: dto.price,
        durationInMinutes: dto.durationInMinutes,
      },
    });
  }

  async findAll() {
    return this.prisma.service.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);

    return this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.durationInMinutes !== undefined
          ? { durationInMinutes: dto.durationInMinutes }
          : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Cascade no banco remove agendamentos vinculados
    return this.prisma.service.delete({ where: { id } });
  }
}
