import { APIGatewayProxyHandler } from "aws-lambda";
import axios, { AxiosResponse } from "axios";
import axiosCookiejarSupport from "axios-cookiejar-support";

axiosCookiejarSupport(axios);

// axios.interceptors.request.use(request => {
//   console.log('Starting Request: ', request);
//   return request;
// });

// axios.interceptors.response.use(response => {
//   console.log('Response: ', response);
//   return response;
// });

export const handler: APIGatewayProxyHandler = (event, context, callback) => {
  const client = axios.create({
    jar: true,
    withCredentials: true,
  });

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; ja-jp) AppleWebKit/533.17.9 (KHTML,like Gecko) Version/5.0.2 Mobile/8C148a Safari/6533.18.5",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  client
    .get<string>(
      `https://${process.env.HUE_DOMAIN}/self-workflow/cws/mbl/MblActLogin?@REDIRECT=&@REDIRECT=&@JUMP=`,
      { headers }
    )
    .then((getResponse) => {
      loggingResponse(getResponse);
      const formData = collectHiddenValues(getResponse.data);

      formData.username = event.queryStringParameters?.username;

      client
        .post<string>(
          `https://${process.env.HUE_AUTH_DOMAIN}/saml/login`,
          formData,
          { headers }
        )
        .then((postResponse) => {
          loggingResponse(postResponse);
          const postFormData = collectHiddenValues(postResponse.data);

          callback(null, {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(postFormData),
          });
        })
        .catch((error) => {
          console.log("network error.");
          console.error(error);
          console.log(error.status);
        });
    })
    .catch((error) => {
      console.log("network error.");
      console.error(error);
      console.log(error.status);
    });
};

function collectHiddenValues(data: string): { [key: string]: string } {
  const hiddenMatcher =
    /<input type=\"hidden\" name=\"(.*?)\" value=\"(.*?)\"( \/)*>/g;
  const hiddens = data.match(hiddenMatcher);
  const hiddenValues: { [key: string]: string } = {};

  if (!hiddens) {
    return {};
  }

  for (const hidden of hiddens) {
    const name = hidden.match(/name=\"(.*?)\"/)[1];
    const value = hidden.match(/value=\"(.*?)\"/)[1];
    hiddenValues[name] = value;
  }

  return hiddenValues;
}

function loggingResponse(response: AxiosResponse<string>): void {
  console.log(`status: ${response.status}`);
  console.log(`Location: ${response.headers.Location}`);
  console.log(response.data);
}
