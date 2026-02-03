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
import { Investment } from '../investment/investment.schema';
import { StateStatus } from 'src/enums';
import { Sale } from './sale.schema';
import { House } from '../property/house.schema';
import { Plot } from '../property/plot.schema';

@Entity({ name: 'investment_authority_letters' })
export class AuthorityLetter {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    letterNumber: string;

    @Column({ nullable: true })
    fileUrl: string;

    @Column({ nullable: true })
    remark: string;

    @Column({ default: StateStatus.PENDING })
    status: string;

    @Column({ nullable: true })
    investmentId: number;

    @ManyToOne(() => Investment, { nullable: true })
    @JoinColumn({ name: 'investmentId' })
    investment: Investment;

    @Column({ nullable: true })
    saleId: number;

    @ManyToOne(() => Sale, { nullable: true })
    @JoinColumn({ name: 'saleId' })
    sale: Sale;

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
