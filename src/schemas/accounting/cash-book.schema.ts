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

@Entity({ name: 'cash_book_entries' })
export class CashBook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  serialNo: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  particulars: string;

  @Column('longtext', { nullable: true })
  description: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  inflow: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  outflow: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ nullable: true })
  projects: string;

  @Column({ nullable: true })
  remarks: string;

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
