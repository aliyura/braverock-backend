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

@Entity({ name: 'sales_accounts' })
export class SalesAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  serialNo: string;

  @Column()
  clientName: string;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  blockNo: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  facility: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  payment: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  mrA: string;

  @Column({ nullable: true })
  mrB: string;

  // Optional: link to a braverock client record if you want later
  @Column({ nullable: true })
  clientId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ nullable: true })
  estateId: number;

  @Column({ nullable: true })
  saleId: number;

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
