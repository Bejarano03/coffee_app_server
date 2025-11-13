import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        // Handles hashing and saving
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
}