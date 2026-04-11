import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';

const mockSend = vi.fn().mockResolvedValue({});

// Mock @aws-sdk/client-s3 before importing the service
vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = mockSend;
    constructor(_config?: any) {}
  }
  class MockPutObjectCommand {
    constructor(public input: any) {}
  }
  class MockDeleteObjectCommand {
    constructor(public input: any) {}
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: MockPutObjectCommand,
    DeleteObjectCommand: MockDeleteObjectCommand,
  };
});

// Mock @aws-sdk/s3-request-presigner
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio:9000/kovia-animals/presigned-url'),
}));

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      S3_ENDPOINT: 'http://minio:9000',
      S3_ACCESS_KEY: 'minioadmin',
      S3_SECRET_KEY: 'minioadmin',
      S3_BUCKET: 'kovia-animals',
      S3_REGION: 'us-east-1',
      S3_PUBLIC_URL: 'http://localhost:9000/kovia-animals',
    };
    return config[key];
  }),
};

describe('UploadService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to get the version with mocked deps
    const { UploadService } = await import('./upload.service');
    service = new UploadService(mockConfigService as unknown as ConfigService);
  });

  describe('getPresignedUrl', () => {
    it('should return { url, key } with S3 presigned URL', async () => {
      const result = await service.getPresignedUrl('photo.jpg', 'image/jpeg');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.url).toContain('presigned-url');
      expect(result.key).toMatch(/^animals\/[a-f0-9-]+\/photo\.jpg$/);
    });

    it('should use "animals" prefix when no folder param provided (backward compat)', async () => {
      const result = await service.getPresignedUrl('photo.jpg', 'image/jpeg');

      expect(result.key).toMatch(/^animals\//);
    });

    it('should use "applications" prefix when folder="applications"', async () => {
      const result = await service.getPresignedUrl('doc.jpg', 'image/jpeg', 'applications');

      expect(result.key).toMatch(/^applications\//);
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL for a key', () => {
      const url = service.getPublicUrl('animals/uuid/photo.jpg');

      expect(url).toBe('http://localhost:9000/kovia-animals/animals/uuid/photo.jpg');
    });
  });

  describe('deleteObject', () => {
    it('should call S3 DeleteObjectCommand via send', async () => {
      await service.deleteObject('animals/uuid/photo.jpg');

      expect(mockSend).toHaveBeenCalled();
    });
  });
});
