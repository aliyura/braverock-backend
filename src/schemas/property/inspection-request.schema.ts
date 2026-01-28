import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from './../user.schema';
import { House } from './house.schema';
import { StateStatus } from 'src/enums';
import { Plot } from './plot.schema';

@Entity({ name: 'inspection_requests' })
export class InspectionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phoneNumber: string;

  @Column({ nullable: true })
  emailAddress: string;

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

  @Column()
  preferredDate: string;

  @Column()
  preferredTime: string;

  @Column('text', { nullable: true })
  message: string;

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
