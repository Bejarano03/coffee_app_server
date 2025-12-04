import { Type } from 'class-transformer';
import { IsNumber, IsPositive, Max } from 'class-validator';

export class CreateGiftCardReloadIntentDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(100, { message: 'Single reloads are limited to $100.' })
  amount!: number;
}

