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
import { StateStatus } from 'src/enums';
import { User } from '../user.schema';

@Entity({ name: 'attendances' })
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column()
  date: Date;

  @Column({ nullable: true })
  checkInTime: string;

  @Column({ nullable: true })
  checkOutTime: string;

  @Column({ default: 0 })
  workHours: number;

  @Column({ default: false })
  isLate: boolean;

  @Column({ default: false })
  isAbsent: boolean;

  @Column({ default: 0 })
  overtimeHours: number;

  @Column({ nullable: true })
  siteName: string;

  @Column({ nullable: true })
  remarks: string;

  @Column({ default: StateStatus.ACTIVE })
  status: string;

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
