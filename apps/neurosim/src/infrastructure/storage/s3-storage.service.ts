import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AbstractStorageService } from './abstract-storage.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface GetUploadUrlResult {
  signedUrl: string;
  correlationId: string;
  datasetId: string;
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

  public async getUploadUrl(fileName: string): Promise<GetUploadUrlResult> {
    const datasetId = this.extractDatasetId(fileName);
    const correlationId = randomUUID();
    const storageKey = `raw/${datasetId}/${fileName}`;
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
      datasetId,
    };
  }

  public extractDatasetId(fileName: string): string {
    const match = fileName.match(
      /^([A-Za-z0-9_-]+)(?:\.\d+)?\.(xml|dat|nrs)$/i,
    );
    if (!match) {
      throw new BadRequestException(
        `Unsupported filename format: ${fileName}. Expected <dataset>.<sequence>.<xml|dat|nrs>`,
      );
    }
    const dataset = match[1];
    return dataset.slice(0, 6);
  }
}
