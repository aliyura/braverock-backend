import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import * as formatCurrency from 'format-currency';
import { FilterDto } from 'src/dtos/filter.dto';
import { Like } from 'typeorm';

export type HttpClient = (
  path: string,
  queryParam: { [key: string]: string | number | boolean },
  headers: { [key: string]: string | number | boolean },
) => Promise<unknown>;

export class Helpers {
  // ===============================
  // RANDOM ANALYTICS GENERATORS
  // ===============================
  static randomViews(): number {
    return Math.floor(Math.random() * (500 - 50 + 1)) + 50;
  }

  static randomPinned(): number {
    return Math.floor(Math.random() * (50 - 5 + 1)) + 5;
  }

  static getManagementRoles(): any {
    return ['ADMIN', 'SUPERADMIN', 'MANAGER', 'CUSTOMERCARE','ACCOUNTANT'];
  }
  static getUniqueId(): string {
    const id = uuidv4();
    const uid = id.split('-').join('');
    return uid.substring(0, 11).toLowerCase();
  }

  static getDate(): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(2);
    return `${day}/${month}/${year}`;
  }

  static generateNumber(prefix: string): string {
    return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
  }

  static getCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  static getTransactionRef(): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(2); // Get last two digits of year
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}${month}${hours}${minutes}${seconds}${year}`;
  }

  static buildFilteredQuery(filter?: FilterDto, requiredFilter?: any) {
    let query = requiredFilter ? requiredFilter : ({} as any);

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query[key] = value;
        }
      });
    }
    return query;
  }

  static buildSearchQuery(
    searchString: string,
    targetFields: string[],
    filter?: FilterDto,
    requiredFilter?: any,
  ): any {
    const query = [];
    let baseCondition: any = requiredFilter ? requiredFilter : {};

    // Build dynamic queries for searchText + strict filters
    if (searchString) {
      const searchLike = Like(`%${searchString}%`);

      for (const field of targetFields) {
        const condition: any = {
          ...baseCondition,
          [field]: searchLike,
        };

        if (filter) {
          Object.entries(filter).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              condition[key] = value;
            }
          });
        }
        query.push(condition);
      }
    }

    if (!searchString) {
      const condition: any = { ...baseCondition };
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            condition[key] = value;
          }
        });
      }
      query.push(condition);
    }
    return query;
  }

  static getAccountNumber(): number {
    return Math.floor(10000000000 + Math.random() * 90000000000);
  }

  static convertToMoney(num: number): string {
    const opts = { format: '%v %c' };
    return formatCurrency(num, opts).toString().replace('undefined', '');
  }

  static getExtension(filename: string) {
    const i = filename.lastIndexOf('.');
    return i < 0 ? '' : filename.substring(i);
  }

  static validEmailAddress(emailAddress: string): boolean {
    const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    const result = emailAddress.match(regex);
    if (result) return true;

    return false;
  }

  static toCapitalize(str): string {
    return str.toLowerCase().charAt(0).toUpperCase() + str.slice(1);
  }

  static async excelToJson(fileUrl: string): Promise<any> {
    const workbook = await xlsx.readFile(fileUrl);
    const jsonData = xlsx.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
    );
    return jsonData;
  }

  static getArrayFromRequestString(request: string): string[] {
    request = request.replace('[', '').replace(']', '');
    request = request.replace(/\"/g, '');
    return request.split(',');
  }

  static beginingOfMonthDate(): string {
    const t = new Date();
    const day = '01';
    const month = ('0' + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    return `${year}-${month}-${day}`;
  }

  static endOfMonthDate(): string {
    const t = new Date();
    const day = (
      '0' + new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
    ).slice(-2);
    const month = ('0' + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    return `${year}-${month}-${day}`;
  }

  static lastWeekDate(): string {
    const today = new Date();
    const lastWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 7,
    );
    return `${lastWeek.getFullYear()}-${lastWeek.getMonth()}-${lastWeek.getDate()}`;
  }

  static formatDate(t: Date): string {
    const day = ('0' + t.getDate()).slice(-2);
    const month = ('0' + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    return `${year}-${month}-${day}`;
  }

  static formatToNextDay(t: Date): string {
    const day = ('0' + t.getDate()).slice(-2);
    const month = ('0' + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    const today = new Date();
    const todayDate = ('0' + today.getDate()).slice(-2);
    let nextDay = day;
    if (day == todayDate) nextDay = (Number(day) + 1).toString();
    return `${year}-${month}-${nextDay}`;
  }

  static capitalize(value: string): string {
    const words = value.toLowerCase().split(' ');
    return words
      .map((word) => {
        return word[0].toUpperCase() + word.substring(1);
      })
      .join(' ');
  }

  static toWord(str): string {
    if (str) {
      str = str.replace(/[^\w\s]/gi, '').replaceAll(' ', '');
      return str;
    }
    return str;
  }
}
