import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SimulationStatus = 'queued' | 'running' | 'completed' | 'failed';

@Entity('simulation_runs')
export class SimulationRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  datasetId: string;

  @Column({ type: 'varchar', default: 'queued' })
  status: SimulationStatus;

  @Column({ type: 'jsonb' })
  params: Record<string, number | string | boolean>;

  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, number | string | boolean> | null;

  @Column({ type: 'text', nullable: true })
  resultKey: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column()
  correlationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
