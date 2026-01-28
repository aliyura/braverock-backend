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
import { BankPaymentVoucher } from './bank-payment-voucher.schema';

@Entity({ name: 'bank_payment_voucher_lines' })
export class BankPaymentVoucherLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  serialNo: string;

  @Column()
  accountName: string;

  @Column({ nullable: true })
  accountCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number;

  @Column({ nullable: true })
  chequeNo: string;

  @Column({ nullable: true })
  remarks: string;

  @Column()
  voucherId: number;

  @ManyToOne(() => BankPaymentVoucher, (x) => x.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucherId' })
  voucher: BankPaymentVoucher;

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
