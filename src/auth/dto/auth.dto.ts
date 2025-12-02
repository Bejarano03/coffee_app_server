import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { FLEXIBLE_BIRTHDATE_REGEX } from "../../utils/formatters";

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
    @Matches(FLEXIBLE_BIRTHDATE_REGEX, { message: 'Birth date must follow MM-DD-YYYY.' })
    birthDate: string;

    // Should add more validation for date/phone later
    @IsString()
    @IsNotEmpty()
    phone: string;
}
