# Graphql relay mongoose

## Synopsis

A library to help construct connection with edges and cursors for a graphql-js server supporting react-relay with mongoose ODM.

## Code Example

```
const { connectionFromMongooseQuery } = require('graphql-relay-mongoose');

//create connection with graphql-relay-js package
var {connectionType: ShipConnection} = connectionDefinitions({nodeType: shipType});
var factionType = new GraphQLObjectType({
  name: 'Faction',
  fields: () => ({
    ships: {
      type: ShipConnection,
      args: connectionArgs,
      resolve: (faction, args) => {
        const Ship = mongoose.model('Ship');
        return connectionFromMongooseQuery(Ship.find({}), args,
          async partialDoc => await load(partialDoc) //load the full document
        }
      ),
    }
  }),
});

```
By default, without configuration, the ```connectionFromMongooseQuery``` paginate the query using mongoDB ```_id```. See below to see more configuration.

The last argument is a ```load``` function used to load the full document from database. The document is projected by the projection
object supply by ```minimumSelectorForCursorGeneration```.

## Installation

```
npm install graphql graphql-relay graphql-relay-mongoose mongoose
```

## Advanced configuration

By default the package paginate the query using mongoDB ```_id``` and to avoid large retrieval from database, the package project the query to only ```_id``` field. You can configure all the steps to create cursors and pagination.

```
const { setConfigForConnectionFromMongooseQuery } = require('graphql-relay-mongoose');

setConfigForConnectionFromMongooseQuery({
  //return the default limit if none is provided
  defaultLimit: async function(query) { } ,
  //return the max limit if larger is provided
  maxLimit: async function(query) { },
  //return the mongoose projection object to be used when retrieving object from database to
  //create a cursor (to avoid large retrieval from database)
  minimumSelectorForCursorGeneration: async function(query) { },
  //return the cursor object computed from the cursor string
  cursorToCursorObject: async function(query, cursorString) { },
  //return the mongoose selector object (for pagination) computed from
  //the before cursor object
  cursorObjectToBeforeSelector: async function(query, cursorObject) { },
  //return the mongoose selector object (for pagination) computed from
  //the after cursor object
  cursorObjectToAfterSelector : async function(query, cursorObject) { },
  //return the cursor string computed from a mongoose doc. partialDoc is
  //the document projected by the projection
  //object supply by minimumSelectorForCursorGeneration
  docToCursorObject: async function(query, partialDoc) { },
});
```

For detail look at how the config object is configured in connectionFromMongooseQuery.js.

All methods are async because you may need to do some additional query inside each one.

To all methods, a ```query``` object is passed. With this object (a mongoose Query object), you can define different rules for different collection. See this example:

```
const defaultLimit = async(query) => {
  if (query.model.modelName === 'Ship') {
    return 10;
  }
  return 5;
}

```

## Tests

TODO: add some tests

## License

Graphql relay mongoose is released under the [MIT License](https://opensource.org/licenses/MIT).
