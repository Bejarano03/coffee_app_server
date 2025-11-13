import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '../../generated/prisma/';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  private readonly HASH_SALT_ROUNDS = 10; // How much computation is needed

  async register(email: string, pass: string): Promise<any> {
    // Hash password
    const hashedPassword = await bcrypt.hash(pass, this.HASH_SALT_ROUNDS);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: '',
        lastName: '',
        birthDate: new Date(),
        phone: '',
      },
    });

    // Return the user
    const { password, ...result } = user;
    return result;
  }

  // change to custom type later
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && (await bcrypt.compare(pass, user.password))) {
      // Password is correct
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
