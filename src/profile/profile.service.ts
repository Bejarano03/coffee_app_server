import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Assuming path to your shared Prisma service
import { UpdateProfileDto } from './dto/profile.dto'; // Assuming path to your DTO

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // Handles fetching the profile for the authenticated user ID
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        phone: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    
    // Format Date object to YYYY-MM-DD string for consistency with frontend expectations
    return {
        ...user,
        birthDate: user.birthDate ? user.birthDate.toISOString().split('T')[0] : null,
    };
  }

  // Handles updating the profile for the authenticated user ID
  async updateProfile(userId: number, data: UpdateProfileDto) {
    const updateData: any = { ...data };

    // Convert birthDate string back to a Date object if present before saving to DB
    if (data.birthDate) {
      updateData.birthDate = new Date(data.birthDate);
    }
    
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        phone: true,
      },
    });
    
    // Return formatted data
    return {
        ...updatedUser,
        birthDate: updatedUser.birthDate ? updatedUser.birthDate.toISOString().split('T')[0] : null,
    };
  }
}