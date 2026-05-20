import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ServicesModule } from "./modules/services/services.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [PrismaModule, UsersModule, ServicesModule, AppointmentsModule],
})
export class AppModule {}
