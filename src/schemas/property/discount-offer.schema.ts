import { PropertyVisibility, StateStatus } from 'src/enums';
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
import { Plot } from './plot.schema';
import { House } from './house.schema';
import { User } from '../user.schema';

@Entity({ name: 'discount-offers' })
export class DiscountOffer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  offerType: string;

  @Column()
  discountAmount?: number;

  @Column()
  discountPercentage: number;

  @Column({ nullable: true })
  bonusDescription: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column()
  audiance: string;

  @Column('longtext', { nullable: true })
  description: string;

  @Column()
  code: number;

  @Column()
  propertyId: number;

  @Column()
  propertyType: string;

  @Column({ nullable: true })
  propertyLocation: string;

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

  @Column({ default: StateStatus.ACTIVE })
  status: string;

  @Column({ type: 'enum', enum: PropertyVisibility, default: 'PRIVATE' })
  visibility: PropertyVisibility;

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
