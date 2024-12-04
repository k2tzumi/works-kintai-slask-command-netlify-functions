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

abstract class BaseError extends Error {
    constructor(m: string) {
        super(m);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

class AuthenticationError extends BaseError {
    constructor(m: string) { super(m); }
}

class WorksClientError extends Error {
    constructor(m: string) { super(m); }
}

class WorksClient {

    private client: AxiosInstance;

    public constructor(private domain: string, private authDomain: string) {
        this.client = axios.create({
            jar: true,
            withCredentials: true,
        });
     }

    public doPreLogin(username: string, password: string): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, reject) => {
            this.authnRequest().then((formData) => {
                formData.username = username;
                return this.inputUserName(formData);
            })
            .then((formData) => {
                formData.password = password;
                return this.inputPassword(formData);
            })
            .then((formData) => {
                resolve(formData);
            }).catch((error) => {
                if (error instanceof Error) {
                    console.error("doPreLogin error message:", error.message);
                    console.error("stack trace:", error.stack);
                  } else { 
                    console.error("unknown error:", error);
                  }              
                reject(error);
            });
        });
    }

    private doLogin(username: string, password: string): Promise<[string, { [key: string]: string }]> {
        return new Promise<[string, { [key: string]: string }]>((resolve, reject) => {
            this.doPreLogin(username, password).then((formData) => {
                return this.redirectWithSAMLart(formData);
            }).then((form) => {
                resolve(form);
            }).catch((error) => {
                if (error instanceof Error) {
                    console.error("doLogin error message:", error.message);
                    console.error("stack trace:", error.stack);
                  } else { 
                    console.error("unknown error:", error);
                  }
                  reject(error);
            });
        });
    }

    public doPunchIn(username: string, password: string, date?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.doLogin(username, password).then((form) => {
                const [action, formData] = form;
                return this.punch(action, formData, PUNCHIN, date);
            }).then((message) => {
                resolve(message);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    public doPunchOut(username: string, password: string, date?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.doLogin(username, password).then((form) => {
                const [ action, formData ] = form;
                return this.punch(action, formData, PUNCHIOUT, date);
            }).then((message) => {
                resolve(message);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    private punch(action: string, formData: { [key: string]: string }, submit: Submit, date?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            formData.submit = submit;
            if (date) {
                formData["ki-date"] = date;
            }

            this.client
                .post<string>(
                    `${this.postTimeRecBaseURL}${action}`,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    const message = this.collectInfoMessage(response.data);

                    if (message) {
                        resolve(message);
                    } else {
                        this.loggingResponse(response);
                        reject("Unkonw response.");
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
                    this.postTimeRecBaseURL,
                    { headers: this.headers }
                )
                .then((response) => {
                    const hiddenValue = this.collectHiddenValues(response.data);
                    console.info("hiddenValue:", hiddenValue);
                    resolve(hiddenValue);
                })
                .catch((error) => {
                    if (error instanceof Error) {
                        console.error("authnRequest error message:", error.message);
                        console.error("stack trace:", error.stack);
                      } else { 
                        console.error("unknown error:", error);
                      }

                    reject(error);
                });
        });
    }

    private inputUserName(formData: { [key: string]: string }): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, reject) => {
            this.client
                .post<string>(
                    this.loginEndpoint,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    const error = this.collectFormError(response.data);
                    if (error) {
                        reject(new WorksClientError(error));
                    }
                    resolve(this.collectHiddenValues(response.data));
                })
                .catch((error) => {
                    if (error instanceof Error) {
                        console.error("inputUserName error message:", error.message);
                        console.error("stack trace:", error.stack);
                    } else { 
                        console.error("unknown error:", error);
                    }

                    reject(error);
                });
        });
    }
    
    private inputPassword(formData: { [key: string]: string }): Promise<{ [key: string]: string }> {
        return new Promise<{ [key: string]: string }>((resolve, reject) => {
            this.client
                .post<string>(
                    this.loginEndpoint,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    const error = this.collectFormError(response.data);
                    if (error) {
                        reject(new AuthenticationError(error));
                    } else {
                        const fromData = this.collectHiddenValues(response.data);
                        if (fromData.SAMLResponse) {
                            resolve(fromData);
                        } else {
                            this.loggingResponse(response);
                            reject(new AuthenticationError("Login faild."));
                        }
                    }
                })
                .catch((error) => {
                    if (error instanceof Error) {
                        console.error("inputPassword error message:", error.message);
                        console.error("stack trace:", error.stack);
                    } else { 
                        console.error("unknown error:", error);
                    }

                    reject(error);
                });
        });
    }

    private redirectWithSAMLart(formData: { [key: string]: string }): Promise<[string, { [key: string]: string }]> {
        return new Promise<[string, { [key: string]: string }]>((resolve, reject) => {
            this.client
                .post<string>(
                    this.timeRecEndPoint,
                    queryString.stringify(formData),
                    { headers: this.headers }
                )
                .then((response) => {
                    const action = this.collecFormAction(response.data);
                    const formData = this.collectHiddenValues(response.data);

                    if (!action || Object.keys(formData).length === 0) {
                        this.loggingResponse(response);
                        reject(new WorksClientError("HTML parse error."));
                    } else {
                        resolve([action, formData]);
                    }
                })
                .catch((error) => {
                    if (error instanceof Error) {
                        console.error("redirectWithSAMLart error message:", error.message);
                        console.error("stack trace:", error.stack);
                    } else { 
                        console.error("unknown error:", error);
                    }

                    reject(error);
                });
        });
    }

    private get loginEndpoint(): string {
        return `https://${process.env.HUE_AUTH_DOMAIN}/login`;
    }

    private get timeRecEndPoint(): string {
        return `https://${this.domain}/self-workflow/cws/mbl/MblActInputTimeRec`;
    }

    private get postTimeRecBaseURL(): string {
        return `https://${this.domain}/self-workflow/cws/mbl/`;
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
            return this.collectSecondHiddenValues(data);
        }

        for (const hidden of hiddens) {
            const name = hidden.match(/name=\"(.*?)\"/i)[1];
            const value = hidden.match(/value=\"(.*?)\"/i)[1];
            hiddenValues[name] = value;
        }

        return hiddenValues;
    }

    private collectSecondHiddenValues(data: string): { [key: string]: string } {
        const hiddenMatcher =
            /(<input\s+type="hidden"\s+name="(?<hiddenName>[^"]+)"\s*\/>)/ig;
        const matches = data.match(hiddenMatcher) || [];
        const hiddenValues: { [key: string]: string } = {};

        for (const match of matches) {
            const nameMatch = match.match(/name="([^"]+)"/);
            if (nameMatch && nameMatch[1]) {
                hiddenValues[nameMatch[1]] = '';
            }    
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
            /<div class=\"alert alert\-success\" >(.*?)<\/div>/ig;
        const message = data.match(messageMatcher);

        if (message) {
            return message[0].match(/ >(.*?)<\/div>/)[1].replace("<br>", "\n");
        } else {
            return null;
        }
    }

    private collecFormAction(data: string): string | null {
        const formMatcher =
            /<form action=\"(.*?)\" method=\"post\"/i;
        const form = data.match(formMatcher);
        const hiddenValues: { [key: string]: string } = {};

        if (!form) {
            return null;
        } else {
            return form[1];
        }
    }

    private loggingResponse(response: AxiosResponse<string>): void {
        console.log(`url: ${response.config.url}, status: ${response.status}`);
        console.log(response.data);
    }
}

export { WorksClient, AuthenticationError, WorksClientError };