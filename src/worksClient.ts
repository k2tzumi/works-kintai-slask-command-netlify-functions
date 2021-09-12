import axios, { AxiosInstance, AxiosResponse } from "axios";
import axiosCookiejarSupport from "axios-cookiejar-support";
import * as queryString from "query-string";

axiosCookiejarSupport(axios);

// axios.interceptors.request.use(request => {
//   console.log('Starting Request: ', request);
//   return request;
// });

// axios.interceptors.response.use(response => {
//   console.log('Response: ', response);
//   return response;
// });

const PUNCHIN = "　　　出勤　　　";
const PUNCHIOUT = "　　　退勤　　　";
type Submit = typeof PUNCHIN | typeof PUNCHIOUT;

class WorksClient {

    private client: AxiosInstance;

    public constructor(private domain: string, private authDomain: string) {
        this.client = axios.create({
            jar: true,
            withCredentials: true,
        });
     }

    public doLogin(username: string, password: string): Promise<WorksClient> {
        return new Promise<WorksClient>((resolve, reject) => {
            this.authnRequest().then((formData) => {
                formData.username = username;
                return this.inputUserName(formData);
            })
                .then((formData) => {
                    formData.password = password;
                    return this.inputPassword(formData);
                })
                .then((formData) => {
                    return this.redirectWithSAMLart(formData);
                })
                .then((formData) => {
                    resolve(this);
                }).catch((error) => {
                    reject(error);
                });
        });
    }

    public doPunchIn(date?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.inputTimeRec().then((formData) => {
                return this.punch(formData, PUNCHIN, date);
            }).then((message) => {
                resolve(message);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    public doPunchOut(date?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.inputTimeRec().then((formData) => {
                return this.punch(formData, PUNCHIOUT, date);
            }).then((message) => {
                resolve(message);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    private punch(formData: { [key: string]: string }, submit: Submit, date?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            formData.submit = submit;
            if (date) {
                formData["ki-date"] = date;
            }

            this.client
                .post<string>(
                    this.postTimeRecEndPoint,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    this.loggingResponse(response);
                    const message = this.collectInfoMessage(response.data);

                    if (message) {
                        resolve(message);
                    } else {
                        reject("unkonw response.");
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    private authnRequest(): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, reject) => {
            this.client
                .get<string>(
                    this.loginEndPoint,
                    { headers: this.headers }
                )
                .then((response) => {
                    this.loggingResponse(response);
                    resolve(this.collectHiddenValues(response.data));
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    private inputUserName(formData: { [key: string]: string }): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, rejects) => {
            this.client
                .post<string>(
                    this.samlLoginEndpoint,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    this.loggingResponse(response);
                    const error = this.collectFormError(response.data);
                    if (error) {
                        rejects(error);
                    }
                    resolve(this.collectHiddenValues(response.data));
                })
                .catch((error) => {
                    rejects(error);
                });
        });
    }
    
    private inputPassword(formData: { [key: string]: string }): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, rejects) => {
            this.client
                .post<string>(
                    this.samlLoginEndpoint,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    this.loggingResponse(response);
                    const error = this.collectFormError(response.data);
                    if (error) {
                        rejects(error);
                    }
                    resolve(this.collectHiddenValues(response.data));
                })
                .catch((error) => {
                    rejects(error);
                });
        });
    }

    private redirectWithSAMLart(formData: { [key: string]: string }): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, rejects) => {
            this.client
                .post<string>(
                    this.loginEndPoint,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    this.loggingResponse(response);
                    resolve(this.collectHiddenValues(response.data));
                })
                .catch((error) => {
                    rejects(error);
                });
        });
    }

    private inputTimeRec(): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, rejects) => {
            this.client
                .get<string>(
                    this.timeRecEndPoint,
                    { headers: this.headers }
                )
                .then((response) => {
                    this.loggingResponse(response);
                    resolve(this.collectHiddenValues(response.data));
                })
                .catch((error) => {
                    rejects(error);
                });
        });
    }

    private get loginEndPoint(): string {
        return `https://${this.domain}/self-workflow/cws/mbl/MblActLogin?@REDIRECT=&@REDIRECT=&@JUMP=`;
    }

    private get samlLoginEndpoint(): string {
        return `https://${process.env.HUE_AUTH_DOMAIN}/saml/login`;
    }

    private get timeRecEndPoint(): string {
        return `https://${this.domain}/self-workflow/cws/mbl/MblActInputTimeRec`;
    }

    private get postTimeRecEndPoint(): string {
        return `${this.timeRecEndPoint}}@act=submit`;
    }

    private get headers() {
        return {
            "User-Agent":
                "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; ja-jp) AppleWebKit/533.17.9 (KHTML,like Gecko) Version/5.0.2 Mobile/8C148a Safari/6533.18.5",
            "Content-Type": "application/x-www-form-urlencoded",
        };
    }

    private collectHiddenValues(data: string): { [key: string]: string } {
        const hiddenMatcher =
            /<input type=\"*hidden\"* name=\"(.*?)\" value=\"(.*?)\"( \/)*>/ig;
        const hiddens = data.match(hiddenMatcher);
        const hiddenValues: { [key: string]: string } = {};

        if (!hiddens) {
            return {};
        }

        for (const hidden of hiddens) {
            const name = hidden.match(/name=\"(.*?)\"/i)[1];
            const value = hidden.match(/value=\"(.*?)\"/i)[1];
            hiddenValues[name] = value;
        }

        return hiddenValues;
    }

    private collectFormError(data: string): string | null {
        const errorMatcher =
            /<div class=\"form_error\">(.*?)<\/div>/g;
        const error = data.match(errorMatcher);

        if (error) {
            return error[0].match(/\">(.*?)<\//)[1];
        } else {
            return null;
        }
    }

    private collectInfoMessage(data: string): string | null {
        const messageMatcher =
            /<div align=\"left\" ID=\"InfoMsg\" style=\"color:#006400;\" >(.*?)<\/div>/ig;
        const message = data.match(messageMatcher);

        if (message) {
            return message[0].match(/ >(.*?)<\/div>/)[1].replace("<br>", "\n");
        } else {
            return null;
        }
    }

    private loggingResponse(response: AxiosResponse<string>): void {
        console.log(`url: ${response.config.url}, status: ${response.status}`);
        // console.log(`Location: ${response.headers.Location}`);
        console.log(response.data);
    }
}

export { WorksClient };