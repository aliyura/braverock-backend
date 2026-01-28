import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { StateStatus } from 'src/enums';
import { Sale } from './sale.schema';
import { User } from '../user.schema';
import { Plot } from '../property/plot.schema';
import { House } from '../property/house.schema';
@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  type: string;

  @Column()
  amount: number;

  @Column({ nullable: true })
  transactionRef: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  transactionReceipt: string;

  @Column('tinytext', { nullable: true })
  narration: string;

  @Column({ default: StateStatus.PENDING })
  status: string;

  @Column()
  saleId: number;

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column({ nullable: true })
  houseId: number;

  @Column({ nullable: true })
  plotId: number;

  @ManyToOne(() => House, { nullable: true })
  @JoinColumn({ name: 'houseId' })
  house: House;

  @ManyToOne(() => Plot, { nullable: true })
  @JoinColumn({ name: 'plotId' })
  plot: Plot;

  @Column()
  clientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

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
