import { APIGatewayProxyHandler } from "aws-lambda";
import { WorksClient } from "./worksClient";

export const handler: APIGatewayProxyHandler = (event, context, callback) => {
  const client = new WorksClient(process.env.HUE_DOMAIN, process.env.HUE_AUTH_DOMAIN);

  client.doLogin(event.queryStringParameters?.username, event.queryStringParameters?.password).then((result) => {
    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    });
  })
  .catch((error) => {
    callback(null, {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(error),
    });
  });
};