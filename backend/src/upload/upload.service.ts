import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  // Internal client for server-side operations (delete, etc.) — uses Docker hostname
  private readonly s3: S3Client;
  // Public client for presigned URLs — signed for the public-facing hostname
  private readonly s3Public: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'kovia-animals';
    this.publicUrl =
      this.configService.get<string>('S3_PUBLIC_URL') ||
      'http://localhost:9000/kovia-animals';

    const credentials = {
      accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin',
      secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin',
    };
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    const checksumConfig = {
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
    };

    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('S3_ENDPOINT') || 'http://minio:9000',
      credentials,
      region,
      forcePathStyle: true,
      ...checksumConfig,
    });

    // Presigned URLs must be signed with the public endpoint so the Host header matches
    const publicEndpoint =
      this.configService.get<string>('S3_PUBLIC_ENDPOINT') || 'http://localhost:9000';
    this.s3Public = new S3Client({
      endpoint: publicEndpoint,
      credentials,
      region,
      forcePathStyle: true,
      ...checksumConfig,
    });
  }

  async getPresignedUrl(
    filename: string,
    contentType: string,
    folder: string = 'animals',
  ): Promise<{ url: string; key: string }> {
    const key = `${folder}/${randomUUID()}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    // Use public client so the signature is computed for the public-facing host
    const url = await getSignedUrl(this.s3Public, command, { expiresIn: 300 });

    return { url, key };
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
  }
}
