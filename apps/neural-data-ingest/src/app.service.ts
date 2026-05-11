import { Inject, Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Spike } from './spike.entity';
import { SimulationRun } from './simulation-run.entity';
import { Logger } from '@nestjs/common';
import { IngestJobPayload } from './infrastructure/queue/ingest-job-payload';
import { ConfigService } from '@nestjs/config';
import {
  OBJECT_STORAGE_PORT,
  ObjectStoragePort,
} from './application/ports/object-storage.port';
import { SimulationJobPayload } from './infrastructure/queue/simulation-job-payload';

const execAsync = promisify(exec);

const PROCESSED_NEURAL_DATA_DIR =
  process.env.PROCESSED_NEURAL_DATA_DIR || 'processed_neural_data';
const SIMULATION_RESULTS_PREFIX =
  process.env.SIMULATION_RESULTS_PREFIX || 'simulations';

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
const getSimulationScriptPath = (): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction
    ? path.resolve(process.cwd(), 'dist/neural-data-ingest/src/simulate-lif.py')
    : path.resolve(
        process.cwd(),
        'apps/neural-data-ingest/src/simulate-lif.py',
      );
};
const SIMULATION_SCRIPT_PATH = getSimulationScriptPath();

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Spike)
    private readonly neuralSpikeRepository: Repository<Spike>,
    @InjectRepository(SimulationRun)
    private readonly simulationRunRepository: Repository<SimulationRun>,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly storageService: ObjectStoragePort,
  ) {}

  private getPythonPath(): string {
    return this.configService.get<string>('PYTHON_PATH', 'python3');
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
        `${this.getPythonPath()} "${SCRIPT_PATH}" "${xmlPath}" "${datPath}"`,
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
    const base = (
      this.configService.get<string>('PROCESSED_NEURAL_DATA_DIR')?.trim() ||
      'processed_neural_data'
    ).replace(/\/$/, '');
    const outputDir = `${base}/${datasetId}`;
    return `${outputDir}/${fileName}_spikes.json`;
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

  async createSimulationRun(
    payload: Omit<SimulationJobPayload, 'simulationRunId'>,
  ): Promise<SimulationRun> {
    const run = this.simulationRunRepository.create({
      datasetId: payload.datasetId,
      correlationId: payload.correlationId,
      status: 'queued',
      params: { ...payload.params },
      summary: null,
      resultKey: null,
      errorMessage: null,
    });
    return this.simulationRunRepository.save(run);
  }

  async getSimulationRun(id: number): Promise<SimulationRun> {
    const run = await this.simulationRunRepository.findOne({ where: { id } });
    if (!run) {
      throw new Error(`Simulation run ${id} not found`);
    }
    return run;
  }

  async runSimulationJob(payload: SimulationJobPayload): Promise<void> {
    const run = await this.getSimulationRun(payload.simulationRunId);
    const bucketName = this.getRequiredBucketName();
    await this.simulationRunRepository.update(run.id, {
      status: 'running',
      errorMessage: null,
    });

    try {
      const processedPrefix = `${PROCESSED_NEURAL_DATA_DIR.replace(/\/$/, '')}/${payload.datasetId}/`;
      const processedKeys = await this.storageService.listObjectKeys(
        bucketName,
        processedPrefix,
      );
      const sourceKey = processedKeys.find((key) =>
        key.toLowerCase().endsWith('_spikes.json'),
      );
      if (!sourceKey) {
        throw new Error(
          `No processed spikes JSON found under prefix ${processedPrefix}`,
        );
      }
      const sourcePath = await this.storageService.downloadObjectToTempFile(
        bucketName,
        sourceKey,
        '.json',
      );
      try {
        const simulationOutputPath = await this.runSimulationScript(
          sourcePath,
          payload.params,
        );
        const outputContent = fs.readFileSync(simulationOutputPath, 'utf8');
        const outputKey = `${SIMULATION_RESULTS_PREFIX.replace(/\/$/, '')}/${payload.datasetId}/run-${run.id}.json`;

        await this.storageService.uploadJsonToBucket(
          bucketName,
          outputKey,
          outputContent,
        );

        const parsed = JSON.parse(outputContent) as {
          summary?: Record<string, number | string | boolean>;
        };
        await this.simulationRunRepository.update(run.id, {
          status: 'completed',
          resultKey: outputKey,
          summary: parsed.summary ?? null,
          errorMessage: null,
        });
        this.safeRemoveFile(simulationOutputPath);
      } finally {
        this.safeRemoveFile(sourcePath);
      }
    } catch (error) {
      await this.simulationRunRepository.update(run.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async runSimulationScript(
    spikesJsonPath: string,
    params: SimulationJobPayload['params'],
  ): Promise<string> {
    const args = [
      `"${spikesJsonPath}"`,
      `${params.durationMs}`,
      `${params.dtMs}`,
      `${params.nExc}`,
      `${params.nInh}`,
      `${params.pConnect}`,
      `${params.wInput}`,
      `${params.wRec}`,
      `${params.seed}`,
    ].join(' ');
    const { stdout, stderr } = await execAsync(
      `${this.getPythonPath()} "${SIMULATION_SCRIPT_PATH}" ${args}`,
    );

    if (stderr) {
      this.logger.error(`Simulation script stderr: ${stderr}`);
      throw new Error('Simulation script execution failed');
    }
    const outputPath = stdout.trim();
    if (!outputPath) {
      throw new Error('Simulation script did not return output path');
    }
    return outputPath;
  }
}
