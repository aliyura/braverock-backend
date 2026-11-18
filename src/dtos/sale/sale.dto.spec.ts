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
  it('accepts the fields without the optional client fields', async () => {
    const dto = plainToInstance(SaleDto, validSale);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows all fields including name, dob and residential address to be optional', async () => {
    const dto = plainToInstance(SaleDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
