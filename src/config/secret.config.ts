import { registerAs } from '@nestjs/config';

export default registerAs('secret_config', () => ({
  JWT_SECRET: process.env.JWT_SECRET,
}));
