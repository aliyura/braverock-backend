import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './helpers';
import coreConfig from './config/config';
import { join } from 'path';
import * as firebase from 'firebase-admin';
import * as path from 'path';

async function bootstrap() {
  const CONFIG = coreConfig();

  // create a rotating write stream
  const accessLogStream = createStream('access.log', {
    interval: '1d', // rotate daily
    path: path.join(path.dirname(__dirname), 'log'),
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  // setup the logger
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    index: false,
    prefix: '/public',
  });
  app.use(morgan('combined', { stream: accessLogStream }));
  app.use(morgan('combined'));
  app.use(compression());
  app.use(helmet());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    next();
  });
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
  });
  try {
    // quit on ctrl-c when running docker in terminal
    process.on('SIGINT', () => {
      console.info(
        'Got SIGINT (aka ctrl-c in docker). Graceful shutdown ',
        new Date().toISOString(),
      );
      app.close();
    });

    // quit properly on docker stop
    process.on('SIGTERM', () => {
      console.info(
        'Got SIGTERM (docker container stop). Graceful shutdown ',
        new Date().toISOString(),
      );
      app.close();
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Promise Rejection:', reason);
    });
  } catch (e) {
    console.error(e);
  }
  firebase.initializeApp(
    {
      credential: firebase.credential.cert(
        path.join(__dirname, '..', 'firebase-adminsdk.json'),
      ),
    },
    process.env.APP_NAME,
  );

  console.log('Running on port: ' + CONFIG.port);
  await app.listen(CONFIG.port);
}
bootstrap();
