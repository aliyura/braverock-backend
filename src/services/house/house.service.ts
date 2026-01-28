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
  LocationType,
  PropertyVisibility,
  StateStatus,
  UserRole,
} from 'src/enums';
import { FilterDto } from 'src/dtos/filter.dto';
import { HouseDto, UpdateHouseDto } from 'src/dtos/property/house.dto';
import { Estate } from 'src/schemas/property/estate.schema';
import { validate } from 'class-validator';
import * as ExcelJS from 'exceljs';
import { House } from 'src/schemas/property/house.schema';

@Injectable()
export class HouseService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(House) private houseRepo: Repository<House>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
  ) {}

  async addHouse(
    authenticatedUser: User,
    requestDto: HouseDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      let estate: Estate | null = null;
      if (requestDto.estateId) {
        estate = await this.estateRepo.findOne({
          where: { id: requestDto.estateId },
        });
        if (!estate) return Response.failure(Messages.EstateNotAvailable);

        estate.availableHouses += 1;
        estate.totalHouses += 1;

        await this.estateRepo.save(estate);
      }

      const query = {
        houseNumber: requestDto.houseNumber,
      } as any;
      if (requestDto.blockNumber) query.blockNumber = requestDto.blockNumber;
      if (requestDto.estateId) query.estateId = requestDto.estateId;

      const houseExists = await this.houseRepo.existsBy(query);
      if (houseExists) return Response.failure(Messages.HouseAlreadyExist);

      const request: House = {
        ...requestDto,
        status: StateStatus.AVAILABLE,
        createdById: authenticatedUser.id,
        acquisitionType: requestDto.acquisitionType || estate?.acquisitionType,
        locationType: LocationType.ESTATE,
      } as unknown as House;

      if (!requestDto.thumbnail) request.thumbnail = estate.thumbnail;
      if (!requestDto.design) request.design = estate.design;
      if (!requestDto.coordinates) request.coordinates = estate.coordinates;

      const created = await this.houseRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add house');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async bulkUploadHouses(
    fileBuffer: Buffer,
    estateId: number,
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
        if (!col) return ''; // column not found in header map

        const cell = row.getCell(col);
        const val = cell?.value;

        if (val == null) return ''; // handles null or undefined

        if (typeof val === 'object') {
          if ('text' in val) return val.text;
          if ('richText' in val)
            return val.richText.map((r) => r.text).join('');
          if ('formula' in val) return val.result;
          return '';
        }

        return val;
      };

      const housesToCreate: Partial<House>[] = [];
      const errors: any[] = [];

      let estate;
      if (estateId) {
        estate = await this.estateRepo.findOne({
          where: { id: estateId },
        });
      }

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row || row.number === 1) continue;

        const requestDto = new HouseDto();
        requestDto.description = String(get(row, 'description') || '').trim();
        requestDto.features = String(get(row, 'features') || '').trim();
        requestDto.type = String(get(row, 'type') || '').trim();
        requestDto.buildingType = String(get(row, 'buildingType') || '').trim();
        requestDto.bedRooms = Number(get(row, 'bedRooms') || 0);
        requestDto.livingRoom = Number(get(row, 'livingRoom') || 0);
        requestDto.kitchen = Number(get(row, 'kitchen') || 0);
        requestDto.dianning = Number(get(row, 'dianning') || 0);
        requestDto.toilets = Number(get(row, 'toilets') || 0);
        requestDto.capacity = String(get(row, 'capacity') || '').trim();
        requestDto.price = Number(get(row, 'price') || '');
        requestDto.state = String(get(row, 'state') || '').trim();
        requestDto.lga = String(get(row, 'lga') || '').trim();
        requestDto.district = String(get(row, 'district') || '').trim();
        requestDto.houseNumber = String(get(row, 'houseNumber') || '').trim();
        requestDto.blockNumber = String(get(row, 'blockNumber') || '').trim();
        requestDto.sizeSqm = Number(get(row, 'sizeSqm') || 0);
        requestDto.acquisitionType = String(
          get(row, 'acquisitionType') || '',
        ).trim();
        requestDto.acquisitionCost = Number(get(row, 'acquisitionCost') || 0);

        if (estate) {
          requestDto.estateId = estate.id;
          requestDto.state = estate.state;
          requestDto.lga = estate.lga;
          requestDto.district = estate.district;

          const query = {
            houseNumber: requestDto.houseNumber,
          } as any;
          if (requestDto.blockNumber)
            query.blockNumber = requestDto.blockNumber;
          if (requestDto.estateId) query.estateId = requestDto.estateId;

          const existHouse = await this.houseRepo.existsBy(query);
          if (existHouse) {
            errors.push({
              row: i,
              data: requestDto,
              errors: Messages.HouseAlreadyExist,
            });
            continue;
          }
        } else {
          requestDto.state = String(get(row, 'state') || '').trim();
          requestDto.lga = String(get(row, 'lga') || '').trim();
          requestDto.district = String(get(row, 'district') || '').trim();

          const query = {
            houseNumber: requestDto.houseNumber,
          } as any;
          if (requestDto.blockNumber)
            query.blockNumber = requestDto.blockNumber;
          if (requestDto.estateId) query.estateId = requestDto.estateId;

          const existPlot = await this.houseRepo.existsBy(query);
          if (existPlot) {
            errors.push({
              row: i,
              data: requestDto,
              errors: Messages.HouseAlreadyExist,
            });
            continue;
          }
        }

        const request: Partial<House> = {
          ...requestDto,
          locationType: LocationType.ESTATE,
          createdById: authenticatedUser.id,
        };

        //enrich request

        if (estate) {
          if (!requestDto.acquisitionType)
            request.acquisitionType = estate.acquisitionType;
          if (!requestDto.coordinates) request.coordinates = estate.coordinates;

          request.locationType = LocationType.ESTATE;
          estate.availablePlots = estate.availablePlots + 1;
          estate.totalPlots = estate.totalPlots + 1;

          if (!requestDto.thumbnail) request.thumbnail = estate.thumbnail;
          if (!requestDto.design) request.design = estate.design;
          if (!requestDto.coordinates) request.coordinates = estate.coordinates;

          await this.estateRepo.save(estate);
        }

        const validationErrors = await validate(requestDto);
        if (validationErrors.length > 0) {
          errors.push({
            row: i,
            errors: validationErrors
              .map((e) => Object.values(e.constraints || {}))
              .flat(),
          });
          continue;
        }

        const house: Partial<House> = {
          ...requestDto,
          locationType: LocationType.ESTATE,
          createdById: authenticatedUser.id,
        };

        housesToCreate.push(house);
      }

      const created = await this.houseRepo.save(housesToCreate);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing file');
    }
  }

  async updateHouse(
    houseId: number,
    authenticatedUser: User,
    requestDto: UpdateHouseDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      const house = await this.houseRepo.findOne({
        where: { id: houseId },
      });
      if (!house) return Response.failure(Messages.HouseNotAvailable);

      const updateRequest = {
        ...house,
        ...requestDto,
      } as House;

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

      await this.houseRepo.update({ id: houseId }, updateRequest);
      const updatedUser = await this.houseRepo.findOne({
        where: { id: houseId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteHouse(
    houseId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      await this.houseRepo.delete(houseId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getHouseById(houseId: number): Promise<ApiResponse> {
    try {
      const house = await this.houseRepo.findOne({
        where: { id: houseId },
        relations: { estate: true, createdBy: true },
      });
      if (house) return Response.success(house);

      return Response.failure(Messages.HouseNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllHouses(
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

      const [result, count] = await this.houseRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        relations: {
          estate: true,
          client: true,
          sale: true,
          createdBy: true,
          reservedBy: true,
          reservation: true,
        },
        skip: skip * size,
      });

      if (result.length) {
        const analytic = {
          houses: await this.houseRepo.count({}),
          available: await this.houseRepo.count({
            where: { status: StateStatus.AVAILABLE },
          }),
          reserved: await this.houseRepo.count({
            where: { status: StateStatus.RESERVED },
          }),
          sold: await this.houseRepo.count({
            where: { status: StateStatus.SOLD },
          }),
          allocated: await this.houseRepo.count({
            where: { status: StateStatus.ALLOCATED },
          }),
        };
        const totalPages = Math.round(count / size);

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
      return Response.failure(Messages.NoHousesFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
  async searchHouses(
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
        'type',
        'state',
        'lga',
        'district',
        'locationType',
        'description',
        'houseNumber',
        'blockNumber',
        'buildingType',
        'acquisitionType',
        'features',
      ];

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.houseRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          estate: true,
          client: true,
          sale: true,
          createdBy: true,
          reservedBy: true,
          reservation: true,
        },
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
      return Response.failure(Messages.NoHousesFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllPublicHouses(
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

      const requiredFilter = {
        visibility: PropertyVisibility.PUBLIC,
        status: StateStatus.AVAILABLE,
      };
      const query = Helpers.buildFilteredQuery(filterDto, requiredFilter);

      const [result, count] = await this.houseRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          estate: true,
          client: true,
          sale: true,
          createdBy: true,
          reservedBy: true,
          reservation: true,
        },
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
      return Response.failure(Messages.NoHousesFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchPublicHouses(
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
        'capacity',
        'dimension',
        'type',
        'state',
        'lga',
        'district',
        'locationType',
        'description',
        'houseNumber',
        'blockNumber',
        'buildingType',
        'acquisitionType',
        'features',
      ];

      const requiredFilter = {
        visibility: PropertyVisibility.PUBLIC,
        status: StateStatus.AVAILABLE,
      };
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
        requiredFilter,
      );

      const [result, count] = await this.houseRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          createdBy: true,
          client: true,
          sale: true,
          estate: true,
          reservation: true,
        },
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
      return Response.failure(Messages.NoHousesFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
