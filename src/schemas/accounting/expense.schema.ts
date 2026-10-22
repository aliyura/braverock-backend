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
import { Layout } from '../property/layout.schema';
import { ExpenseTargetType } from 'src/enums';

@Entity({ name: 'expensess' })
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  category: string;

  @Column({ default: ExpenseTargetType.OFFICE })
  targetType: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  estateId: number;

  @ManyToOne(() => Estate, { nullable: true })
  @JoinColumn({ name: 'estateId' })
  estate: Estate;

  @Column({ nullable: true })
  layoutId: number;

  @ManyToOne(() => Layout, { nullable: true })
  @JoinColumn({ name: 'layoutId' })
  layout: Layout;

  @Column('text', { nullable: true })
  officePurpose: string;

  @Column('text', { nullable: true })
  receipt: string;

  @Column('simple-json', { nullable: true })
  proofImages: string[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column('text', { nullable: true })
  description: string;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  date: Date;

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
