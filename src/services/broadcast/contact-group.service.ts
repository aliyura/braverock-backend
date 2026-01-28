import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { FilterDto } from 'src/dtos/filter.dto';
import {
  ContactGroupDto,
  ContactToGroupDto,
  UpdateContactGroupDto,
} from 'src/dtos/broadcast/contact-group.dto';
import { ContactGroup } from 'src/schemas/broadcast/contact-group.schema';
import { Contact } from 'src/schemas/broadcast/contact.schema';

@Injectable()
export class ContactGroupService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(ContactGroup)
    private contactGroupRepo: Repository<ContactGroup>,
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
  ) {}

  async addContactGroup(
    authenticatedUser: User,
    requestDto: ContactGroupDto,
  ): Promise<ApiResponse> {
    try {
      const query: any = {};

      const groupExist = await this.contactGroupRepo.existsBy({
        name: requestDto.name,
      });
      if (groupExist)
        return Response.failure(Messages.ContactGroupAlreadyExist);

      const contact: Partial<ContactGroup> = {
        ...requestDto,
        createdById: authenticatedUser.id,
      } as ContactGroup;

      const created = await this.contactGroupRepo.save(contact);
      if (created) return Response.success(created);
      return Response.failure(Messages.Exception);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
  async updateContactGroup(
    contactGroupId: number,
    authenticatedUser: User,
    requestDto: UpdateContactGroupDto,
  ): Promise<ApiResponse> {
    try {
      const contactGroup = await this.contactGroupRepo.findOne({
        where: { id: contactGroupId },
      });
      if (!contactGroup)
        return Response.failure(
          Messages.ContactGroupNotAvailable || 'Contact group not available',
        );

      const updateRequest = {
        ...contactGroup,
        ...requestDto,
      } as ContactGroup;

      await this.contactGroupRepo.update({ id: contactGroupId }, updateRequest);
      const updated = await this.contactGroupRepo.findOne({
        where: { id: contactGroupId },
      });
      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async linkContactWithGroup(
    authenticatedUser: User,
    requestDto: ContactToGroupDto,
  ): Promise<ApiResponse> {
    try {
      const contactGroupExist = await this.contactGroupRepo.existsBy({
        id: requestDto.groupId,
      });
      if (!contactGroupExist)
        return Response.failure(
          Messages.ContactGroupNotAvailable || 'Contact group not available',
        );

      const contactExist = await this.contactRepo.existsBy({
        id: requestDto.contactId,
      });
      if (!contactExist)
        return Response.failure(
          Messages.ContactNotAvailable || 'Contact not available',
        );

      await this.contactRepo.update(
        { id: requestDto.contactId },
        { groupId: requestDto.groupId },
      );
      const updated = await this.contactRepo.findOne({
        where: { id: requestDto.contactId },
      });
      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteContactGroup(
    contactGroupId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      await this.contactGroupRepo.delete(contactGroupId);
      await this.contactRepo.delete({ groupId: contactGroupId });

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getContactGroupById(contactGroupId: number): Promise<ApiResponse> {
    try {
      const contact = await this.contactGroupRepo.findOne({
        where: { id: contactGroupId },
        relations: { createdBy: true },
      });
      if (contact) return Response.success(contact);
      return Response.failure(
        Messages.ContactGroupNotAvailable || 'ContactGroup not available',
      );
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getContactGroups(
    authenticatedUser: User,
    page: number,
    limit: number,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const query = Helpers.buildFilteredQuery(filterDto);

      const [result, count] = await this.contactGroupRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (result.length) {
        const totalPages = Math.round(count / size);

        const analytic = {
          totalGroups: await this.contactGroupRepo.count(),
          totalMembers: await this.contactRepo.count(),
          activeGroups: await this.contactRepo.count(),
          avgGroupSize: 100000,
        };
        return Response.success({
          analytic,
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
      return Response.failure(
        Messages.NoContactGroupsFound || 'No contact group found',
      );
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchContactGroups(
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

      const targetFields = ['name', 'description'];
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.contactGroupRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
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
      return Response.failure(
        Messages.NoContactGroupsFound || 'No contact group found',
      );
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
