import { StateStatus, VoucherStatus } from 'src/enums';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user.schema';
import { BankPaymentVoucherLine } from './bank-payment-voucher-line.schema';

@Entity({ name: 'bank_payment_vouchers' })
export class BankPaymentVoucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  voucherNo: string;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ nullable: true })
  payee: string;

  @Column('longtext', { nullable: true })
  narration: string;

  @Column({ nullable: true })
  chequeNo: string;

  @Column({ type: 'enum', enum: VoucherStatus, default: VoucherStatus.DRAFT })
  voucherStatus: VoucherStatus;

  @OneToMany(() => BankPaymentVoucherLine, (x) => x.voucher, { nullable:true, cascade: true })
  lines: BankPaymentVoucherLine[];

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
