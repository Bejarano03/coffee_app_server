import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/profile.dto';
import { UpdatePasswordDto } from './dto/change-password.dto';
import { formatBirthDateForClient, parseBirthDateInput, requireTenDigitPhone } from '../utils/formatters';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}
  private readonly HASH_SALT_ROUNDS = 10;

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

  async updatePassword(userId: number, data: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        temporaryPasswordHash: true,
        temporaryPasswordExpiresAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const now = new Date();
    const matchesCurrent = await bcrypt.compare(data.currentPassword, user.password);
    let matchesTemporary = false;

    if (!matchesCurrent) {
      const temporaryPasswordIsActive =
        !!user.temporaryPasswordHash &&
        !!user.temporaryPasswordExpiresAt &&
        user.temporaryPasswordExpiresAt > now;

      if (temporaryPasswordIsActive) {
        matchesTemporary = await bcrypt.compare(data.currentPassword, user.temporaryPasswordHash as string);
      }

      if (!matchesTemporary) {
        throw new BadRequestException('Current password is incorrect.');
      }
    }

    const isSamePassword = await bcrypt.compare(data.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the current password.');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, this.HASH_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        temporaryPasswordHash: null,
        temporaryPasswordExpiresAt: null,
        mustResetPassword: false,
      },
    });

    return { message: 'Password updated successfully.' };
  }
}
