import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status da conexão WhatsApp Cloud API' })
  status() {
    return this.whatsappService.getStatus();
  }

  @Post('send')
  @Roles(Role.ADMIN, Role.PROFESSIONAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensagem de texto via Cloud API' })
  send(@Body() dto: SendWhatsAppMessageDto) {
    return this.whatsappService.sendText(dto);
  }
}
