import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from './user.schema';
import { Estate } from './property/estate.schema';
import { StateStatus } from 'src/enums';
import { Layout } from './property/layout.schema';
import { Helpers } from 'src/helpers';

@Entity({ name: 'complaints' })
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  department: string;

  @Column({ default: Helpers.getCode() })
  code: number;

  @Column({ nullable: true })
  locationId: number;

  @Column({ nullable: true })
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

  @Column({ default: StateStatus.PENDING })
  status: string;

  @Column('simple-array', { nullable: true })
  photos: string[];

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
