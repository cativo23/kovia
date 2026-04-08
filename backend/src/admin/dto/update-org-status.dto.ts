import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum OrgStatusEnum {
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
}

export class UpdateOrgStatusDto {
  @ApiProperty({ enum: OrgStatusEnum, example: 'DEACTIVATED', description: 'New org status' })
  @IsEnum(OrgStatusEnum)
  status: OrgStatusEnum;
}
