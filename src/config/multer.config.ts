import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { Helpers } from 'src/helpers';

export const multerConfig = {
  dest: process.env.UPLOAD_LOCATION,
};

export const multerOptions = {
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const uploadPath = multerConfig.dest;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath);
      }
      cb(null, uploadPath);
    },
    filename: (req: any, file: any, cb: any) => {
      console.log(`${extname(file.originalname)}`);
      cb(null, `${Helpers.getCode()}${extname(file.originalname)}`);
    },
  }),
};
