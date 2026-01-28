import { IsEnum, IsOptional } from 'class-validator';
import { LocationType } from 'src/enums';

export class BulkUploadPropDto {
  @IsOptional()
  locationId: number;

  @IsOptional()
  @IsEnum(LocationType)
  locationType: LocationType;
}
