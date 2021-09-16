import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { AuthenticationError, WorksClient, WorksClientError } from "./worksClient";

export async function handler(event: APIGatewayProxyEvent, context: Context) {
  const client = new WorksClient(process.env.HUE_DOMAIN, process.env.HUE_AUTH_DOMAIN);
  let postJson;

  try {
    postJson = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: false, error: "bad request." }),
    };
  }

  try {
    const message = await client.doPunchOut(postJson.username, postJson.password, postJson.date);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: true, result: message }),
    }
  } catch (error) {
    let statusCode: number;
    switch (true) {
      case error instanceof WorksClientError:
        statusCode = 400;
      case error instanceof AuthenticationError:
        statusCode = 401;
      default:
        statusCode = 500;
    }
    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: false, error: error.message }),
    }
  }
};