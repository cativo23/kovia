import { IsString, IsIn } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsString()
  @IsIn(['REVIEWING', 'APPROVED', 'REJECTED', 'FOLLOW_UP', 'ADOPTED', 'WITHDRAWN', 'RETURNED', 'IN_MEETING', 'IN_FOSTER', 'IN_REFLECTION', 'FINALIZED'])
  status: string;
}
