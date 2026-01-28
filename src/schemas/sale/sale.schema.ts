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
import { Reservation } from './reservation.schema';
import { Allocation } from './allocation.schema';
import { House } from '../property/house.schema';
import { Plot } from '../property/plot.schema';
import { Offer } from './offer.schema';
import { PaymentPlan } from './payment-plan.schema';

@Entity({ name: 'sales' })
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  propertyId: number;

  @Column()
  propertyType: string;

  @Column({ nullable: true })
  houseId: number;

  @Column({ nullable: true })
  plotId: number;

  @Column({ nullable: true })
  serialNumber: number;

  @ManyToOne(() => House, { nullable: true })
  @JoinColumn({ name: 'houseId' })
  house: House;

  @ManyToOne(() => Plot, { nullable: true })
  @JoinColumn({ name: 'plotId' })
  plot: Plot;

  @Column()
  title: string;

  @Column()
  name: string;

  @Column()
  emailAddress: string;

  @Column()
  phoneNumber: string;

  @Column()
  dob: string;

  @Column()
  maritalStatus: string;

  @Column()
  gender: string;

  @Column()
  transactionRef: string;

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

  // Employer details
  @Column({ nullable: true })
  employer: string;

  @Column({ nullable: true })
  employmentStatus: string;

  @Column({ nullable: true })
  employerAddress: string;

  @Column({ nullable: true })
  employerCity: string;

  @Column({ nullable: true })
  employerCountry: string;

  @Column({ nullable: true })
  motherMaidenName: string;

  // Company details for corporate clients
  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  rcNumber: string;

  @Column({ nullable: true })
  companyType: string;

  @Column({ nullable: true })
  tin: string;

  @Column({ nullable: true })
  registeredAddress: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  designation: string;

  // NEXT OF KIN
  @Column({ nullable: true })
  nextOfKinName: string;

  @Column({ nullable: true })
  nextOfKinRelationship: string;

  @Column({ nullable: true })
  nextOfKinCity: string;

  @Column({ nullable: true })
  nextOfKinResidentialAddress: string;

  @Column({ nullable: true })
  nextOfKinTelephone: string;

  // Payment fields
  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentMode: string;

  @Column({ nullable: true })
  paymentReceipt: string;

  @Column('text', { nullable: true })
  additionalInformation: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 20000 })
  registrationFees: number;

  @Column({ default: StateStatus.UNPAID })
  registrationFeesStatus: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  propertyPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  propertyPayable: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPayableAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  facilityFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  waterFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  electricityFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  supervisionFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  authorityFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  otherFee: number;

  // Paid sections
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  propertyPayablePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  facilityFeePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  waterFeePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  electricityFeePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  supervisionFeePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  authorityFeePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  otherFeePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  infrastructureCostPaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  agencyFeePaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  infrastructureCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  agencyFee: number;

  @Column({ nullable: true })
  agentId: number;

  @Column({ nullable: true })
  agentName: string;

  @Column({ nullable: true })
  agentPhoneNumber: string;

  @Column({ nullable: true })
  clientId: number;

  @Column({ default: StateStatus.PENDING })
  status: string;

  @Column({ default: StateStatus.UNPAID })
  paymentStatus: string;

  @Column({ nullable: true, default: StateStatus.PENDING })
  allocationStatus: string;

  @Column({ nullable: true })
  allocationId: number;

  @ManyToOne(() => Allocation, { nullable: true })
  @JoinColumn({ name: 'allocationId' })
  allocation: Allocation;

  @Column({ nullable: true, default: StateStatus.PENDING })
  offerStatus: string;

  @Column({ nullable: true })
  offerId: number;

  @ManyToOne(() => Offer, { nullable: true })
  @JoinColumn({ name: 'offerId' })
  offer: Offer;

  @Column({ nullable: true })
  code: number;

  @Column()
  clientType: string;

  @Column({ nullable: true })
  reservationCode: number;

  @Column('simple-json', { nullable: true })
  documents: {
    documentName: string;
    fileUrl: string;
  }[];

  @Column('simple-json', { nullable: true })
  updateHistory: any[];

  @Column({ nullable: true })
  reservationId: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  paymentPlanId: number;

  @ManyToOne(() => PaymentPlan)
  @JoinColumn({ name: 'paymentPlanId' })
  paymentPlan: PaymentPlan;

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
