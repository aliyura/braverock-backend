import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Currency, InvestmentDuration, StateStatus } from 'src/enums';
import { User } from '../user.schema';
import { AuthorityLetter } from '../sale/authority-letter.schema';

@Entity({ name: 'investments' })
export class Investment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: Currency, default: Currency.NGN })
  currency: Currency;

  @Column({ type: 'enum', enum: InvestmentDuration })
  duration: InvestmentDuration;

  @Column({ nullable: true })
  siteId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: StateStatus,
    default: StateStatus.PENDING,
  })
  status: StateStatus;

  // =============================
  // INVESTOR (CLIENT SNAPSHOT)
  // =============================

  @Column()
  clientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  // =============================
  // PAYMENT DETAILS
  // =============================

  @Column({ nullable: true })
  paymentProofUrl: string;

  @Column({ nullable: true })
  paymentReceiptUrl: string;

  @Column({ nullable: true })
  paymentReference: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  @Column({ nullable: true, default: StateStatus.PENDING })
  authorityLetterStatus: string;

  @Column({ nullable: true })
  authorityLetterId: number;

  @ManyToOne(() => AuthorityLetter, { nullable: true })
  @JoinColumn({ name: 'authorityLetterId' })
  authorityLetter: AuthorityLetter;

  // =============================
  // LIFECYCLE DATES
  // =============================

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  // =============================
  // SETTLEMENT
  // =============================

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  settlementAmount: number;

  @Column({ nullable: true })
  settlementReceiptUrl: string;

  @Column({ type: 'text', nullable: true })
  settlementRemark: string;

  // =============================
  // AUDIT
  // =============================

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setCreated() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  setUpdated() {
    this.updatedAt = new Date();
  }
}
