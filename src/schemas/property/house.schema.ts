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
import { Estate } from './estate.schema';
import { User } from '../user.schema';
import { Reservation } from '../sale/reservation.schema';
import { Sale } from '../sale/sale.schema';

@Entity({ name: 'houses' })
export class House {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  locationType: string;

  @Column('longtext', { nullable: true })
  description: string;

  @Column('longtext', { nullable: true })
  features: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column('simple-json', { nullable: true })
  photos: string[];

  @Column({ nullable: true })
  design: string;

  @Column({ nullable: true })
  plotNumber: string;

  @Column()
  houseNumber: string;

  @Column({ nullable: true })
  blockNumber: string;

  @Column({ type: 'decimal', nullable: true, default: 0 })
  sizeSqm: number;

  @Column()
  type: string;

  @Column()
  buildingType: string;

  @Column('text', { nullable: true })
  coordinates: string;

  @Column({ nullable: true })
  bedRooms: number;

  @Column({ nullable: true })
  livingRoom: number;

  @Column({ nullable: true })
  kitchen: number;

  @Column({ nullable: true })
  dianning: number;

  @Column({ nullable: true })
  toilets: number;

  @Column({ nullable: true })
  boysquater: number;

  @Column({ default: StateStatus.AVAILABLE })
  status: string;

  @Column({ type: 'enum', enum: PropertyVisibility, default: 'PRIVATE' })
  visibility: PropertyVisibility;

  @Column({ nullable: true })
  estateId: number;

  @ManyToOne(() => Estate)
  @JoinColumn({ name: 'estateId' })
  estate: Estate;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  @Column()
  lga: string;

  @Column({ nullable: true })
  district: string;

  @Column()
  state: string;

  @Column()
  acquisitionType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  acquisitionCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  documentationFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  developmentFee: number;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ nullable: true })
  clientId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ nullable: true })
  reservationId: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column({ nullable: true })
  reservedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reservedById' })
  reservedBy: User;

  @Column({ nullable: true })
  saleId: number;

  @ManyToOne(() => Sale, { nullable: true })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

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
