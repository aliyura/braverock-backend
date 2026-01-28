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
import { StateStatus } from 'src/enums';
import { User } from '../user.schema';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  gender: string;

  @Column({ nullable: true })
  middleName: string;

  @Column({ unique: true })
  emailAddress: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column()
  department: string;

  @Column({ nullable: true })
  position: string;

  @Column()
  dob: Date;

  @Column({ nullable: true })
  hireDate: Date;

  @Column({ nullable: true })
  employmentType: string; // Full-time, Contract, Casual, etc.

  @Column({ nullable: true })
  salary: number;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  emergencyContact: string;

  // Government ID
  @Column({ nullable: true })
  governmentIdType: string;

  @Column({ nullable: true })
  governmentIdNumber: string;

  @Column({ nullable: true })
  governmentIdUrl: string;

  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  stateOfOrigin: string;

  @Column({ nullable: true })
  residentialCountry: string;

  @Column({ nullable: true })
  residentialState: string;

  @Column({ nullable: true })
  residentialCity: string;

  @Column({ nullable: true })
  residentialAddress: string;

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
