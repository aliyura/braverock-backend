import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { ProjectExpenseAnalysis } from 'src/schemas/accounting/project-expense-analysis.schema';
import {
  ProjectExpenseAnalysisDto,
  UpdateProjectExpenseAnalysisDto,
} from 'src/dtos/accounting/project-expense-analysis.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { User } from 'src/schemas/user.schema';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ActionType, StateStatus, UserRole } from 'src/enums';

@Injectable()
export class ProjectExpenseAnalysisService {
  constructor(
    @InjectRepository(ProjectExpenseAnalysis)
    private expenseRepo: Repository<ProjectExpenseAnalysis>,
  ) {}

  /* ========================= ADD ========================= */

  async addProjectExpense(
    authenticatedUser: User,
    requestDto: ProjectExpenseAnalysisDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const request: ProjectExpenseAnalysis = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as unknown as ProjectExpenseAnalysis;

      const created = await this.expenseRepo.save(request);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= BULK UPLOAD ========================= */
  /**
   * Expected format:
   * DATE | DESCRIPTION | AMT ANALYZED | PROJECT | <DYNAMIC COST HEADERS...>
   * Any column not in the fixed list is treated as a bucket key.
   */
  async bulkUploadProjectExpenses(
    fileBuffer: Buffer,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];

      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];

      headerRow.eachCell((cell) => {
        if (cell.value) headers.push(String(cell.value).trim());
      });

      const fixedHeaders = [
        'date',
        'description',
        'amt analyzed',
        'amount analyzed',
        'project',
        'project name',
      ];

      const getCellValue = (row: ExcelJS.Row, colIndex: number) => {
        const val = row.getCell(colIndex).value;
        if (val == null) return null;
        if (typeof val === 'object') {
          if ('text' in val) return val.text;
          if ('richText' in val)
            return val.richText.map((r) => r.text).join('');
          if ('formula' in val) return val.result;
        }
        return val;
      };

      const records: Partial<ProjectExpenseAnalysis>[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row) continue;

        try {
          let date: Date | null = null;
          let description = '';
          let amountAnalyzed = 0;
          let projectName = '';
          const buckets: Record<string, number> = {};

          headers.forEach((header, index) => {
            const value = getCellValue(row, index + 1);
            const key = header.toLowerCase();

            if (!value) return;

            if (key === 'date') {
              date = new Date(value as any);
            } else if (key === 'description') {
              description = String(value).trim();
            } else if (key === 'amt analyzed' || key === 'amount analyzed') {
              amountAnalyzed = Number(value) || 0;
            } else if (key === 'project' || key === 'project name') {
              projectName = String(value).trim();
            } else if (!fixedHeaders.includes(key)) {
              buckets[header] = Number(value) || 0;
            }
          });

          if (!projectName || !date) continue;

          const record: Partial<ProjectExpenseAnalysis> = {
            date,
            description,
            amountAnalyzed,
            projectName,
            buckets,
            createdById: authenticatedUser.id,
            status: StateStatus.ACTIVE,
          };

          records.push(record);
        } catch (err) {
          errors.push({ row: i, error: err });
        }
      }

      const created = await this.expenseRepo.save(records);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing project expense file');
    }
  }

  /* ========================= UPDATE ========================= */

  async updateProjectExpense(
    id: number,
    authenticatedUser: User,
    requestDto: UpdateProjectExpenseAnalysisDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.expenseRepo.findOne({ where: { id } });
      if (!record) return Response.failure(Messages.RecordNotFound);

      const updateHistory = {
        ...requestDto,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      record.updateHistory = record.updateHistory
        ? [...record.updateHistory, updateHistory]
        : [updateHistory];

      Object.assign(record, requestDto);

      await this.expenseRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= DELETE ========================= */

  async deleteProjectExpense(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN
      )
        return Response.failure(Messages.NoPermission);

      await this.expenseRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= GET BY ID ========================= */

  async getProjectExpenseById(id: number): Promise<ApiResponse> {
    try {
      const record = await this.expenseRepo.findOne({
        where: { id },
        relations: { createdBy: true },
      });

      if (!record) return Response.failure(Messages.RecordNotFound);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= LIST + ANALYTICS ========================= */

  async findAllProjectExpenses(
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
      const query = Helpers.buildFilteredQuery(filter);

      const [result, count] = await this.expenseRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const analytic = {
        total: count,
        totalAnalyzedAmount: await this.expenseRepo.sum('amountAnalyzed'),
      };

      const totalPages = Math.round(count / size);

      return Response.success({
        analytic,
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= SEARCH ========================= */

  async searchProjectExpenses(
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

      const targetFields = ['description', 'projectName'];

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.expenseRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const totalPages = Math.round(count / size);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= EXPORT ========================= */

  async exportProjectExpenses(filter: FilterDto): Promise<Buffer> {
    const records = await this.expenseRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { date: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Project Expense Analysis');

    // dynamic header discovery
    const bucketKeys = new Set<string>();
    records.forEach((r) => {
      if (r.buckets) {
        Object.keys(r.buckets).forEach((k) => bucketKeys.add(k));
      }
    });

    const bucketHeaders = Array.from(bucketKeys);

    sheet.addRow([
      'Date',
      'Description',
      'Project',
      'Amount Analyzed',
      ...bucketHeaders,
    ]);

    records.forEach((r) => {
      sheet.addRow([
        r.date,
        r.description,
        r.projectName,
        r.amountAnalyzed,
        ...bucketHeaders.map((k) => r.buckets?.[k] || 0),
      ]);
    });

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
