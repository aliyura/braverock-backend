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

@Entity({ name: 'payment_requests' })
export class PaymentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  serialNo: string;

  @Column()
  accountName: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  bank: string;

  @Column('longtext', { nullable: true })
  narration: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'enum', enum: StateStatus, default: StateStatus.PENDING })
  requestStatus: StateStatus;

  // Optional link to voucher when paid
  @Column({ nullable: true })
  voucherId: number;

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
