import { AuthProvider, StateStatus, UserRole } from 'src/enums';
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
import { Account } from './accounting/account.schema';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  notificationToken: string;

  @Column({ nullable: true })
  notificationDeviceType: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  dob: string;

  @Column({ default: '+234' })
  countryCode: string;

  @Column('simple-json', { nullable: true })
  estates: any[];

  @Column({ unique: true })
  emailAddress: string;

  @Column()
  gender: string;

  @Column({ default: 'INDIVIDUAL' })
  userType: string;

  @Column({ nullable: true })
  companyName: string;

  @Column()
  password: string;

  @Column({ default: StateStatus.INACTIVE })
  status: string;

  @Column()
  role: string;

  // Origin Information
  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  countryOfOrigin: string;

  @Column({ nullable: true })
  stateOfOrigin: string;

  @Column({ nullable: true })
  lgaOfOrigin: string;

  @Column('tinytext', { nullable: true })
  originAddress: string;

  // Residential Information
  @Column({ nullable: true })
  residentialCountry: string;

  @Column({ nullable: true })
  residentialState: string;

  @Column({ nullable: true })
  residentialCity: string;

  @Column({ nullable: true })
  residentialAddress: string;

  // Government ID
  @Column({ nullable: true })
  governmentIdType: string;

  @Column({ nullable: true })
  governmentIdNumber: string;

  @Column({ nullable: true })
  governmentIdUrl: string;

  // =============================
  // NEXT OF KIN
  // =============================

  @Column({ nullable: true })
  nextOfKinName: string;

  @Column({ nullable: true })
  nextOfKinRelationship: string;

  @Column({ nullable: true })
  nextOfKinPhoneNumber: string;

  @Column({ nullable: true })
  nextOfKinAddress: string;

  @Column({ default: AuthProvider.INTERNAL })
  authProvider: string;

  @Column({ nullable: true })
  authToken: string;

  @Column('simple-json', { nullable: true })
  documents: {
    type: string;
    fileUrl: string;
  }[];

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ nullable: true })
  referredById: number;

  @Column({ nullable: true })
  accountId: number;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  lastLoginAt: Date;

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
