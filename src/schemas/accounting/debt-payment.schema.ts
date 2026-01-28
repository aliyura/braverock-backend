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
import { StateStatus } from 'src/enums';
import { Debt } from './debt.schema';

@Entity({ name: 'debt_payments' })
export class DebtPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  debtId: number;

  @ManyToOne(() => Debt)
  @JoinColumn({ name: 'debtId' })
  debt: Debt;

  @Column()
  debtType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: StateStatus.PAID })
  status: string;

  @Column({ nullable: true })
  paymentRef: string;

  @Column({ nullable: true })
  paymentMethod: string;

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
