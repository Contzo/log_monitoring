import { DataSource, type DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { LogFile } from './log_file/log_file.entity.js';
import { Server } from './server/server.entity.js';

function safeReadEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env variable ${key}`);
  }
  return value;
}

loadEnv({ path: `.env.${safeReadEnv('NODE_ENV')}`, quiet: true });

const dataSourceObjectBase: Pick<DataSourceOptions, 'entities'> = {
  entities: [LogFile, Server],
};

function getDataSourceOptions(): DataSourceOptions {
  switch (safeReadEnv('DB_TYPE')) {
    case 'postgres':
      return {
        ...dataSourceObjectBase,
        type: 'postgres',
        url: safeReadEnv('DATABASE_URL'),
        synchronize: false,
      };

    case 'sqlite':
      return {
        ...dataSourceObjectBase,
        type: 'better-sqlite3',
        database: safeReadEnv('DB_NAME'),
        synchronize: true,
      };
    default:
      throw new Error(`Unknown database type ${safeReadEnv('DB_TYPE')}`);
  }
}
export const dataSourceOptions = getDataSourceOptions();

export default new DataSource(dataSourceOptions);
