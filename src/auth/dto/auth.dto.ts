import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6) // Enforce a minimum password length
    password: string;
}

export class RegisterDto extends LoginDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsNotEmpty()
    birthDate: string;

    // Should add more validation for date/phone later
    @IsString()
    @IsNotEmpty()
    phone: string;
}