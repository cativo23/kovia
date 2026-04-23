import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeRoleDto {
  @ApiProperty({ enum: ['ORG_ADMIN', 'ORG_STAFF'] })
  @IsIn(['ORG_ADMIN', 'ORG_STAFF'])
  role!: 'ORG_ADMIN' | 'ORG_STAFF';
}
