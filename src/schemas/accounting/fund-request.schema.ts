import { StateStatus } from 'src/enums';
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

@Entity({ name: 'fund_requets' })
export class FundRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  reason: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  approvedAmount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({
    type: 'enum',
    enum: StateStatus,
    default: StateStatus.PENDING,
  })
  status: StateStatus;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  settledById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'settledById' })
  settledBy: User;

  @Column({ nullable: true })
  approvedDate: Date;

  @Column({ nullable: true })
  settledDate: Date;

  @Column({ nullable: true })
  rejectedDate: Date;

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
