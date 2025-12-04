import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { EmailService } from "../utils/email.service";

@Module({
    imports: [
        PrismaModule,
        PassportModule,

        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '60m' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard, EmailService],
    exports: [AuthService, JwtAuthGuard]
})
export class AuthModule{}
