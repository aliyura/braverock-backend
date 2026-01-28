import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Investment } from './investment.schema';
import { User } from '../user.schema';

@Entity({ name: 'investment_settlements' })
export class InvestmentSettlement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  investmentId: number;

  @ManyToOne(() => Investment)
  @JoinColumn({ name: 'investmentId' })
  investment: Investment;

  @Column('decimal', { precision: 18, scale: 2 })
  amountPaid: number;

  @Column()
  receiptUrl: string;

  @Column({ type: 'text' })
  remark: string;

  @Column()
  clientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column()
  settledById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'settledById' })
  settledBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
