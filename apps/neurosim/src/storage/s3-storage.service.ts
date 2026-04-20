import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AbstractStorageService } from './abstract-storage.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface GetUploadUrlResult {
  signedUrl: string;
  correlationId: string;
  uploadKey: string;
}

@Injectable()
export class S3StorageService extends AbstractStorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    super();
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION') ?? '',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
    this.bucketName = this.configService.get('S3_BUCKET_NAME') ?? '';
  }

  public async getUploadUrl(key: string): Promise<GetUploadUrlResult> {
    const correlationId = randomUUID();
    const storageKey = `user-uploads/${key}`;
    const putObjectCommand: PutObjectCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });
    const signedUrl = await getSignedUrl(this.s3Client, putObjectCommand, {
      expiresIn: 60,
    });
    return {
      signedUrl,
      correlationId,
      uploadKey: storageKey,
    };
  }
}
