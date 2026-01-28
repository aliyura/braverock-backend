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
import { User } from './user.schema';
import { Estate } from './property/estate.schema';
import { Helpers } from 'src/helpers';
import { BillActivityDto } from 'src/dtos/activity.dto';

@Entity({ name: 'bills' })
export class Bill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Daily Bill' })
  title: string;

  @Column()
  estateId: number;

  @ManyToOne(() => Estate)
  @JoinColumn({ name: 'estateId' })
  estate: Estate;

  @Column()
  approverId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @Column({ default: StateStatus.PENDING })
  status: string;

  @Column('simple-json')
  activities: BillActivityDto[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  approvedAmount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ default: Helpers.getDate() })
  date: string;

  @Column('text', { nullable: true })
  challenges: string;

  @Column('text', { nullable: true })
  materialsUsed: string;

  @Column('simple-array', { nullable: true })
  photos: string[];

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

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
