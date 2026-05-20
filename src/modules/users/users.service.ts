import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (emailExists) {
      throw new ConflictException('Este e-mail já está registrado no sistema');
    }

    return this.prisma.user.create({
      data: dto,
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async findAllProfessionals() {
    return this.prisma.user.findMany({
      where: { role: 'PROFESSIONAL' },
      select: { id: true, name: true, email: true },
    });
  }
}