import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('spikes')
export class Spike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  channel: string;

  @Column('float')
  spikeTime: number;

  @Column()
  sourceFile: string;

  @CreateDateColumn()
  createdAt: Date;
}