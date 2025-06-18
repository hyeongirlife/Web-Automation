import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionHistoryDto {
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsDateString()
  @Type(() => Date)
  startDate: Date;

  @IsDateString()
  @Type(() => Date)
  endDate: Date;
}
