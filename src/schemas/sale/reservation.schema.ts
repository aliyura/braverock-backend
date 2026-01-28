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
import { House } from '../property/house.schema';
import { Plot } from '../property/plot.schema';

@Entity({ name: 'reservations' })
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  name: string;

  @Column()
  emailAddress: string;

  @Column()
  phoneNumber: string;

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

  @Column('text')
  description: string;

  @Column({ nullable: true })
  clientId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ default: StateStatus.PENDING })
  status: string;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
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
