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
import { Account } from './account.schema';
import { StateStatus, TransactionType } from 'src/enums';
import { Bill } from '../bill.schema';
import { Incident } from '../incident.schema';
import { FundRequest } from './fund-request.schema';

@Entity({ name: 'account_transactions' })
export class AccountTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({
    type: 'enum',
    enum: StateStatus,
  })
  status: StateStatus;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column()
  targetType: string;

  @Column({ nullable: true })
  billId: number;

  @ManyToOne(() => Bill, { nullable: true })
  @JoinColumn({ name: 'billId' })
  bill: Bill;

  @Column({ nullable: true })
  incidentId: number;

  @ManyToOne(() => Incident, { nullable: true })
  @JoinColumn({ name: 'incidentId' })
  incident: Incident;

  @Column({ nullable: true })
  fundRequestId: number;

  @ManyToOne(() => FundRequest, { nullable: true })
  @JoinColumn({ name: 'fundRequestId' })
  fundRequest: FundRequest;

  @Column('text', { nullable: true })
  reason: string;

  @Column()
  accountId: number;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

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
