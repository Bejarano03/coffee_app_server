import { Context, Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import express from 'express';
import { AppModule } from './app.module';

let cachedServer: ReturnType<typeof serverlessExpress> | null = null;

async function bootstrapServer(): Promise<ReturnType<typeof serverlessExpress>> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  expressApp.use('/payments/webhook', bodyParser.raw({ type: 'application/json' }));

  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: true,
  });

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context: Context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }

  return cachedServer(event, context, callback);
};
