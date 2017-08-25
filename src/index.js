import { connection, setConfig } from './connectionFromMongooseQuery';

export default {
  connectionFromMongooseQuery: connection,
  setConfigForConnectionFromMongooseQuery: setConfig,
};

export const connectionFromMongooseQuery = connection;
export const setConfigForConnectionFromMongooseQuery = setConfig;
