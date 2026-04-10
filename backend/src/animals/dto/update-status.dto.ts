import { IsEnum } from 'class-validator';

enum AllowedStatus {
  AVAILABLE = 'AVAILABLE',
  IN_PROCESS = 'IN_PROCESS',
  ADOPTED = 'ADOPTED',
}

export class UpdateStatusDto {
  @IsEnum(AllowedStatus, {
    message: 'Status must be one of: AVAILABLE, IN_PROCESS, ADOPTED. Use the archive endpoint for ARCHIVED.',
  })
  status: 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED';
}
