import { Inject, Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Spike } from './spike.entity';
import { Logger } from '@nestjs/common';
import { IngestJobPayload } from './infrastructure/queue/ingest-job-payload';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import {
  OBJECT_STORAGE_PORT,
  ObjectStoragePort,
} from './application/ports/object-storage.port';

const execAsync = promisify(exec);

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const PROCESSED_NEURAL_DATA_DIR =
  process.env.PROCESSED_NEURAL_DATA_DIR || 'processed_neural_data';

const getScriptPath = (): string => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return path.resolve(
      process.cwd(),
      'dist/neural-data-ingest/src/extract-data.py',
    );
  } else {
    return path.resolve(
      process.cwd(),
      'apps/neural-data-ingest/src/extract-data.py',
    );
  }
};

const SCRIPT_PATH = getScriptPath();

@Injectable()
export class AppService {
  private readonly s3Client: S3Client;

  constructor(
    @InjectRepository(Spike)
    private neuralSpikeRepository: Repository<Spike>,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly storageService: ObjectStoragePort,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') ?? '',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async getSpike(spikeId: number): Promise<Spike> {
    const result = await this.neuralSpikeRepository.findOne({
      where: { id: spikeId },
    });
    if (!result) {
      throw new Error('Neural spike not found');
    }
    return result;
  }

  async ingest(payload: IngestJobPayload): Promise<string> {
    const bucketName = this.getRequiredBucketName();
    const datasetId = payload.datasetId;
    const prefix = `raw/${datasetId}/`;
    const objectKeys = await this.storageService.listObjectKeys(
      bucketName,
      prefix,
    );
    const xmlKeys = objectKeys.filter((key) =>
      key.toLowerCase().endsWith('.xml'),
    );

    if (xmlKeys.length === 0) {
      this.logger.warn(`No XML files found in dataset prefix ${prefix}`);
      return `No XML files found for dataset ${datasetId}`;
    }

    let processedCount = 0;
    let totalSpikes = 0;

    for (const xmlKey of xmlKeys) {
      const datKey = xmlKey.replace(/\.xml$/i, '.dat');
      if (!objectKeys.includes(datKey)) {
        this.logger.warn(
          `Skipping ${xmlKey}: matching DAT not found (${datKey})`,
        );
        continue;
      }

      const xmlTempPath = await this.storageService.downloadObjectToTempFile(
        bucketName,
        xmlKey,
        '.xml',
      );

      const datTempPath = await this.storageService.downloadObjectToTempFile(
        bucketName,
        datKey,
        '.dat',
      );

      try {
        const outputFilePath = await this.runPythonScript(
          xmlTempPath,
          datTempPath,
        );
        const outputContent = fs.readFileSync(outputFilePath, 'utf8');
        const outputKey = this.buildOutputKey(datasetId, datKey);

        await this.storageService.uploadJsonToBucket(
          bucketName,
          outputKey,
          outputContent,
        );
        const ingestedCount = await this.ingestNeuralDataToDatabase(
          outputContent,
          outputKey,
        );

        processedCount += 1;
        totalSpikes += ingestedCount;
        this.logger.log(
          `Processed dataset=${datasetId} xml=${xmlKey} output=${outputKey} spikes=${ingestedCount}`,
        );
      } finally {
        this.safeRemoveFile(xmlTempPath);
        this.safeRemoveFile(datTempPath);
      }
    }

    return `Dataset ${datasetId} processed files=${processedCount} totalSpikes=${totalSpikes}`;
  }

  private async runPythonScript(
    xmlPath: string,
    datPath: string,
  ): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(
        `${PYTHON_PATH} "${SCRIPT_PATH}" "${xmlPath}" "${datPath}"`,
      );

      if (stderr) {
        this.logger.error('Python script error:', stderr);
        throw new Error('Python script execution failed');
      }

      const outputPath = stdout.trim();
      if (!outputPath) {
        throw new Error('Python script did not return output file path');
      }

      return outputPath;
    } catch (error) {
      this.logger.error('Failed to execute Python script:', error);
      throw error;
    }
  }

  private async ingestNeuralDataToDatabase(
    jsonContent: string,
    sourceFile: string,
  ): Promise<number> {
    try {
      const spikeData = JSON.parse(jsonContent) as Spike[];
      if (!Array.isArray(spikeData)) {
        this.logger.warn(`File ${sourceFile} does not contain spike array.`);
        return 0;
      }

      const spikes = spikeData.map((spike) => {
        const spikeEntity = new Spike();
        spikeEntity.channel = spike.channel;
        spikeEntity.spikeTime = spike.spikeTime;
        spikeEntity.sourceFile = sourceFile;
        return spikeEntity;
      });

      await this.neuralSpikeRepository.save(spikes);
      return spikes.length;
    } catch (error) {
      this.logger.error('Error ingesting neural data to database:', error);
      throw error;
    }
  }

  private buildOutputKey(datasetId: string, datKey: string): string {
    const fileName = path.posix.basename(datKey, '.dat');
    const outputDir =
      PROCESSED_NEURAL_DATA_DIR || `processed_neural_data/${datasetId}`;
    return `${outputDir.replace(/\/$/, '')}/${fileName}_spikes.json`;
  }

  private getRequiredBucketName(): string {
    const bucketName = this.configService.get<string>('S3_BUCKET_NAME') ?? '';
    if (!bucketName) {
      this.logger.error('S3_BUCKET_NAME is not configured');
      throw new Error('S3_BUCKET_NAME is not configured');
    }
    return bucketName;
  }

  private safeRemoveFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to remove temp file ${filePath}: ${String(error)}`,
      );
    }
  }
}
