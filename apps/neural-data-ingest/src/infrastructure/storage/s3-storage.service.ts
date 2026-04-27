import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ObjectStoragePort } from '../../application/ports/object-storage.port';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { Logger } from '@nestjs/common';

@Injectable()
export class S3StorageService implements ObjectStoragePort {
  private s3Client: S3Client;

  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION') ?? '',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async uploadJsonToBucket(
    bucketName: string,
    key: string,
    jsonContent: string,
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: Buffer.from(jsonContent, 'utf8'),
        ContentType: 'application/json',
      }),
    );
  }

  async listObjectKeys(bucketName: string, prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      const batch = (response.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key));
      keys.push(...batch);

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  async downloadObjectToTempFile(
    bucketName: string,
    key: string,
    extension: string,
  ): Promise<string> {
    const tempPath = path.join(
      tmpdir(),
      `neural-ingest-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
    );

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    if (!response.Body) {
      this.logger.error(`S3 object body is empty: ${key}`);
      throw new Error(`S3 object body is empty: ${key}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<
      Buffer | Uint8Array
    >) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    fs.writeFileSync(tempPath, Buffer.concat(chunks));

    return tempPath;
  }
}
