import { Body, Controller, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorator/user.decorator';
import { AssistantService } from './assistant.service';
import { AssistantMessageDto } from './assistant.dto';

interface AuthenticatedUser {
  id: number;
  email: string;
}

@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('message')
  async sendMessage(@User() user: AuthenticatedUser, @Body() payload: AssistantMessageDto) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user context.');
    }

    return this.assistantService.handleMessage(user.id, payload);
  }
}
