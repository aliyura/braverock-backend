import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { Contact } from 'src/schemas/broadcast/contact.schema';
import { ContactDto, UpdateContactDto } from 'src/dtos/broadcast/contact.dto';
import { validate } from 'class-validator';
import * as ExcelJS from 'exceljs';
import { FilterDto } from 'src/dtos/filter.dto';
import { StateStatus } from 'src/enums';
import { startOfMonth, startOfYear } from 'date-fns';
import { ContactGroup } from 'src/schemas/broadcast/contact-group.schema';

@Injectable()
export class ContactService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectRepository(ContactGroup)
    private contactGroupRepo: Repository<ContactGroup>,
  ) {}

  async addContact(
    authenticatedUser: User,
    requestDto: ContactDto,
  ): Promise<ApiResponse> {
    try {
      const query: any = {};
      let contactGroup: ContactGroup = null;

      if (requestDto.emailAddress) query.emailAddress = requestDto.emailAddress;
      if (requestDto.phoneNumber) query.phoneNumber = requestDto.phoneNumber;
      if (requestDto.groupId) query.groupId = requestDto.groupId;

      if (Object.keys(query).length) {
        const exists = await this.contactRepo.findOne({ where: query });
        if (exists)
          return Response.failure(
            Messages.ContactAlreadyExists || 'Contact already exists',
          );
      }

      if (requestDto.groupId) {
        contactGroup = await this.contactGroupRepo.findOne({
          where: { id: requestDto.groupId },
        });
        if (!contactGroup)
          return Response.failure(Messages.ContactGroupNotAvailable);

        contactGroup.contacts += 1;
      }

      const contact: Partial<Contact> = {
        ...requestDto,
        createdById: authenticatedUser.id,
      } as Partial<Contact>;

      const createdContact = await this.contactRepo.save(contact);
      if (createdContact) {
        //add recent contacts
        if (contactGroup) {
          const recentContacts =
            contactGroup.recentContacts || ([] as Contact[]);
          recentContacts.push(createdContact);
          if (recentContacts.length > 5) {
            recentContacts.splice(0, recentContacts.length - 5);
          }
          contactGroup.recentContacts = recentContacts;
          await this.contactGroupRepo.save(contactGroup);
        }
        return Response.success(createdContact);
      }
      return Response.failure(Messages.Exception);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async bulkUploadContacts(
    fileBuffer: Buffer,
    contactGoupId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];

      const headerRow = worksheet.getRow(1);
      const headerMap: Record<string, number> = {};

      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          const header = String(cell.value).trim().toLowerCase();
          headerMap[header] = colNumber;
        }
      });

      const get = (row: ExcelJS.Row, field: string) => {
        const col = headerMap[field.toLowerCase()];
        if (!col) return '';
        const cell = row.getCell(col);
        const val = cell?.value;
        if (val == null) return '';
        if (typeof val === 'object') {
          if ('text' in val) return val.text;
          if ('richText' in val)
            return val.richText.map((r) => r.text).join('');
          if ('formula' in val) return val.result;
          return '';
        }
        return val;
      };

      const contactsToCreate: Partial<Contact>[] = [];
      const errors: any[] = [];
      let contactGroup: ContactGroup = null;

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row || row.number === 1) continue;

        const dto = new ContactDto();
        dto.name = String(get(row, 'name') || '').trim();
        dto.emailAddress =
          String(get(row, 'emailAddress') || get(row, 'email') || '').trim() ||
          undefined;
        dto.phoneNumber =
          String(get(row, 'phoneNumber') || get(row, 'phone') || '').trim() ||
          undefined;
        dto.whatsappNumber =
          String(
            get(row, 'whatsappNumber') || get(row, 'whatsapp') || '',
          ).trim() || undefined;
        dto.whatsappId = String(get(row, 'whatsappId') || '').trim() || null;
        dto.groupId = Number(get(row, 'groupId') || null) || null;

        //set selected group id if any
        if (!dto.groupId && contactGoupId) dto.groupId = contactGoupId;

        // If the whole row is empty skip
        const allEmpty =
          !dto.name &&
          !dto.emailAddress &&
          !dto.phoneNumber &&
          !dto.whatsappNumber &&
          !dto.whatsappId &&
          !dto.groupId;
        if (allEmpty) continue;

        // validate DTO
        const validationErrors = await validate(dto);
        if (validationErrors.length > 0) {
          errors.push({
            row: i,
            errors: validationErrors
              .map((e) => Object.values(e.constraints || {}))
              .flat(),
          });
          continue;
        }

        // Check for duplicates (email or phone)
        const duplicateQuery: any = {};
        if (dto.emailAddress) duplicateQuery.emailAddress = dto.emailAddress;
        if (dto.phoneNumber) duplicateQuery.phoneNumber = dto.phoneNumber;
        if (dto.groupId) duplicateQuery.groupId = dto.groupId;

        let duplicateFound = false;
        if (Object.keys(duplicateQuery).length) {
          const found = await this.contactRepo.findOne({
            where: duplicateQuery,
          });
          if (found) {
            errors.push({
              row: i,
              data: dto,
              errors: Messages.ContactAlreadyExists || 'Contact already exists',
            });
            duplicateFound = true;
          }
        }
        if (duplicateFound) continue;

        if (dto.groupId) {
          contactGroup = await this.contactGroupRepo.findOne({
            where: { id: dto.groupId },
          });
          if (!contactGroup)
            errors.push({
              row: i,
              data: dto,
              errors: Messages.ContactGroupNotAvailable,
            });

          contactGroup.contacts += 1;
          await this.contactGroupRepo.save(contactGroup);
        }

        const contact: Partial<Contact> = {
          ...dto,
          createdById: authenticatedUser.id,
        };
        contactsToCreate.push(contact);
      }

      const createdContacts = contactsToCreate.length
        ? await this.contactRepo.save(contactsToCreate)
        : [];

      //add recent contacts
      if (createdContacts.length > 0 && contactGroup) {
        const recentContacts = contactGroup.recentContacts || ([] as Contact[]);

        if (createdContacts.length > 5) {
          contactGroup.recentContacts = createdContacts.slice(-5);
        } else {
          const combined = [...recentContacts, ...createdContacts];
          contactGroup.recentContacts = combined.slice(-5);
        }
        await this.contactGroupRepo.save(contactGroup);
      }

      return Response.success({
        createdCount: createdContacts.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing file');
    }
  }

  async updateContact(
    contactId: number,
    authenticatedUser: User,
    requestDto: UpdateContactDto,
  ): Promise<ApiResponse> {
    try {
      const contact = await this.contactRepo.findOne({
        where: { id: contactId },
      });
      if (!contact)
        return Response.failure(
          Messages.ContactNotAvailable || 'Contact not available',
        );

      if (
        requestDto.emailAddress &&
        requestDto.emailAddress !== contact.emailAddress
      ) {
        const exists = await this.contactRepo.findOne({
          where: { emailAddress: requestDto.emailAddress },
        });
        if (exists)
          return Response.failure(
            Messages.ContactAlreadyExists ||
              'Email already used by another contact',
          );
      }

      if (
        requestDto.phoneNumber &&
        requestDto.phoneNumber !== contact.phoneNumber
      ) {
        const exists = await this.contactRepo.findOne({
          where: { phoneNumber: requestDto.phoneNumber },
        });
        if (exists)
          return Response.failure(
            Messages.ContactAlreadyExists ||
              'Phone number already used by another contact',
          );
      }

      const updateRequest = {
        ...contact,
        ...requestDto,
      } as Contact;

      await this.contactRepo.update({ id: contactId }, updateRequest);
      const updated = await this.contactRepo.findOne({
        where: { id: contactId },
      });

      if (updated?.groupId) {
        const group = await this.contactGroupRepo.findOne({
          where: { id: updated.groupId },
        });

        if (group?.recentContacts && group.recentContacts.length > 0) {
          const index = group.recentContacts.findIndex(
            (rc) => rc.id === contactId,
          );
          if (index !== -1) {
            group.recentContacts[index] = updated;
            await this.contactGroupRepo.save(group);
          }
        }
      }

      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteContact(
    contactId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const contact = await this.contactRepo.findOne({
        where: { id: contactId },
      });

      if (contact) {
        await this.contactRepo.delete(contactId);

        //remove from recent contacts if exist
        if (contact.groupId) {
          const group = await this.contactGroupRepo.findOne({
            where: { id: contact.groupId },
          });

          if (group) {
            const newCount = group.contacts > 0 ? group.contacts - 1 : 0;
            let updatedRecentContacts = group.recentContacts || [];
            updatedRecentContacts = updatedRecentContacts.filter(
              (rc) => rc.id !== contactId,
            );

            await this.contactGroupRepo.save({
              ...group,
              contacts: newCount,
              recentContacts: updatedRecentContacts,
            });
          }
        }
      }
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getContactById(contactId: number): Promise<ApiResponse> {
    try {
      const contact = await this.contactRepo.findOne({
        where: { id: contactId },
        relations: { createdBy: true, group: true },
      });
      if (contact) return Response.success(contact);
      return Response.failure(
        Messages.ContactNotAvailable || 'Contact not available',
      );
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getContacts(
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

      const [result, count] = await this.contactRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true, group: true },
      });

      if (result.length) {
        const now = new Date();
        const startMonth = startOfMonth(now);
        const startYear = startOfYear(now);

        const totalPages = Math.round(count / size);
        const analytic = {
          contacts: await this.contactRepo.count({}),
          activeContacts: await this.contactRepo.count({
            where: { status: StateStatus.ACTIVE },
          }),
          thisMonth: await this.contactRepo.count({
            where: {
              createdAt: MoreThanOrEqual(startMonth),
            },
          }),
          thisYear: await this.contactRepo.count({
            where: {
              createdAt: MoreThanOrEqual(startYear),
            },
          }),
          subscribed: 0,
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
      return Response.failure(Messages.NoContactsFound || 'No contacts found');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchContacts(
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

      const targetFields = [
        'name',
        'emailAddress',
        'phoneNumber',
        'whatsappNumber',
        'whatsappId',
      ];
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.contactRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true, group: true },
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
      return Response.failure(Messages.NoContactsFound || 'No contacts found');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
