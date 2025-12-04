import { IsNotEmpty, IsString } from 'class-validator';

export class CompleteCardPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId!: string;
}

