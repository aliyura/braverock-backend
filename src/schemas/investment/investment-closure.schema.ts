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

@Entity({ name: 'investment_closures' })
export class InvestmentClosure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  investmentId: number;

  @ManyToOne(() => Investment)
  @JoinColumn({ name: 'investmentId' })
  investment: Investment;

  @Column('decimal', { precision: 18, scale: 2 })
  refundAmount: number;

  @Column()
  refundReceiptUrl: string;

  @Column({ type: 'text' })
  remark: string;

  @Column()
  clientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column()
  closedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'closedById' })
  closedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
