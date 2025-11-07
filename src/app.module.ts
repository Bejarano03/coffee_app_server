import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserService } from './user.service';

@Module({
  imports: [UserService],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
