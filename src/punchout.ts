import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { WorksClient } from "./worksClient";

export async function handler(event: APIGatewayProxyEvent, context: Context) {
  const client = new WorksClient(process.env.HUE_DOMAIN, process.env.HUE_AUTH_DOMAIN);
  const postJson = JSON.parse(event.body);

  try {
    const message = await (await client.doLogin(postJson.username, postJson.password)).doPunchOut(postJson.date);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: true, result: message }),
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