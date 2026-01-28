import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { UserRole } from 'src/enums';
import { MaterialTypeDto, UpdateMaterialTypeDto } from 'src/dtos/material.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { MaterialType } from 'src/schemas/inventory/material-type.schema';
@Injectable()
export class MaterialTypeService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(MaterialType)
    private materialTypeRepo: Repository<MaterialType>,
  ) {}

  async addMaterialType(
    authenticatedUser: User,
    requestDto: MaterialTypeDto,
  ): Promise<ApiResponse> {
    try {
      const request = {
        ...requestDto,
        createdById: authenticatedUser.id,
      } as unknown as MaterialType;

      const created = await this.materialTypeRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add material type');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateMaterialType(
    materialId: number,
    authenticatedUser: User,
    requestDto: UpdateMaterialTypeDto,
  ): Promise<ApiResponse> {
    try {
      const material = await this.materialTypeRepo.findOne({
        where: { id: materialId },
      });
      if (!material) return Response.failure(Messages.MaterialTypeNotAvailable);

      const updateRequest = {
        ...material,
        ...requestDto,
      } as MaterialType;

      await this.materialTypeRepo.update({ id: materialId }, updateRequest);
      const updatedUser = await this.materialTypeRepo.findOne({
        where: { id: materialId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteMaterialType(
    materialId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.LEADENGINEER &&
        authenticatedUser.role != UserRole.STOREKEEPER
      )
        return Response.failure(Messages.NoPermission);

      await this.materialTypeRepo.delete(materialId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findMaterialTypeById(materialId: number) {
    const result = await this.materialTypeRepo.findOne({
      where: { id: materialId },
    });
    if (result) return Response.success(result);
    return Response.failure(Messages.MaterialTypeNotAvailable);
  }

  async findAllMaterialTypes(
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

      if (filterDto.category) query.category = filterDto.category;

      const [result, count] = await this.materialTypeRepo.findAndCount({
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
      return Response.failure(Messages.NoMaterialTypeFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchMaterialTypes(
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
        { category: Like(`%${searchString}%`) },
      ];

      const [result, count] = await this.materialTypeRepo.findAndCount({
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
      return Response.failure(Messages.NoMaterialTypeFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
