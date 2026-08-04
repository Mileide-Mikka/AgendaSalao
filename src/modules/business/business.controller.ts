import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessService } from './business.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@ApiTags('Business')
@ApiBearerAuth()
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Dados e horário de funcionamento do salão' })
  getSettings() {
    return this.businessService.getSettings();
  }

  @Patch('settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados / horário do salão (admin)' })
  updateSettings(@Body() dto: UpdateBusinessSettingsDto) {
    return this.businessService.updateSettings(dto);
  }
}
