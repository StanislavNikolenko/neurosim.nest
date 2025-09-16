import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AbstractStorageService } from './abstract-storage.service';
import { StorageResult } from './storage.interface';

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

  async uploadFile(
    file: Express.Multer.File,
    key?: string,
  ): Promise<StorageResult> {
    const fileKey = key || this.generateKey(file.originalname, 'uploads');

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${fileKey}`;

      return this.createStorageResult(file, fileKey, url);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }
}
