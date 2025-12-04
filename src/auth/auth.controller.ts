import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { PasswordResetRequestDto } from "./dto/password-reset.dto";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        // Handles hashing and saving
        console.log(registerDto);
        return this.authService.register(
            registerDto.email,
            registerDto.password,
            registerDto.firstName,
            registerDto.lastName,
            registerDto.birthDate,
            registerDto.phone
        );
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        // Validate credentials
        const user = await this.authService.validateUser(
            loginDto.email,
            loginDto.password,
        );

        if(!user) {
            // Throw a 401
            throw new UnauthorizedException('Invalid email or password');
        }
        return this.authService.login(user);
    }

    @HttpCode(HttpStatus.OK)
    @Post('password/reset-request')
    async requestPasswordReset(@Body() passwordResetDto: PasswordResetRequestDto) {
        await this.authService.requestPasswordReset(passwordResetDto.email);
        return { message: 'If an account exists for that email, a temporary password has been sent.' };
    }
}
