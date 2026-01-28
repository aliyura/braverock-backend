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
import { Employee } from './employee.schema';
import { User } from '../user.schema';
import { StateStatus } from 'src/enums';

@Entity({ name: 'suspensions' })
export class Suspension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  violationType: string;

  @Column()
  employeeId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column('date')
  startDate: Date;

  @Column('date', { nullable: true })
  endDate: Date;

  @Column('text', { nullable: true })
  reason: string;

  @Column('text', { nullable: true })
  remark: string;

  @Column({
    type: 'enum',
    enum: StateStatus,
    default: StateStatus.ACTIVE,
  })
  status: StateStatus;

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
  setCreateDates() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  setUpdateDates() {
    this.updatedAt = new Date();
  }
}
