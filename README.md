# DynamoDB Testing Tool

Why? DynamoDB is fantastic tool, but so far it misses a nice abstraction that would make you more confident that the code you write is correct. All those string based queries and parameters probably make you uncomfortable, especially if you are coming from the easy-land of mongodb.
Writing nodejs scripts to set tables up and run methods on them quickly gets tiring, without the fantastic workflow that tools like Jest and WallabyJS provide you. 
This tool will allow you to iterate quickly while working with DynamoDB.

There is not much API to the library. We will start the DynamoDB in the background for you (assuming you have Java SDK, if not, you will have to install it). That should also work on CIs!
Locally, we suggest running dynamodb in the background on port 4567 (run your tests with DYNAMO_TEST_PORT env variables if you want to use a different one) to make things faster. 

## Example:

```typescript
import { DynamoDB } from "aws-sdk";
import { CreatedTable, createTable, generateRandomName } from "dynamodb-testing-tool";

const dynamoSchema: DynamoDB.CreateTableInput = {
  TableName: generateRandomName(),
  AttributeDefinitions: [{ AttributeType: "N", AttributeName: "id" }],
  KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
  BillingMode: "PAY_PER_REQUEST",
};

let tableObject: CreatedTable;

beforeEach(async () => {
  tableObject = await createTable(dynamoSchema);
});
describe("Multiple tests do not collide with each other", () => {
  test("Adding an item and getting all should return one item", async () => {
    await tableObject.documentClient.put({
      TableName: tableObject.tableName,
      Item: { id: 1, somethingElse: true },
    }).promise()

    const results = await tableObject.documentClient.scan({TableName: tableObject.tableName}).promise()

    expect(results.Items).toHaveLength(1)
    // @ts-ignore
    expect(results.Items[0]).toMatchObject({somethingElse: true })
  });

  test("Adding another item and getting all should still return one item", async () => {
    await tableObject.documentClient.put({
      TableName: tableObject.tableName,
      Item: { id: 2, somethingElse: false },
    }).promise()

    const results = await tableObject.documentClient.scan({TableName: tableObject.tableName}).promise()

    expect(results.Items).toHaveLength(1)
    // @ts-ignore
    expect(results.Items[0]).toMatchObject({somethingElse: false })
  });
});

```


## Options:

### keepTable

We remove tables automatically, even though the names do not collide with each other, dynamodb starts to slow down with hundreds of tables, especially if they use the same indexes (and they will if you recreate tables with the same shapes over and over).
If you want to avoid that, pass {keepTable: true} as an option to createTable function.
That  option does two things:
- it prevents the tooling from deleting the table
- it allows write operations on the table the first time around (when the table does not exist or is empty)
- it disables the write operations on the table when the table exists and it has at least one item inside.

This is especially useful if you want to test multiple different ways of querying your dataset, but do not want to wait hundreds of milliseconds or even seconds for the db to get populated over and over. Imagine inserting a milion records to dynamodb and being able to test different read patterns with wallabyjs. Dream come true!


Example:

```typescript
import {DynamoDB} from "aws-sdk";
import {createTable} from "dynamodb-testing-tool";

const dynamoSchema: DynamoDB.CreateTableInput = {
  TableName: "fixedName",
  AttributeDefinitions: [{ AttributeType: "N", AttributeName: "id" }],
  KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
  BillingMode: "PAY_PER_REQUEST",
};


test('keepTable option disallows changing the table if it finds the table with items already', async () => {
  const {documentClient, tableName} = await createTable(dynamoSchema, {keepTable: true})
  await documentClient.put({
    TableName: tableName,
    Item: { id: 1, somethingElse: true },
  }).promise()

  let results = await documentClient.scan({TableName: tableName}).promise()

  expect(results.Items).toHaveLength(1)

  await createTable(dynamoSchema, {keepTable: true})
  await documentClient.put({
    TableName: tableName,
    Item: { id: 1, somethingElse: true },
  }).promise()

  results = await documentClient.scan({TableName: tableName}).promise()

  expect(results.Items).toHaveLength(1)
})
```

### readOnly

this method makes the tooling remove the table after all tests in a given file or block finished. The use case is similar to keepTable, but the table will get dynamically recreated from scratch on every test run. This might be useful in initial phase when you want to frequently change the table definition and it's items. If you work with small amount of items it's probably best to use this option. It's plenty fast and convenient.


