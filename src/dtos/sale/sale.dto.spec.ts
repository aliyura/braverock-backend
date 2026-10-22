import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaleDto } from './sale.dto';

const validSale = {
  clientType: 'INDIVIDUAL',
  name: 'John Doe',
  emailAddress: 'john.doe@example.com',
  phoneNumber: '08000000000',
  dob: '1990-01-01',
  residentialAddress: '1 Test Street, Lagos',
  propertyId: 1,
  propertyType: 'HOUSE',
};

describe('SaleDto', () => {
  it('accepts the required fields without the optional client fields', async () => {
    const dto = plainToInstance(SaleDto, validSale);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('requires dob and residential address', async () => {
    const { dob, residentialAddress, ...rest } = validSale;
    const dto = plainToInstance(SaleDto, rest);

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['dob', 'residentialAddress']),
    );
  });
});
