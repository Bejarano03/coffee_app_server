import { MilkOption } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  @Min(1)
  menuItemId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsEnum(MilkOption)
  milkOption?: MilkOption;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  espressoShots?: number;

  @IsOptional()
  @IsString()
  flavorName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  flavorPumps?: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
