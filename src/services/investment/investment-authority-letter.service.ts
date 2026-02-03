import { AuthorityLetter } from '../../schemas/sale/authority-letter.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import {
    ActionType,
    NotificationCategory,
    NotificationPriority,
    StateStatus,
    UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { AuthorityLetterDto, UpdateAuthorityLetterDto } from 'src/dtos/investment/authority-letter.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Investment } from 'src/schemas/investment/investment.schema';
import { UpdateStatusDto } from 'src/dtos/master';
import { Sale } from 'src/schemas/sale/sale.schema';
import { House } from 'src/schemas/property/house.schema';
import { Plot } from 'src/schemas/property/plot.schema';

@Injectable()
export class AuthorityLetterService {
    cache = new NodeCache();
    constructor(
        @InjectRepository(AuthorityLetter)
        private authorityLetterRepo: Repository<AuthorityLetter>,
        @InjectRepository(Investment) private investmentRepo: Repository<Investment>,
        @InjectRepository(Sale) private saleRepo: Repository<Sale>,
        @InjectRepository(House) private houseRepo: Repository<House>,
        @InjectRepository(Plot) private plotRepo: Repository<Plot>,
        private readonly queueProducerService: ProducerService,
    ) { }

    async addAuthorityLetter(
        authenticatedUser: User,
        requestDto: AuthorityLetterDto,
    ): Promise<ApiResponse> {
        try {
            if (
                authenticatedUser.role != UserRole.ADMIN &&
                authenticatedUser.role != UserRole.SUPERADMIN &&
                authenticatedUser.role != UserRole.MANAGER
            )
                return Response.failure(Messages.NoPermission);

            let investment: Investment = null;
            if (requestDto.investmentId) {
                investment = await this.investmentRepo.findOne({
                    where: { id: requestDto.investmentId },
                    relations: { client: true }
                });
                if (!investment) return Response.failure(Messages.InvestmentNotFound);
            }

            // Check for existing letter
            const query: any = {};
            if (requestDto.investmentId) query.investmentId = requestDto.investmentId;
            if (requestDto.saleId) query.saleId = requestDto.saleId;
            if (requestDto.houseId) query.houseId = requestDto.houseId;
            if (requestDto.plotId) query.plotId = requestDto.plotId;

            const existingLetter = await this.authorityLetterRepo.findOne({
                where: query,
            });

            if (existingLetter) {
                existingLetter.fileUrl = requestDto.fileUrl;
                existingLetter.updatedAt = new Date();

                const updateHistory = {
                    ...requestDto,
                    actionType: ActionType.UPDATE,
                    actionDate: new Date(),
                    actionBy: authenticatedUser.id,
                    actionByUser: authenticatedUser.name,
                };

                if (existingLetter.updateHistory == null)
                    existingLetter.updateHistory = [updateHistory];
                else existingLetter.updateHistory.push(updateHistory);

                const savedLetter = await this.authorityLetterRepo.save(existingLetter);
                return Response.success(savedLetter);
            } else {
                const request = {
                    ...requestDto,
                    status: StateStatus.APPROVED,
                    createdById: authenticatedUser.id,
                    letterNumber: Helpers.generateNumber('AL'),
                } as AuthorityLetter;

                const createdLetter = await this.authorityLetterRepo.save(request);
                if (createdLetter) {
                    if (investment) {
                        investment.authorityLetterStatus = StateStatus.APPROVED;
                        investment.authorityLetterId = createdLetter.id;
                        await this.investmentRepo.save(investment);

                        if (investment.client) {
                            const notification = {
                                from: 0,
                                to: {
                                    name: investment.client.name,
                                    emailAddress: investment.client.emailAddress,
                                    phoneNumber: investment.client.phoneNumber,
                                },
                                context: createdLetter,
                                subject: 'Investment Authority Letter',
                                category: NotificationCategory.INVESTMENT_APPROVED,
                                enableEmail: true,
                                enableSMS: true,
                                enableInApp: false,
                                priority: NotificationPriority.HIGH,
                            } as NotificationDto;

                            this.queueProducerService.publishNotification(notification);
                        }
                    }

                    return Response.success(createdLetter);
                } else {
                    return Response.failure('Unable to add authority letter');
                }
            }
        } catch (ex) {
            console.log(Messages.Exception, ex);
            return Response.failure(Messages.Exception);
        }
    }

    async updateAuthorityLetter(
        authenticatedUser: User,
        letterId: number,
        requestDto: UpdateAuthorityLetterDto,
    ): Promise<ApiResponse> {
        try {
            if (
                authenticatedUser.role != UserRole.ADMIN &&
                authenticatedUser.role != UserRole.SUPERADMIN &&
                authenticatedUser.role != UserRole.MANAGER
            )
                return Response.failure(Messages.NoPermission);

            const letter = await this.authorityLetterRepo.findOne({
                where: { id: letterId },
            });
            if (!letter) return Response.failure('Authority letter not found');

            const updateRequest = {
                ...letter,
                ...requestDto,
            } as unknown as AuthorityLetter;

            const updateHistory = {
                ...requestDto,
                actionType: ActionType.UPDATE,
                actionDate: new Date(),
                actionBy: authenticatedUser.id,
                actionByUser: authenticatedUser.name,
            };

            if (updateRequest.updateHistory == null)
                updateRequest.updateHistory = [updateHistory];
            else updateRequest.updateHistory.push(updateHistory);

            await this.authorityLetterRepo.update({ id: letterId }, updateRequest);
            const updatedLetter = await this.authorityLetterRepo.findOne({
                where: { id: letterId },
            });
            return Response.success(updatedLetter);
        } catch (ex) {
            console.log(Messages.Exception, ex);
            return Response.failure(Messages.Exception);
        }
    }

    async updateAuthorityLetterStatus(
        letterId: number,
        authenticatedUser: User,
        requestDto: UpdateStatusDto,
    ): Promise<ApiResponse> {
        try {
            if (
                authenticatedUser.role != UserRole.ADMIN &&
                authenticatedUser.role != UserRole.SUPERADMIN &&
                authenticatedUser.role != UserRole.MANAGER
            )
                return Response.failure(Messages.NoPermission);

            const letter = await this.authorityLetterRepo.findOne({
                where: { id: letterId },
            });
            if (!letter) return Response.failure('Authority letter not found');

            if (requestDto.status == StateStatus.APPROVED) {
                letter.status = StateStatus.APPROVED;
            } else if (requestDto.status == StateStatus.CANCELED) {
                letter.status = StateStatus.CANCELED;
            } else {
                return Response.failure(Messages.InvalidStatus);
            }

            if (letter.investmentId) {
                const investment = await this.investmentRepo.findOne({
                    where: { id: letter.investmentId },
                });
                if (investment) {
                    if (requestDto.status == StateStatus.APPROVED) {
                        investment.authorityLetterStatus = StateStatus.APPROVED;
                    } else if (requestDto.status == StateStatus.CANCELED) {
                        investment.authorityLetterStatus = StateStatus.CANCELED;
                    }
                    await this.investmentRepo.save(investment);
                }
            }

            const savedLetter = await this.authorityLetterRepo.save(letter);
            return Response.success(savedLetter);
        } catch (ex) {
            console.log(Messages.Exception, ex);
            return Response.failure(Messages.Exception);
        }
    }

    async deleteAuthorityLetter(
        letterId: number,
        authenticatedUser: User,
    ): Promise<ApiResponse> {
        try {
            if (
                authenticatedUser.role != UserRole.ADMIN &&
                authenticatedUser.role != UserRole.SUPERADMIN &&
                authenticatedUser.role != UserRole.MANAGER
            )
                return Response.failure(Messages.NoPermission);

            const letter = await this.authorityLetterRepo.findOne({ where: { id: letterId } });
            if (!letter) return Response.failure('Authority letter not found');

            if (letter.investmentId) {
                const investment = await this.investmentRepo.findOne({ where: { id: letter.investmentId } });
                if (investment) {
                    investment.authorityLetterId = null;
                    investment.authorityLetterStatus = StateStatus.PENDING;
                    await this.investmentRepo.save(investment);
                }
            }

            await this.authorityLetterRepo.delete(letterId);

            return Response.success(Messages.DeletedSuccessfully);
        } catch (ex) {
            console.log(Messages.Exception, ex);
            return Response.failure(Messages.Exception);
        }
    }

    async getAuthorityLetterById(
        letterId: number,
        authenticatedUser: User,
    ): Promise<ApiResponse> {
        try {
            const letter = await this.authorityLetterRepo.findOne({
                where: { id: letterId },
                relations: {
                    investment: true,
                    sale: { house: true, plot: true },
                    house: true,
                    plot: true
                },
            });
            if (letter) return Response.success(letter);

            return Response.failure('Authority letter not found');
        } catch (ex) {
            console.log(Messages.Exception, ex);
            return Response.failure(Messages.Exception);
        }
    }

    async findAllAuthorityLetters(
        authenticatedUser: User,
        page: number,
        limit: number,
        filter: FilterDto,
    ): Promise<ApiResponse> {
        try {
            const size =
                limit > 0
                    ? Number(limit)
                    : Number(process.env.APP_PAGINATION_SIZE) || 15;
            const skip = page > 0 ? Number(page) : 0;

            const query = {} as any;

            if (filter.status) query.status = filter.status;

            const [result, count] = await this.authorityLetterRepo.findAndCount({
                where: query,
                order: { createdAt: 'DESC' },
                relations: {
                    investment: { client: true },
                    sale: { house: true, plot: true },
                    house: true,
                    plot: true
                },
                take: size,
                skip: skip * size,
            });

            if (result.length) {
                const totalPages = Math.round(count / size);
                return Response.success({
                    page: result,
                    size: size,
                    currentPage: Number(skip),
                    totalPages:
                        totalPages > 0
                            ? totalPages
                            : count > 0 && result.length > 0
                                ? 1
                                : 0,
                });
            }
            return Response.failure('No authority letters found');
        } catch (ex) {
            console.log(Messages.Exception, ex);
            return Response.failure(Messages.Exception);
        }
    }

    async searchAuthorityLetters(
        authenticatedUser: User,
        page: number,
        limit: number,
        searchString: string,
        filter: FilterDto,
    ): Promise<ApiResponse> {
        try {
            const size =
                limit > 0
                    ? Number(limit)
                    : Number(process.env.APP_PAGINATION_SIZE) || 15;
            const skip = page > 0 ? Number(page) : 0;

            var query = [] as any;

            query = [
                { letterNumber: Like(`%${searchString}%`) },
                { status: Like(`%${searchString}%`) },
            ];

            if (filter.status) {
                query = [
                    {
                        letterNumber: Like(`%${searchString}%`),
                        status: filter.status,
                    },
                ];
            }

            const [result, count] = await this.authorityLetterRepo.findAndCount({
                where: query,
                order: { createdAt: 'DESC' },
                relations: { investment: { client: true } },
                take: size,
                skip: skip * size,
            });

            if (result.length) {
                const totalPages = Math.round(count / size);
                return Response.success({
                    page: result,
                    size: size,
                    currentPage: Number(skip),
                    totalPages:
                        totalPages > 0
                            ? totalPages
                            : count > 0 && result.length > 0
                                ? 1
                                : 0,
                });
            }
            return Response.failure('No authority letters found');
        } catch (ex) {
            console.log(Messages.Exception, ex);
            return Response.failure(Messages.Exception);
        }
    }
}
