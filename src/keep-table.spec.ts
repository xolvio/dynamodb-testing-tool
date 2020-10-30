import {DynamoDB} from "aws-sdk";
import {createTable, generateRandomName} from "./index";

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
