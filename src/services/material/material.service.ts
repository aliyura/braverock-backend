import { Material } from '../../schemas/inventory/material.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import {
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { ActionType, StateStatus, UserRole } from 'src/enums';
import { MaterialDto, UpdateMaterialDto } from 'src/dtos/material.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { MaterialRequest } from 'src/schemas/inventory/material-request.schema';
import { MaterialSupplyHistory } from 'src/schemas/inventory/material-supply-history.schema';
import { Estate } from 'src/schemas/property/estate.schema';
@Injectable()
export class MaterialService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(MaterialRequest)
    private materialRequestRepo: Repository<MaterialRequest>,
    @InjectRepository(Material) private materialRepo: Repository<Material>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    @InjectRepository(MaterialSupplyHistory)
    private materialSupplyHistoryRepo: Repository<MaterialSupplyHistory>,
  ) {}

  async addMaterial(
    authenticatedUser: User,
    requestDto: MaterialDto,
  ): Promise<ApiResponse> {
    try {
      const query = {
        name: requestDto.name,
      } as any;

      if (requestDto.estateId) {
        query.estateId = requestDto.estateId;
      }
      let material = (await this.materialRepo.findOne({
        where: query,
      })) as Material;

      if (material) {
        const amount = requestDto.unitPrice * requestDto.quantity;
        material.quantity += requestDto.quantity;
        material.quantityLeft += requestDto.quantity;
        material.lastSuppliedDate = new Date();
        material.totalAmount = Number(material.totalAmount) + amount;
      } else {
        if (requestDto.estateId) {
          const estate = await this.estateRepo.findOne({
            where: { id: requestDto.estateId },
          });
          if (!estate) return Response.failure(Messages.EstateNotAvailable);
          if (estate) requestDto.name += ` for ${estate.name}`;
        }

        if (!requestDto.estateId) requestDto.estateId = null;
        if (!requestDto.quantity) requestDto.supplyStatus = StateStatus.ACTIVE;

        material = {
          ...requestDto,
          code: Helpers.getCode(),
          quantity: requestDto.quantity,
          quantityLeft: requestDto.quantity,
          totalAmount: requestDto.unitPrice * requestDto.quantity,
          createdById: authenticatedUser.id,
        } as unknown as Material;
      }

      const savedMaterial = await this.materialRepo.save(material);
      if (savedMaterial) {
        const materialHistory = {
          ...requestDto,
          code: Helpers.getCode(),
          totalAmount: requestDto.unitPrice * requestDto.quantity,
          materialId: savedMaterial.id,
          createdById: authenticatedUser.id,
        } as unknown as MaterialSupplyHistory;

        await this.materialSupplyHistoryRepo.save(materialHistory);
        return Response.success(savedMaterial);
      } else {
        return Response.failure('Unable to add material');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateMaterial(
    materialId: number,
    authenticatedUser: User,
    requestDto: UpdateMaterialDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const material = await this.materialRepo.findOne({
        where: { id: materialId },
      });
      if (!material) return Response.failure(Messages.MaterialNotAvailable);

      if (requestDto.quantity) {
        if (requestDto.quantity != material.quantity) {
          return Response.failure(Messages.CantModifyQuantityOfSupply);
        }
      }

      const updateRequest = {
        ...material,
        ...requestDto,
      } as Material;

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

      await this.materialRepo.update({ id: materialId }, updateRequest);
      const updatedUser = await this.materialRepo.findOne({
        where: { id: materialId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteMaterial(
    materialId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const material = await this.materialRepo.findOne({
        where: { id: materialId },
      });
      if (material) {
        await this.materialRepo.delete(materialId);
        await this.materialSupplyHistoryRepo.delete({
          materialId: materialId,
        });
      } else {
        return Response.failure(Messages.MaterialNotAvailable);
      }

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findMaterialById(materialId: number) {
    const result = await this.materialRepo.findOne({
      where: { id: materialId },
    });
    if (result) return Response.success(result);
    return Response.failure(Messages.MaterialNotAvailable);
  }

  async findMaterialHistory(
    authenticatedUser: User,
    materialId: number,
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
      const query = { materialId } as any;

      if (filterDto.estateId) query.estateId = filterDto.estateId;

      if (filterDto.type) query.type = filterDto.type;

      if (filterDto.status) query.status = filterDto.status;

      if (filterDto.supplyStatus) query.supplyStatus = filterDto.supplyStatus;

      const [result, count] = await this.materialSupplyHistoryRepo.findAndCount(
        {
          where: query,
          order: { createdAt: 'DESC' },
          take: size,
          skip: skip * size,
          relations: { estate: true, createdBy: true },
        },
      );

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
      return Response.failure(Messages.NoMaterialFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getMaterialQuantitySummary(authenticatedUser: User): Promise<ApiResponse> {
    try {
      const result = await this.materialRepo
        .createQueryBuilder('material')
        .select('material.name', 'name')
        .addSelect('SUM(material.quantityLeft)', 'totalQuantityLeft')
        .groupBy('material.name')
        .orderBy('material.name', 'ASC')
        .getRawMany();

      if(result)
        return Response.success(result);
      
      return Response.failure(Messages.NoMaterialFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllMaterials(
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
      const query = {} as any;

      if (filterDto.stock) {
        if (filterDto.stock == 'available')
          query.quantityLeft = MoreThanOrEqual(1);
        if (filterDto.stock == 'unavailable')
          query.quantityLeft = LessThanOrEqual(0);
      }

      if (filterDto.estateId) query.estateId = filterDto.estateId;
      if (filterDto.type) query.type = filterDto.type;
      if (filterDto.status) query.status = filterDto.status;
      if (filterDto.supplyStatus) query.supplyStatus = filterDto.supplyStatus;

      const [result, count] = await this.materialRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { estate: true, createdBy: true },
      });

      if (result.length) {
        const totalPages = Math.round(count / size);
        const analytic = {
          supply: await this.materialRepo.count(),
          requests: await this.materialRequestRepo.count(),
          materials: await this.materialRepo.sum('quantity'),
          materialLeft: await this.materialRepo.sum('quantityLeft'),
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
      return Response.failure(Messages.NoMaterialFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchMaterials(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      var query = [] as any;
      query = [
        { name: Like(`%${searchString}%`) },
        { type: Like(`%${searchString}%`) },
        { description: Like(`%${searchString}%`) },
        { supplyStatus: Like(`%${searchString}%`) },
      ];

      const [result, count] = await this.materialRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { estate: true, createdBy: true },
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
      return Response.failure(Messages.NoMaterialFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
