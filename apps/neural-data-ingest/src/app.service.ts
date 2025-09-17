import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Spike } from './spike.entity';
import { Logger } from '@nestjs/common';

const execAsync = promisify(exec);

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const PROCESSED_NEURAL_DATA_DIR =
  process.env.PROCESSED_NEURAL_DATA_DIR || 'processed_neural_data';
const SCRIPT_PATH = path.resolve(
  process.cwd(),
  'apps/neural-data-ingest/src/extract-data.py',
);

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Spike)
    private neuralSpikeRepository: Repository<Spike>,
    private readonly logger: Logger,
  ) {}

  async getSpike(spikeId: number): Promise<Spike> {
    const result = await this.neuralSpikeRepository.findOne({
      where: { id: spikeId },
    });
    if (!result) {
      throw new Error('Neural spike not found');
    }
    return result;
  }

  async ingest(): Promise<string> {
    const result = await this.runPythonScript();
    await this.ingestNeuralDataToDatabase();
    return result;
  }

  async runPythonScript(): Promise<string> {
    try {
      this.logger.log('Running Python script...');
      this.logger.log('process.env.SCRIPT_PATH', process.env.SCRIPT_PATH);
      this.logger.log(`PYTHON_PATH: ${PYTHON_PATH}`);
      this.logger.log('SCRIPT_PATH: ', SCRIPT_PATH);

      const { stdout, stderr } = await execAsync(
        `${PYTHON_PATH} ${SCRIPT_PATH}`,
      );

      if (stderr) {
        this.logger.error('Python script error:', stderr);
        throw new Error('Python script execution failed');
      }
      this.logger.log('stdout:', stdout);
      return stdout;
    } catch (error) {
      this.logger.error('Failed to execute Python script:', error);
      throw error;
    }
  }

  async ingestNeuralDataToDatabase(): Promise<void> {
    try {
      if (!fs.existsSync(PROCESSED_NEURAL_DATA_DIR)) {
        this.logger.log(
          `Directory ${PROCESSED_NEURAL_DATA_DIR} does not exist. No data to ingest.`,
        );
        return;
      }

      const jsonFiles = fs
        .readdirSync(PROCESSED_NEURAL_DATA_DIR)
        .filter((file) => file.endsWith('.json'));

      if (jsonFiles.length === 0) {
        this.logger.log('No JSON files found in processed data directory.');
        return;
      }

      let totalSpikesIngested = 0;

      for (const jsonFile of jsonFiles) {
        const filePath = path.join(PROCESSED_NEURAL_DATA_DIR, jsonFile);

        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const spikeData = JSON.parse(fileContent) as Spike[];

          if (!Array.isArray(spikeData)) {
            this.logger.warn(
              `File ${jsonFile} does not contain an array of spike data. Skipping.`,
            );
            continue;
          }

          const spikes = spikeData.map((spike) => {
            const spikeEntity = new Spike();
            spikeEntity.channel = spike.channel;
            spikeEntity.spikeTime = spike.spikeTime;
            spikeEntity.sourceFile = jsonFile;
            return spikeEntity;
          });

          await this.neuralSpikeRepository.save(spikes);

          totalSpikesIngested += spikes.length;
          this.logger.log(`Ingested ${spikes.length} spikes from ${jsonFile}`);
        } catch (error) {
          this.logger.error(`Error processing file ${jsonFile}:`, error);
        }
      }

      this.logger.log(`Total spikes ingested: ${totalSpikesIngested}`);
    } catch (error) {
      this.logger.error('Error ingesting neural data to database:', error);
      throw error;
    }
  }
}
