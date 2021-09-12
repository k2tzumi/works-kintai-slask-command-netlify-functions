import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { WorksClient } from "./worksClient";

export async function handler(event: APIGatewayProxyEvent, context: Context) {
  const client = new WorksClient(process.env.HUE_DOMAIN, process.env.HUE_AUTH_DOMAIN);

  console.log(`event: ${event.body}`);

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
    await client.doLogin(postJson.username, postJson.password);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: true }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: false, error }),
    }
  }
};