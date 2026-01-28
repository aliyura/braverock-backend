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
import { User } from './../user.schema';
import { PropertyVisibility, StateStatus } from 'src/enums';
import { Layout } from './layout.schema';
import { Estate } from './estate.schema';
import { Reservation } from '../sale/reservation.schema';
import { Sale } from '../sale/sale.schema';

@Entity({ name: 'plots' })
export class Plot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  locationType: string;

  @Column({ nullable: true })
  layoutId: number;

  @ManyToOne(() => Layout, { nullable: true })
  @JoinColumn({ name: 'layoutId' })
  layout: Layout;

  @Column({ nullable: true })
  estateId: number;

  @ManyToOne(() => Estate, { nullable: true })
  @JoinColumn({ name: 'estateId' })
  estate: Estate;

  @Column()
  plotNumber: string;

  @Column({ nullable: true })
  blockNumber: string;

  @Column({ type: 'decimal', nullable: true, default: 0 })
  sizeSqm: number;

  @Column('text',{ nullable: true })
  coordinates: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  acquisitionCost: number;

  @Column()
  acquisitionType: string;

  @Column({ nullable: true })
  surveyPlanUrl: string;

  @Column('simple-json', { nullable: true })
  documents: any[];

  @Column({ default: StateStatus.AVAILABLE })
  status: string;

  @Column({ type: 'enum', enum: PropertyVisibility, default: 'PRIVATE' })
  visibility: PropertyVisibility;

  @Column()
  lga: string;

  @Column({ nullable: true })
  district: string;

  @Column()
  state: string;

  @Column('simple-json', { nullable: true })
  photos: string[];

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  documentationFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  developmentFee: number;

  @Column({ nullable: true })
  clientId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ nullable: true })
  saleId: number;

  @ManyToOne(() => Sale, { nullable: true })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column({ nullable: true })
  reservedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reservedById' })
  reservedBy: User;

  @Column({ nullable: true })
  reservationId: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column({ nullable: true })
  thumbnail: string;

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
