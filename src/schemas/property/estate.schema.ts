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
import { EstateType, PropertyVisibility, StateStatus } from 'src/enums';

@Entity({ name: 'estates' })
export class Estate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: EstateType.RESIDENTIAL })
  type: string;

  @Column('text',{ nullable: true })
  coordinates: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ nullable: true })
  design: string;

  @Column()
  lga: string;

  @Column({ nullable: true })
  district: string;

  @Column()
  state: string;

  @Column({ default: 0 })
  totalHouses: number;

  @Column({ default: 0 })
  availableHouses: number;

  @Column({ default: 0 })
  soldHouses: number;

  @Column({ default: 0 })
  totalPlots: number;

  @Column({ default: 0 })
  availablePlots: number;

  @Column({ default: 0 })
  soldPlots: number;

  @Column({ default: StateStatus.ACTIVE })
  status: string;

  @Column({ type: 'enum', enum: PropertyVisibility, default: 'PRIVATE' })
  visibility: PropertyVisibility;

  @Column('text', { nullable: true })
  features: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  acquisitionType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  acquisitionCost: number;

  @Column('simple-json', { nullable: true })
  approvals: any[];

  @Column({ nullable: true })
  planUrl: string;

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  engineerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'engineerId' })
  engineer: User;

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
