import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';

/** Hash real (bcrypt) para equalizar o tempo quando o e-mail não existe */
const DUMMY_PASSWORD_HASH =
  '$2b$10$/XdNSK4Vb8IQtFQea2f/neLdKVIaP5vb3.twh44QM40CJOrJmiHGO';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const hashToCompare = user?.password ?? DUMMY_PASSWORD_HASH;
    const passwordValid = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !passwordValid) {
      if (user) {
        await this.usersService.registerFailedLogin(user.id);
      }
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.usersService.resetLoginAttempts(user.id);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    this.setAuthCookie(res, accessToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        title: user.title,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async updateCredentials(
    userId: string,
    dto: UpdateCredentialsDto,
    res: Response,
  ) {
    const user = await this.usersService.updateOwnCredentials(userId, {
      currentPassword: dto.currentPassword,
      name: dto.name,
      title: dto.title,
      phone: dto.phone,
      email: dto.email,
      newPassword: dto.newPassword,
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    this.setAuthCookie(res, accessToken);

    return { user };
  }

  logout(res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, this.cookieOptions());
    return { message: 'Sessão encerrada' };
  }

  private setAuthCookie(res: Response, token: string) {
    const maxAgeMs = this.parseExpiresToMs(
      this.config.get<string>('JWT_EXPIRES_IN', '1d'),
    );

    res.cookie(AUTH_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: maxAgeMs,
    });
  }

  private cookieOptions() {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private parseExpiresToMs(expiresIn: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) return 24 * 60 * 60 * 1000;

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return value * multipliers[unit];
  }
}
