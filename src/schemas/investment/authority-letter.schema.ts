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
import { Investment } from './investment.schema';
import { StateStatus } from 'src/enums';

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

    @Column()
    investmentId: number;

    @ManyToOne(() => Investment)
    @JoinColumn({ name: 'investmentId' })
    investment: Investment;

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
