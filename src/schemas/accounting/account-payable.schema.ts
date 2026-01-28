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
import { Estate } from '../property/estate.schema';
import { Sale } from '../sale/sale.schema';

@Entity({ name: 'account_payables' })
export class AccountPayable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column('longtext')
  description: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  // Optional relationships for Realta context
  @Column({ nullable: true })
  vendorId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: User;

  @Column({ nullable: true })
  estateId: number;

  @ManyToOne(() => Estate, { nullable: true })
  @JoinColumn({ name: 'estateId' })
  etsate: Estate;

  @Column({ nullable: true })
  saleId: number;

  @ManyToOne(() => Sale, { nullable: true })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

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
