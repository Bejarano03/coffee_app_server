import { IsOptional, IsString, Matches } from 'class-validator';
import { FLEXIBLE_BIRTHDATE_REGEX } from '../../utils/formatters';

// This DTO defines the structure for the PATCH /profile request body
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Matches(FLEXIBLE_BIRTHDATE_REGEX, { message: 'Birth date must follow MM-DD-YYYY.' })
  birthDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
