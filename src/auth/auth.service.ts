import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../generated/prisma/';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  private readonly HASH_SALT_ROUNDS = 10; // How much computation is needed

  async register(
    email: string,
    pass: string,
    firstName: string,
    lastName: string,
    birthDate: string,
    phone: string,
  ): Promise<any> {
    // Hash password
    const hashedPassword = await bcrypt.hash(pass, this.HASH_SALT_ROUNDS);

    const dateOfBirth = new Date(birthDate);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        birthDate: dateOfBirth,
        phone,
      },
    });

    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      email: user.email,
      sub: user.id
    };

    // Return the user
    // const { password, ...result } = user;
    // return result;
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

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
