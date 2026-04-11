import { IsString, IsIn } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsString()
  @IsIn(['REVISANDO', 'APROBADA', 'RECHAZADA', 'SEGUIMIENTO', 'ADOPTADA', 'RETIRADA'])
  status: string;
}
