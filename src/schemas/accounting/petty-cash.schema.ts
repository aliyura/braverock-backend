import { PettyCashDirection, StateStatus } from 'src/enums';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user.schema';

@Entity({ name: 'petty_cash_transactions' })
export class PettyCash {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: PettyCashDirection })
  direction: PettyCashDirection;

  @Column({ type: 'date' })
  date: Date;

  @Column('longtext')
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  runningBalance: number;

  @Column({ nullable: true })
  periodLabel: string; // e.g. "Jul 2023", "2025-01"

  @Column({ default: StateStatus.ACTIVE })
  status: string;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  insertCreated() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  insertUpdated() {
    this.updatedAt = new Date();
  }
}
