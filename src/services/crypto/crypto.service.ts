import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
@Injectable()
export class CryptoService {
  saltRounds = 10;

  async encrypt(text: string): Promise<string> {
    const salt = await bcrypt.genSaltSync(this.saltRounds);
    const hash = await bcrypt.hashSync(text, salt);
    return hash;
  }

  async compare(cipher: string, plainText: string): Promise<boolean> {
    return await bcrypt.compareSync(plainText, cipher);
  }
}
