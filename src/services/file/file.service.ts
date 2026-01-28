import { BadRequestException, Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Helpers, Response } from 'src/helpers';
import * as sharp from 'sharp';
import { Messages } from 'src/utils/messages/messages';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { File } from 'src/schemas/file.schema';
import { FileDto, FilePropsDto } from 'src/dtos/file.dto';
import { User } from 'src/schemas/user.schema';
import { UserRole } from 'src/enums';
import { FilterDto } from 'src/dtos/filter.dto';
import * as NodeCache from 'node-cache';

@Injectable()
export class FileService {
  cache = new NodeCache();
  constructor(@InjectRepository(File) private fileRepo: Repository<File>) {}

  AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
  s3 = new AWS.S3({
    endpoint: process.env.AWS_S3_ENDPOINT, // Wasabi endpoint
    region: process.env.AWS_REGION_STATIC,
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_KEY_SECRET,
  });

  async createFolder(
    authenticatedUser: User,
    requestDto: FileDto,
  ): Promise<ApiResponse> {
    const folderExist = await this.fileRepo.existsBy({ name: requestDto.name });
    if (folderExist) return Response.failure(Messages.FolderAlreadyExist);

    const request = {
      name: requestDto.name,
      type: 'folder',
      createdById: authenticatedUser.id,
    } as File as unknown;

    const folder = await this.fileRepo.save(request);
    if (requestDto.parentId) {
      const parent = await this.fileRepo.findOneBy({ id: requestDto.parentId });
      if (!parent || parent.type !== 'folder')
        throw new BadRequestException(Messages.InvalidParentFolder);
      folder.parent = parent;
    }
    const savedFolder = await this.fileRepo.save(folder);
    return Response.success(savedFolder);
  }

  async getFolder(authenticatedUser: User, name: string): Promise<File> {
    const folderExist = await this.fileRepo.findOne({ where: { name } });
    if (folderExist) return folderExist;

    const request = {
      name: name,
      type: 'folder',
      createdById: authenticatedUser.id,
    } as File as unknown;

    return await this.fileRepo.save(request);
  }

  async uploadFile(
    authenticatedUser: User,
    file,
    fileProps: FilePropsDto,
  ): Promise<ApiResponse> {
    try {
      if (!file) return Response.failure('Invalid file or not found');

      let s3FolderPath = '';
      let parent = null;

      if (fileProps.folder) {
        const parentFolder = await this.getFolder(
          authenticatedUser,
          fileProps.folder,
        );
        if (parentFolder) parent = parentFolder;
      }

      if (fileProps.parentId) {
        parent = await this.fileRepo.findOne({
          where: { id: fileProps.parentId },
          relations: { parent: true },
        });

        if (!parent || parent.type !== 'folder') {
          throw new BadRequestException(Messages.InvalidParentFolder);
        }
      }

      let { originalname } = file;
      const extension = Helpers.getExtension(originalname);
      const filename = `${Helpers.getCode()}_${Date.now()}${extension}`;
      if (fileProps.name) originalname = `${fileProps.name}${extension}`;

      const oneGB = 1024 * 1024 * 1024; // 1 GB in bytes (binary)
      if (file.size >= oneGB) {
        return Response.failure(Messages.fileTooLarge);
      }

      const buffer = file.buffer;
      if (parent) s3FolderPath = await this.buildFolderPath(parent);
      const filePath = s3FolderPath ? `${s3FolderPath}/${filename}` : filename;

      const response = await this.s3_upload(
        buffer,
        this.AWS_S3_BUCKET,
        filePath,
        file.mimetype,
      );

      if (!response.success) return response;

      const savedFile = await this.fileRepo.save({
        name: originalname,
        url: response.payload.url,
        s3Key: filePath,
        type: 'file',
        mimeType: file.mimetype,
        parent,
        createdById: authenticatedUser.id,
      });

      return Response.success(savedFile);
    } catch (ex) {
      console.error(ex);
      return Response.failure(Messages.unableToUploadFile);
    }
  }

  async deleteFile(
    authenticatedUser: User,
    fileId: number,
  ): Promise<ApiResponse> {
    try {
      const file = await this.fileRepo.findOne({
        where: { id: fileId },
        relations: ['children'],
      });

      if (!file) return Response.failure(Messages.FileNotFound);

      const isOwnerOrAdmin =
        file.createdById === authenticatedUser.id ||
        [UserRole.SUPERADMIN, UserRole.MANAGER].includes(
          authenticatedUser.role as UserRole,
        );

      if (!isOwnerOrAdmin) return Response.failure(Messages.NoPermission);
      if (file.type === 'folder') {
        const folderPath = await this.buildFolderPath(file);
        await this.deleteFolderFromS3(folderPath);
      } else {
        const key = this.extractS3Key(file);
        await this.s3
          .deleteObject({
            Bucket: this.AWS_S3_BUCKET,
            Key: key,
          })
          .promise();
      }
      await this.fileRepo.delete({ id: fileId });

      return Response.success(Messages.DeletedSuccessfully);
    } catch (error) {
      console.error(error);
      return Response.failure(Messages.UnableToDeleteFile);
    }
  }

  async renameFile(
    authenticatedUser: User,
    fileId: number,
    newName: string,
  ): Promise<ApiResponse> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });

    if (!file) return Response.failure(Messages.FileNotFound);

    const isOwnerOrAdmin =
      file.createdById === authenticatedUser.id ||
      [UserRole.SUPERADMIN, UserRole.MANAGER].includes(
        authenticatedUser.role as UserRole,
      );

    if (!isOwnerOrAdmin) return Response.failure(Messages.NoPermission);

    if (!newName || newName.trim() === '') {
      return Response.failure('New name cannot be empty');
    }
    if (file.type === 'file') {
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      if (!newName.endsWith(ext)) {
        newName = `${newName}${ext}`;
      }
    }

    file.name = newName;
    file.updatedAt = new Date();
    await this.fileRepo.save(file);

    return Response.success(Messages.FileNamedSuccessfully);
  }

  async buildFolderPath(folder: File): Promise<string> {
    const names: string[] = [];

    let current = folder;
    while (current) {
      names.unshift(current.name);
      current = current.parent
        ? await this.fileRepo.findOne({
            where: { id: current.parent.id },
            relations: ['parent'],
          })
        : null;
    }

    return names.join('/');
  }

  private extractS3Key(file: File): string {
    const url = new URL(file.url);
    return decodeURIComponent(
      url.pathname.replace(`/${this.AWS_S3_BUCKET}/`, ''),
    ).replace(/^\/+/, '');
  }

  private async deleteFolderFromS3(folderPath: string): Promise<void> {
    const list = await this.s3
      .listObjectsV2({
        Bucket: this.AWS_S3_BUCKET,
        Prefix: `${folderPath}/`,
      })
      .promise();

    if (!list.Contents || list.Contents.length === 0) return;

    const objects = list.Contents.map((item) => ({ Key: item.Key }));

    await this.s3
      .deleteObjects({
        Bucket: this.AWS_S3_BUCKET,
        Delete: { Objects: objects },
      })
      .promise();
  }

  async s3_upload(file, bucket, name, mimetype): Promise<ApiResponse> {
    const params = {
      Bucket: bucket,
      Key: String(name),
      Body: file,
      ContentType: mimetype,
      ContentDisposition: 'inline',
      CreateBucketConfiguration: {
        LocationConstraint: 'ap-south-1',
      },
      partSize: 1,
    };
    try {
      const s3Response = await this.s3.upload(params).promise();
      const response = {
        url: s3Response.Location,
        fileName: s3Response.Key,
      } as any;
      return Response.success(response);
    } catch (e) {
      console.log(e);
      return Response.failure('Unable to upload file');
    }
  }

  async delete(key: string): Promise<any> {
    const params = { Bucket: this.AWS_S3_BUCKET, Key: String(key) };
    const s3Response = await this.s3.deleteObject(params).promise();
    return s3Response;
  }

  async findAllFiles(
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

      if (filter.userId) query.createdById = filter.userId;
      if (filter.parent) query.parent = { id: filter.parent };

      if (
        !['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(authenticatedUser.role)
      ) {
        query.createdById = authenticatedUser.id;
      }

      const [result, count] = await this.fileRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, parent: true },
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
      return Response.failure(Messages.NoFileFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchFiles(
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

      const query = [] as any;

      const queryValue: any = {
        name: searchString ? Like(`%${searchString}%`) : undefined,
      };

      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      ) {
        queryValue.createdById = authenticatedUser.id;
      }

      if (filter.parent) {
        queryValue.parent = { id: filter.parent };
      }
      query.push(queryValue);

      console.log(query);

      const [result, count] = await this.fileRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, parent: true },
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
      return Response.failure(Messages.NoFileFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
