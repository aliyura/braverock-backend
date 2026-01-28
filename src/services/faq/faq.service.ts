import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { In, Like, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { ActionType, StateStatus, UserRole } from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { FaqDto, UpdateFaqDto } from 'src/dtos/company/faq.dto';
import { Faq } from 'src/schemas/company/faq.schema';

@Injectable()
export class FaqService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Faq) private faqRepo: Repository<Faq>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) { }

  async addFaq(
    authenticatedUser: User,
    requestDto: FaqDto,
  ): Promise<ApiResponse> {
    try {
      if (authenticatedUser.role != UserRole.ADMIN
        && authenticatedUser.role != UserRole.SUPERADMIN
        && authenticatedUser.role != UserRole.MANAGER
        && authenticatedUser.role != UserRole.CUSTOMERCARE)
        return Response.failure(Messages.NoPermission);

      const request = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id
      } as unknown as Faq;

      const created = await this.faqRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add faq');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateFaq(
    faqId: number,
    authenticatedUser: User,
    requestDto: UpdateFaqDto,
  ): Promise<ApiResponse> {
    try {
      if (authenticatedUser.role != UserRole.ADMIN 
        && authenticatedUser.role != UserRole.SUPERADMIN 
        && authenticatedUser.role != UserRole.MANAGER
        && authenticatedUser.role != UserRole.CUSTOMERCARE)
        return Response.failure(Messages.NoPermission);

      const faq = await this.faqRepo.findOne({
        where: { id: faqId },
      });
      if (!faq) return Response.failure(Messages.FaqNotAvailable);

      const updateRequest = {
        ...faq,
        ...requestDto,
      } as Faq;

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

      await this.faqRepo.update({ id: faqId }, updateRequest);
      const updatedUser = await this.faqRepo.findOne({
        where: { id: faqId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }


  async deleteFaq(
    faqId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (authenticatedUser.role != UserRole.ADMIN
         && authenticatedUser.role != UserRole.SUPERADMIN
         && authenticatedUser.role != UserRole.MANAGER
        && authenticatedUser.role != UserRole.CUSTOMERCARE)
        return Response.failure(Messages.NoPermission);

      await this.faqRepo.delete(faqId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllFaqs(
    authenticatedUser: User,
    page: number,
    limit: number,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : Number(process.env.APP_PAGINATION_SIZE) || 15; const skip = page > 0 ? Number(page) : 0;

      const query = {} as any;

      if (authenticatedUser.role != UserRole.ADMIN && authenticatedUser.role != UserRole.SUPERADMIN && authenticatedUser.role != UserRole.MANAGER)
        query.status = StateStatus.ACTIVE;

      const [result, count] = await this.faqRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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
      return Response.failure(Messages.NoFaqFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }


  async findAllPublicFaqs(
    page: number,
    limit: number,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : Number(process.env.APP_PAGINATION_SIZE) || 15; const skip = page > 0 ? Number(page) : 0;

      const query = { status: StateStatus.ACTIVE } as any;
      const [result, count] = await this.faqRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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
      return Response.failure(Messages.NoFaqFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchFaqs(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : Number(process.env.APP_PAGINATION_SIZE) || 15; const skip = page > 0 ? Number(page) : 0;

      const query = [] as any;

      if (authenticatedUser.role != UserRole.ADMIN && authenticatedUser.role != UserRole.SUPERADMIN && authenticatedUser.role != UserRole.MANAGER) {

        if (searchString) {
          query.push({ title: Like(`%${searchString}%`), status: StateStatus.ACTIVE });
          query.push({ description: Like(`%${searchString}%`), status: StateStatus.ACTIVE });
        }
      } else {
        if (searchString) {
          query.push({ title: Like(`%${searchString}%`) });
          query.push({ description: Like(`%${searchString}%`) });
        }
      }

      const [result, count] = await this.faqRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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
      return Response.failure(Messages.NoFaqFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchPublicFaqs(
    page: number,
    limit: number,
    searchString: string,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : Number(process.env.APP_PAGINATION_SIZE) || 15; const skip = page > 0 ? Number(page) : 0;

      const query = [] as any;

      if (searchString) {
        query.push({ title: Like(`%${searchString}%`), status: StateStatus.ACTIVE });
        query.push({ description: Like(`%${searchString}%`), status: StateStatus.ACTIVE });
      }

      const [result, count] = await this.faqRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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
      return Response.failure(Messages.NoFaqFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
