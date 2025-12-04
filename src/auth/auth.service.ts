import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { parseBirthDateInput, requireTenDigitPhone } from '../utils/formatters';
import { EmailService } from '../utils/email.service';
import { randomBytes } from 'crypto';

interface ValidatedUserPayload {
  id: number;
  email: string;
  requiresPasswordReset: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
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

    const dateOfBirth = parseBirthDateInput(birthDate);
    const normalizedPhone = requireTenDigitPhone(phone);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        birthDate: dateOfBirth,
        phone: normalizedPhone,
      },
    });

    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      email: user.email,
      sub: user.id,
      requiresPasswordReset: false,
    };

    // Return the user
    // const { password, ...result } = user;
    // return result;
  }

  // change to custom type later
  async validateUser(email: string, pass: string): Promise<ValidatedUserPayload | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        mustResetPassword: true,
        temporaryPasswordHash: true,
        temporaryPasswordExpiresAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const matchesPrimaryPassword = await bcrypt.compare(pass, user.password);

    if (matchesPrimaryPassword) {
      return {
        id: user.id,
        email: user.email,
        requiresPasswordReset: user.mustResetPassword,
      };
    }

    const hasActiveTemporaryPassword =
      !!user.temporaryPasswordHash &&
      !!user.temporaryPasswordExpiresAt &&
      user.temporaryPasswordExpiresAt > new Date();

    if (
      hasActiveTemporaryPassword &&
      (await bcrypt.compare(pass, user.temporaryPasswordHash as string))
    ) {
      return {
        id: user.id,
        email: user.email,
        requiresPasswordReset: true,
      };
    }

    return null;
  }

  async login(user: ValidatedUserPayload) {
    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
      email: user.email,
      sub: user.id,
      requiresPasswordReset: user.requiresPasswordReset,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return;
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const hashedTemporaryPassword = await bcrypt.hash(
      temporaryPassword,
      this.HASH_SALT_ROUNDS,
    );
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { email },
      data: {
        temporaryPasswordHash: hashedTemporaryPassword,
        temporaryPasswordExpiresAt: expiresAt,
        mustResetPassword: true,
      },
    });

    await this.emailService.sendTemporaryPasswordEmail(email, temporaryPassword, expiresAt);
  }

  private generateTemporaryPassword() {
    return randomBytes(4).toString('hex');
  }
}
