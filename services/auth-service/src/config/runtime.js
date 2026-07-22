import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

dotenv.config();

const allowedEnvironments = ['development', 'staging', 'production', 'test'];
const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';

if (!allowedEnvironments.includes(appEnv)) {
  throw new Error(`APP_ENV invalide: ${appEnv}. Valeurs attendues: ${allowedEnvironments.join(', ')}`);
}

const isManagedEnvironment = ['staging', 'production'].includes(appEnv);
const readSecret = (name) => {
  if (process.env[name]) return process.env[name];
  const secretFile = process.env[`${name}_FILE`];
  return secretFile ? readFileSync(secretFile, 'utf8').trim() : undefined;
};

const jwtSecret = readSecret('JWT_SECRET') || (isManagedEnvironment ? undefined : 'dev_jwt_secret_change_me');
const port = Number(process.env.PORT || 3001);

if (!jwtSecret) {
  throw new Error('JWT_SECRET est obligatoire en staging et en production.');
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT invalide: ${process.env.PORT}`);
}

export const runtimeConfig = {
  serviceName: 'auth-service',
  appEnv,
  nodeEnv: process.env.NODE_ENV || appEnv,
  isTest: appEnv === 'test' || process.env.NODE_ENV === 'test',
  port,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://mongo-auth:27017/auth',
  jwtSecret,
};
