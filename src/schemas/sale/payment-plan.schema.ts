import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Sale } from './sale.schema';
import { User } from '../user.schema';
import { StateStatus } from 'src/enums';

@Entity({ name: 'payment_plans' })
export class PaymentPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  saleId: number;

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column()
  clientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column()
  planName: string; // e.g "6 Months Plan", "Quarterly Plan", "Custom Payment Plan"

  @Column()
  frequency: string; // MONTHLY | WEEKLY | QUARTERLY | YEARLY | CUSTOM

  @Column({ nullable: true })
  customDate: string; // ISO date for one-off custom payments

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountPerCycle: number;

  @Column()
  totalCycles: number;

  @Column({ default: 0 })
  cyclesCompleted: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  nextPaymentDate: string;

  @Column({ default: StateStatus.ACTIVE })
  status: string; // ACTIVE | COMPLETED | CANCELLED

  @Column('simple-json', { nullable: true })
  meta: any; // for storing flexible data

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
