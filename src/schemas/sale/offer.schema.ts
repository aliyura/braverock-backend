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
import { Sale } from './sale.schema';
import { StateStatus } from 'src/enums';
import { House } from '../property/house.schema';
import { Plot } from '../property/plot.schema';
@Entity({ name: 'sale_offers' })
export class Offer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  offerNumber: string;

  @Column({ nullable: true })
  offerLetter: string;

  @Column({ nullable: true })
  remark: string;

  @Column({ default: StateStatus.OFFERED })
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
