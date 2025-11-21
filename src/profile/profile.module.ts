import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Import the dependency needed by the service

@Module({
  // 1. Imports: The service needs access to the database via PrismaModule.
  imports: [PrismaModule], 
  
  // 2. Controllers: Register the route handlers.
  controllers: [ProfileController],
  
  // 3. Providers: Register the business logic service.
  providers: [ProfileService],
})
export class ProfileModule {}