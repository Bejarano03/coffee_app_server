import { IsOptional, IsString, IsDateString } from 'class-validator';

// This DTO defines the structure for the PATCH /profile request body
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  // Use IsDateString to validate that the input is a valid date format string (e.g., YYYY-MM-DD)
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}