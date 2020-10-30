/* eslint-disable import/no-extraneous-dependencies,@typescript-eslint/ban-ts-comment */
import * as aws from "aws-sdk";
import localDynamo from "local-dynamo";
import tcpPortUsed from "tcp-port-used";

const port = parseInt(process.env.DYNAMO_TEST_PORT || "4567", 10)

export const dynamoOptions = {
  region: "us-west-2",
  // @ts-ignore
  endpoint: `http://localhost:${port}`,
  accessKeyId: "fakeMyKeyId",
  secretAccessKey: "fakeSecretAccessKey",
};

const startupDynamo = () => {
  localDynamo.launch(undefined, port);
};

beforeAll(async () => {
  const found = await tcpPortUsed.check(port,  "127.0.0.1");
  aws.config.update(dynamoOptions);
  if (!found) {
    console.warn(`It is usually better to start dynamodb manually so it does not have to restart between test runs, do 
    docker run -p 4567:8000 amazon/dynamodb-local`);
    await startupDynamo();
  }
});
const dynamodb = new aws.DynamoDB(dynamoOptions);

export const removeTable = async (tableName: string) =>
  dynamodb.deleteTable({ TableName: tableName }).promise();

let createdTables: string[] = [];
let tablesToClearAfterAll: string[] = [];
afterEach(async () => {
  await Promise.all(createdTables.map(removeTable));
  createdTables = [];
});

afterAll(async () => {
  await Promise.all(tablesToClearAfterAll.map(removeTable));
  tablesToClearAfterAll = [];
});

export type CreatedTable = {
  tableName: string;
  documentClient: aws.DynamoDB.DocumentClient;
};

export const generateRandomName = (name = '') =>
  `${Date.now()}_${Math.floor(Math.random() * 1000)}_${name}`;

export async function createTable(
  params: aws.DynamoDB.CreateTableInput,
  opts: {
    keepTable?: boolean;
    readOnly?: boolean;
  } = { readOnly: false, keepTable: false }
): Promise<CreatedTable> {
  const documentClient = new aws.DynamoDB.DocumentClient(dynamoOptions);

  if (opts.keepTable) {
    try {
      const tableDescr = await dynamodb
        .describeTable({TableName: params.TableName})
        .promise();

      if ((tableDescr?.Table?.ItemCount || 0) > 0) {
        const dynamoDBWriteFunction = function () {
          return {
            promise: () => {
            },
          };
        };

        const methodsToReplace = [
          "put",
          "update",
          "delete",
          "batchWrite",
          "transactWrite",
        ];
        methodsToReplace.forEach((methodName) => {
          // @ts-ignore
          documentClient[methodName] = dynamoDBWriteFunction;
        });
      }
    } catch(e) {
      if (e.code === "ResourceNotFoundException") {
        await dynamodb.createTable(params).promise();
      }
    }
  } else {
    await dynamodb.createTable(params).promise();
  }
  if (opts.readOnly) {
    tablesToClearAfterAll.push(params.TableName);
  } else if (!opts.keepTable) {
    createdTables.push(params.TableName);
  }

  return { tableName: params.TableName, documentClient };
}
