import { Controller, Get, Patch, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/profile.dto'; 
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { User } from '../auth/decorator/user.decorator'; 

// Defines the shape of the object returned by your JwtStrategy
interface FullUserProfilePayload {
  id: number; // This is the property the strategy returns the ID under
  email: string;
}

@UseGuards(JwtAuthGuard) 
@Controller('profile') 
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /profile
   * Fetches the profile data for the currently authenticated user.
   */
  @Get()
  async getProfile(@User() user: FullUserProfilePayload) { 
    // CRITICAL FIX: Use 'user.id' to match the JwtStrategy return value.
    const userId = user.id; 

    if (!userId) {
        throw new HttpException('Authentication payload missing user ID.', HttpStatus.UNAUTHORIZED);
    }
    
    return this.profileService.getProfile(userId);
  }

  /**
   * PATCH /profile
   * Updates one or more fields of the user's profile.
   */
  @Patch()
  async updateProfile(
    @User() user: FullUserProfilePayload, 
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    // CRITICAL FIX: Use 'user.id' to match the JwtStrategy return value.
    const userId = user.id; 

    if (!userId) {
        throw new HttpException('Authentication payload missing user ID.', HttpStatus.UNAUTHORIZED);
    }
    
    return this.profileService.updateProfile(userId, updateProfileDto);
  }
}