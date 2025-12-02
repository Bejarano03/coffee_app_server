import { IsInt, IsOptional, Min } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  @Min(1)
  menuItemId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
