import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/profile.dto';
import { formatBirthDateForClient, parseBirthDateInput, requireTenDigitPhone } from '../utils/formatters';

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
    
    // Format Date object to MM-DD-YYYY string for consistency with frontend expectations
    return {
      ...user,
      birthDate: formatBirthDateForClient(user.birthDate),
    };
  }

  // Handles updating the profile for the authenticated user ID
  async updateProfile(userId: number, data: UpdateProfileDto) {
    const updateData: any = { ...data };

    if (data.birthDate) {
      updateData.birthDate = parseBirthDateInput(data.birthDate);
    }

    if (data.phone) {
      updateData.phone = requireTenDigitPhone(data.phone);
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
      birthDate: formatBirthDateForClient(updatedUser.birthDate),
    };
  }
}
