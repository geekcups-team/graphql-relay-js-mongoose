const cursorToCursorObject = async (_, cursor) => {
  const value = Buffer.from(cursor, 'base64').toString('utf-8');
  return JSON.parse(value);
};

const cursorObjectToBeforeSelector = async (_, cursorObject) => ({
  _id: {
    $lt: cursorObject.id,
  },
});

const cursorObjectToAfterSelector = async (_, cursorObject) => ({
  _id: {
    $gt: cursorObject.id,
  },
});

const docToCursor = async (query, node) => {
  const value = {
    id: node._id.toString(), // eslint-disable-line no-underscore-dangle
    model: query.model.modelName,
  };
  return Buffer.from(JSON.stringify(value), 'utf-8').toString('base64');
};

let config = {
  defaultLimit: async () => 10,
  maxLimit: async () => 10000,
  minimumSelectorForCursorGeneration: async () => ({ _id: 1 }),
  cursorToCursorObject,
  cursorObjectToBeforeSelector,
  cursorObjectToAfterSelector,
  docToCursor,
};

const getPageInfo = async (query, totalCount, first, last, firstNode, lastNode) => {
  const firstNodeResolved = await firstNode;
  const lastNodeResolved = await lastNode;
  return {
    startCursor: firstNodeResolved ? config.docToCursor(query, firstNodeResolved) : null,
    endCursor: lastNodeResolved ? config.docToCursor(query, lastNodeResolved) : null,
    hasPreviousPage: last ? totalCount > last : false,
    hasNextPage: first ? totalCount > first : false,
  };
};

export const connection = async (query, args, loader) => {
  let { first, last } = args;

  if (first && last) {
    throw new Error('Cannot supply first and last togheter');
  }

  const { after, before } = args;
  const clonedQuery = query.model.find().merge(query);
  clonedQuery.select(await config.minimumSelectorForCursorGeneration(query));

  if (!first && !last) first = await config.defaultLimit(query);
  if (first > config.maxLimit) first = await config.maxLimit(query);
  if (last > config.maxLimit) last = await config.maxLimit(query);

  const beforeCursorObject = before ? await config.cursorToCursorObject(query, before) : null;
  const afterCursorObject = after ? await config.cursorToCursorObject(query, after) : null;

  const beforeSelector = beforeCursorObject
    ? await config.cursorObjectToBeforeSelector(query, beforeCursorObject)
    : null;
  const afterSelector = afterCursorObject
    ? await config.cursorObjectToAfterSelector(query, afterCursorObject)
    : null;

  if (beforeSelector) {
    clonedQuery.find(beforeSelector);
  }
  if (afterSelector) {
    clonedQuery.find(afterSelector);
  }

  const totalCount = await clonedQuery.count();

  let skip = 0;
  let limit = last || first;
  if (last) {
    skip = totalCount > last ? totalCount - last : 0;
  }

  if ((limit + skip) > totalCount) {
    limit = totalCount - skip;
  }

  let nodes = [];
  let firstNode = null;
  let lastNode = null;

  if (limit > 0) {
    nodes = query.model.find().merge(clonedQuery)
      .skip(skip)
      .limit(limit);
    firstNode = query.model.findOne().merge(clonedQuery)
      .skip(skip)
      .limit(1);
    lastNode = query.model.findOne().merge(clonedQuery)
      .skip(skip + limit - 1)
      .limit(1);
  }

  const pageInfo = getPageInfo(query, totalCount, first, last, firstNode, lastNode);

  return {
    edges: async () => (
      (await nodes).map(async node => (
        {
          cursor: config.docToCursor(query, node),
          node: loader(node),
        }
      ))
    ),
    pageInfo,
  };
};

export function setConfig(newConfig) {
  config = { ...config, ...newConfig };
}

export default connection;
