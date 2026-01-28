import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
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
import { ProducerService } from 'src/queue/producer.service';
import { PlotDto, UpdatePlotDto } from 'src/dtos/property/plot.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import * as ExcelJS from 'exceljs';
import { validate } from 'class-validator';
import { UpdateStatusDto } from 'src/dtos/master';
import { Estate } from 'src/schemas/property/estate.schema';
import { BulkUploadPropDto } from 'src/dtos/bulk-upload.dto';
import { Layout } from 'src/schemas/property/layout.schema';
import { Plot } from 'src/schemas/property/plot.schema';
import { Repository } from 'typeorm';

@Injectable()
export class PlotService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Plot) private plotRepo: Repository<Plot>,
    @InjectRepository(Layout) private layoutRepo: Repository<Layout>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    private readonly queueProducerService: ProducerService,
  ) {}

  private async getLocationByType(
    type: LocationType,
    id: number,
  ): Promise<Layout | Estate | null> {
    if (type === LocationType.ESTATE) {
      return this.estateRepo.findOne({
        where: { id },
      });
    }
    if (type === LocationType.LAYOUT) {
      return this.layoutRepo.findOne({
        where: { id },
      });
    }
    return null;
  }

  async addPlot(
    authenticatedUser: User,
    requestDto: PlotDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      let layout, estate;
      if (requestDto.layoutId) {
        layout = await this.layoutRepo.findOne({
          where: {
            id: requestDto.layoutId,
          },
        });
      }
      if (requestDto.estateId) {
        estate = await this.estateRepo.findOne({
          where: {
            id: requestDto.estateId,
          },
        });
      }

      const query = {
        plotNumber: requestDto.plotNumber,
      } as any;
      if (requestDto.blockNumber) query.blockNumber = requestDto.blockNumber;
      if (requestDto.layoutId) query.layoutId = requestDto.layoutId;
      if (requestDto.estateId) query.estateId = requestDto.estateId;

      const existPlot = await this.plotRepo.findOne({
        where: query,
      });
      if (existPlot) return Response.failure(Messages.PlotAlreadyExist);

      const request = {
        ...requestDto,
        createdById: authenticatedUser.id,
      } as unknown as Plot;

      //enrich request
      if (layout) {
        if (!requestDto.acquisitionType)
          request.acquisitionType = layout.acquisitionType;
        if (!requestDto.coordinates) request.coordinates = layout.coordinates;

        request.locationType = LocationType.LAYOUT;
        layout.availablePlots = layout.availablePlots + 1;
        layout.totalPlots = layout.totalPlots + 1;

        if (!requestDto.thumbnail) request.thumbnail = layout.thumbnail;
        if (!requestDto.coordinates) request.coordinates = layout.coordinates;

        await this.layoutRepo.save(layout);
      } else if (estate) {
        if (!requestDto.acquisitionType)
          request.acquisitionType = estate.acquisitionType;
        if (!requestDto.coordinates) request.coordinates = estate.coordinates;

        request.locationType = LocationType.ESTATE;
        estate.availablePlots = estate.availablePlots + 1;
        estate.totalPlots = estate.totalPlots + 1;

        if (!requestDto.thumbnail) request.thumbnail = estate.thumbnail;
        if (!requestDto.coordinates) request.coordinates = estate.coordinates;

        await this.estateRepo.save(estate);
      } else {
        request.locationType = LocationType.STANDALONE;
      }

      const created = await this.plotRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add plot');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async bulkUploadPlots(
    fileBuffer: Buffer,
    uploadProps: BulkUploadPropDto,
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

      const plotsToCreate: Plot[] = [];
      const errors: any[] = [];

      let layout, estate;
      const location = await this.getLocationByType(
        uploadProps.locationType,
        uploadProps.locationId,
      );
      if (location) {
        if (uploadProps.locationType == LocationType.ESTATE) estate = location;
        if (uploadProps.locationType == LocationType.LAYOUT) layout = location;
      }

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row || row.number === 1) continue;

        const requestDto = new PlotDto();
        requestDto.plotNumber = String(get(row, 'plotNumber') || '').trim();
        requestDto.blockNumber = String(get(row, 'blockNumber') || '').trim();
        requestDto.sizeSqm = Number(get(row, 'sizeSqm') || 0);
        requestDto.acquisitionType = String(
          get(row, 'acquisitionType') || '',
        ).trim();
        requestDto.acquisitionCost = Number(get(row, 'acquisitionCost') || 0);
        requestDto.price = Number(get(row, 'price') || 0);
        requestDto.documentationFee = get(row, 'documentationFee')
          ? Number(get(row, 'documentationFee'))
          : 0;
        requestDto.developmentFee = get(row, 'developmentFee')
          ? Number(get(row, 'developmentFee'))
          : 0;

        if (layout) {
          requestDto.layoutId = layout.id;
          requestDto.state = layout.state;
          requestDto.lga = layout.lga;
          requestDto.district = layout.district;

          const query = {
            plotNumber: requestDto.plotNumber,
          } as any;
          if (requestDto.blockNumber)
            query.blockNumber = requestDto.blockNumber;
          if (requestDto.layoutId) query.layoutId = requestDto.layoutId;
          if (requestDto.estateId) query.estateId = requestDto.estateId;

          const existPlot = await this.plotRepo.existsBy(query);
          if (existPlot) {
            errors.push({
              row: i,
              data: requestDto,
              errors: Messages.PlotAlreadyExist,
            });
            continue;
          }
        } else if (estate) {
          requestDto.estateId = estate.id;
          requestDto.state = estate.state;
          requestDto.lga = estate.lga;
          requestDto.district = estate.district;

          const query = {
            plotNumber: requestDto.plotNumber,
          } as any;
          if (requestDto.blockNumber)
            query.blockNumber = requestDto.blockNumber;
          if (requestDto.layoutId) query.layoutId = requestDto.layoutId;
          if (requestDto.estateId) query.estateId = requestDto.estateId;

          const existPlot = await this.plotRepo.existsBy(query);
          if (existPlot) {
            errors.push({
              row: i,
              data: requestDto,
              errors: Messages.PlotAlreadyExist,
            });
            continue;
          }
        } else {
          requestDto.state = String(get(row, 'state') || '').trim();
          requestDto.lga = String(get(row, 'lga') || '').trim();
          requestDto.district = String(get(row, 'district') || '').trim();

          const query = {
            plotNumber: requestDto.plotNumber,
          } as any;
          if (requestDto.blockNumber)
            query.blockNumber = requestDto.blockNumber;
          if (requestDto.layoutId) query.layoutId = requestDto.layoutId;
          if (requestDto.estateId) query.estateId = requestDto.estateId;

          const existPlot = await this.plotRepo.existsBy(query);
          if (existPlot) {
            errors.push({
              row: i,
              data: requestDto,
              errors: Messages.PlotAlreadyExist,
            });
            continue;
          }
        }

        const request: Partial<Plot> = {
          ...requestDto,
          createdById: authenticatedUser.id,
        };

        //enrich request
        if (layout) {
          if (!requestDto.acquisitionType)
            request.acquisitionType = layout.acquisitionType;
          if (!requestDto.coordinates) request.coordinates = layout.coordinates;

          request.locationType = LocationType.LAYOUT;
          layout.availablePlots = layout.availablePlots + 1;
          layout.totalPlots = layout.totalPlots + 1;

          await this.layoutRepo.save(layout);
        }

        if (estate) {
          if (!requestDto.acquisitionType)
            request.acquisitionType = estate.acquisitionType;
          if (!requestDto.coordinates) request.coordinates = layout.coordinates;

          request.locationType = LocationType.ESTATE;
          estate.availablePlots = estate.availablePlots + 1;
          estate.totalPlots = estate.totalPlots + 1;
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

        plotsToCreate.push(request as Plot);
      }

      const created = await this.plotRepo.save(plotsToCreate);

      if (created.length > 0) {
        if (errors.length > 0)
          return Response.fail(Messages.DataNotFullyProcessed, {
            createdCount: created.length,
            failedCount: errors.length,
            failedRows: errors,
          });

        return Response.success({
          createdCount: created.length,
          failedCount: errors.length,
          failedRows: errors,
        });
      } else {
        return Response.fail(Messages.FileProcessingFailed, {
          createdCount: created.length,
          failedCount: errors.length,
          failedRows: errors,
        });
      }
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing file');
    }
  }

  async updatePlot(
    plotId: number,
    authenticatedUser: User,
    requestDto: UpdatePlotDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const plot = await this.plotRepo.findOne({
        where: { id: plotId },
      });
      if (!plot) return Response.failure(Messages.PlotNotAvailable);

      const updateRequest = {
        ...plot,
        ...requestDto,
      } as Plot;

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

      await this.plotRepo.update({ id: plotId }, updateRequest);
      const updatedUser = await this.plotRepo.findOne({
        where: { id: plotId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changePlotStatus(
    authenticatedUser: User,
    plotId: number,
    request: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const plot = await this.plotRepo.findOne({
        where: { id: plotId },
        relations: { createdBy: true },
      });

      plot.status = request.status;

      const updateHistory = {
        ...request,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      if (plot.updateHistory == null) plot.updateHistory = [updateHistory];
      else plot.updateHistory.push(updateHistory);

      await this.plotRepo.save(plot);

      return Response.success(Messages.StatusChanged);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deletePlot(
    plotId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      await this.plotRepo.delete(plotId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getPlotById(plotId: number): Promise<ApiResponse> {
    try {
      const plot = await this.plotRepo.findOne({
        where: { id: plotId },
        relations: { createdBy: true, layout: true },
      });
      if (plot) return Response.success(plot);
      return Response.failure(Messages.PlotNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllPlots(
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

      const [result, count] = await this.plotRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          estate: true,
          layout: true,
          client: true,
          sale: true,
          createdBy: true,
          reservedBy: true,
          reservation: true,
        },
      });

      if (result.length) {
        const analytic = {
          plots: await this.plotRepo.count({}),
          available: await this.plotRepo.count({
            where: { status: StateStatus.AVAILABLE },
          }),
          reserved: await this.plotRepo.count({
            where: { status: StateStatus.RESERVED },
          }),
          sold: await this.plotRepo.count({
            where: { status: StateStatus.SOLD },
          }),
          allocated: await this.plotRepo.count({
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
      return Response.failure(Messages.NoPlotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchPlots(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const targetFields = [
        'state',
        'lga',
        'district',
        'locationType',
        'description',
        'plotNumber',
        'blockNumber',
        'acquisitionType',
        'features',
      ];
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filterDto,
      );

      const [result, count] = await this.plotRepo.findAndCount({
        where: query,
        order: { createdAt: 'ASC' },
        take: size,
        skip: skip * size,
        relations: {
          estate: true,
          layout: true,
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
      return Response.failure(Messages.NoPlotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllPublicPlots(
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

      const [result, count] = await this.plotRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          createdBy: true,
          client: true,
          sale: true,
          layout: true,
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
      return Response.failure(Messages.NoPlotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchPublicPlots(
    page: number,
    limit: number,
    searchString: string,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const targetFields = [
        'state',
        'lga',
        'district',
        'locationType',
        'description',
        'plotNumber',
        'blockNumber',
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
        filterDto,
        requiredFilter,
      );

      const [result, count] = await this.plotRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          createdBy: true,
          client: true,
          sale: true,
          layout: true,
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
      return Response.failure(Messages.NoPlotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
