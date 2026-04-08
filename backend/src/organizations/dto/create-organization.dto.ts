import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'DameTuPataSV', description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Rescate y adopcion de mascotas en El Salvador' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ example: 'contacto@dametupataSV.org' })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ example: '+503 7890 1234' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '@dametupataSV' })
  @IsString()
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({ example: 'dametupataSV' })
  @IsString()
  @IsOptional()
  facebook?: string;

  @ApiPropertyOptional({ example: '+50378901234' })
  @IsString()
  @IsOptional()
  whatsapp?: string;
}
