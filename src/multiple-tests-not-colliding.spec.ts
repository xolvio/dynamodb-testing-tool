import { DynamoDB } from "aws-sdk";
import { CreatedTable, createTable, generateRandomName } from "./index";

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
