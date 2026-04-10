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
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'kovia-animals';
    this.publicUrl =
      this.configService.get<string>('S3_PUBLIC_URL') ||
      'http://localhost:9000/kovia-animals';

    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('S3_ENDPOINT') || 'http://minio:9000',
      credentials: {
        accessKeyId:
          this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin',
        secretAccessKey:
          this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin',
      },
      region: this.configService.get<string>('S3_REGION') || 'us-east-1',
      forcePathStyle: true,
    });
  }

  async getPresignedUrl(
    filename: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    const key = `animals/${randomUUID()}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });

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
