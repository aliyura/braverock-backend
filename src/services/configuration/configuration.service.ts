import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateConfigurationDto,
  UpdateConfigurationDto,
} from 'src/dtos/configuration.dto';
import { SystemType } from 'src/enums';
import { Configuration } from 'src/schemas/configuration.schema';
import { Repository } from 'typeorm';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';

@Injectable()
export class ConfigurationService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
  ) {}

  async onApplicationBootstrap() {
    await this.getOrCreateConfig();
    console.log('✔ Configuration checked and initialized at startup.');
  }

  async getOrCreateConfig(): Promise<ApiResponse> {
    try {
      let config = await this.configRepo.findOne({ where: { id: 1 } });
      if (!config) {
        const newConfig = this.configRepo.create({
          businessName: process.env.DEFAULT_BUSINESS_NAME,
          businessEmail: process.env.DEFAULT_BUSINESS_EMAIL,
          licenseExpiryDate: new Date(process.env.DEFAULT_LICENSE_EXPIRY_DATE),
          systemType: process.env.DEFAULT_SYSTEM_TYPE as SystemType,
          businessPhone: process.env.DEFAULT_BUSINESS_PHONE,
          businessAddress: process.env.DEFAULT_BUSINESS_ADDRESS,
          businessWebsite: process.env.DEFAULT_BUSINESS_WEBSITE,
          supportEmail: process.env.DEFAULT_SUPPORT_EMAIL,
          supportPhone: process.env.DEFAULT_SUPPORT_PHONE,
          description: process.env.DEFAULT_DESCRIPTION,
          logoUrl: process.env.DEFAULT_LOGO_URL,
          faviconUrl: process.env.DEFAULT_FAVICON_URL,
          primaryColor: process.env.DEFAULT_PRIMARY_COLOR,
          secondaryColor: process.env.DEFAULT_SECONDARY_COLOR,
          isLocked: process.env.DEFAULT_IS_LOCKED === 'true',
        });

        config = await this.configRepo.save(newConfig);
      }

      return Response.success(config);
    } catch (error) {
      console.log(error);
      return Response.failure('Failed to load system configuration.');
    }
  }

  /**
   * Create a configuration manually — only if none exists.
   */
  async createConfig(data: CreateConfigurationDto): Promise<ApiResponse> {
    try {
      const existing = await this.configRepo.findOne({ where: { id: 1 } });
      if (existing) {
        return Response.failure('System configuration already exists.');
      }

      const config = await this.configRepo.save(this.configRepo.create(data));
      return Response.success(config);
    } catch (error) {
      console.log(error);
      return Response.failure('Failed to create system configuration.');
    }
  }

  /**
   * Return the only configuration record.
   */
  async getConfig(): Promise<ApiResponse> {
    try {
      const config = await this.configRepo.findOne({ where: { id: 1 } });
      if (!config) {
        return Response.failure('System configuration not found.');
      }

      return Response.success(config);
    } catch (error) {
      console.log(error);
      return Response.failure('Failed to retrieve configuration.');
    }
  }

  /**
   * Update the configuration, except for licenseExpiryDate.
   */
  async updateConfig(data: UpdateConfigurationDto): Promise<ApiResponse> {
    try {
      const existing = await this.configRepo.findOne({ where: { id: 1 } });
      if (!existing) {
        return Response.failure('System configuration not found.');
      }
      if (
        'licenseExpiryDate' in data &&
        data.licenseExpiryDate &&
        new Date(data.licenseExpiryDate).toISOString().split('T')[0] !==
          existing.licenseExpiryDate.toISOString().split('T')[0]
      ) {
        return Response.failure('License expiry date cannot be modified.');
      }

      Object.assign(existing, data);
      const updated = await this.configRepo.save(existing);
      return Response.success(updated);
    } catch (error) {
      console.log(error);
      return Response.failure('Failed to update system configuration.');
    }
  }

  /**
   * Delete is blocked to ensure singleton configuration.
   */
  async deleteConfig(): Promise<ApiResponse> {
    return Response.failure('Configuration deletion is not allowed.');
  }
}
