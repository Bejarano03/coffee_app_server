import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class WeatherSnapshotDto {
  @IsString()
  @MaxLength(48)
  @IsIn(['metric', 'imperial'])
  units: 'metric' | 'imperial';

  @IsString()
  @MaxLength(64)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  locationName?: string;

  @IsNumber()
  temperature: number;

  @IsNumber()
  feelsLike: number;
}

export class AssistantHistoryMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

export class AssistantMessageDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AssistantHistoryMessageDto)
  @IsArray()
  history?: AssistantHistoryMessageDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WeatherSnapshotDto)
  weather?: WeatherSnapshotDto;
}
