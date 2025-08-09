import axios, { AxiosInstance, AxiosResponse } from "axios";
import { JSDOM, VirtualConsole } from 'jsdom';
import queryString from 'query-string';
import { CookieJar, MemoryCookieStore } from "tough-cookie";

// axiosCookiejarSupport(axios);

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

class DebugConsole {
    private logs: Array<{ level: string, args: any[] }> = [];

    constructor() { }

    public log(...args: any[]): void {
        this.logs.push({ level: 'log', args });
        console.log('[JSDOM]', ...args);
    }

    public warn(...args: any[]): void {
        this.logs.push({ level: 'warn', args });
        console.warn('[JSDOM Warning]', ...args);
    }

    public error(...args: any[]): void {
        this.logs.push({ level: 'error', args });
        console.error('[JSDOM Error]', ...args);
    }

    public info(...args: any[]): void {
        this.logs.push({ level: 'info', args });
        console.info('[JSDOM Info]', ...args);
    }

    public debug(...args: any[]): void {
        this.logs.push({ level: 'debug', args });
        console.debug('[JSDOM Debug]', ...args);
    }

    public getLogs(): Array<{ level: string, args: any[] }> {
        return this.logs;
    }

    public clear(): void {
        this.logs = [];
    }
}

class WorksClient {

    private client: AxiosInstance;

    public constructor(private domain: string, private authDomain: string) {
        // this.client = axios.create({
        //     jar: true,
        //     withCredentials: true,
        // });
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

    public async performMobileLogin(username: string, password: string): Promise<[string, { [key: string]: string }]> {
        try {
            return new Promise(async (resolve, reject) => {
                console.log('username:', username);
                const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
                    try {
                    const debugConsole = new DebugConsole();
                    const virtualConsole = new VirtualConsole();

                    virtualConsole.on('log', (...args: any[]) => {
                        debugConsole.log(...args);
                    });
                    virtualConsole.on('warn', (...args: any[]) => {
                        debugConsole.warn(...args);
                    });
                    virtualConsole.on('error', (...args: any[]) => {
                        debugConsole.error(...args);
                    });
                    virtualConsole.on('debug', (...args: any[]) => {
                        debugConsole.debug(...args);
                    });
                    virtualConsole.on('info', (...args: any[]) => {
                        debugConsole.info(...args);
                    });
            
                    const cookieJar = new CookieJar(new MemoryCookieStore);
                    const dom = await JSDOM.fromURL(this.loginEndpoint, {
                        referrer: this.timeRecEndPoint,
                        userAgent: mobileUserAgent,
                        pretendToBeVisual: true,
                        runScripts: 'dangerously',
                        resources: 'usable',
                        cookieJar: cookieJar,
                        virtualConsole: virtualConsole,
                    });

                    const { window } = dom;
                    const { document } = window;

                    console.log('Waiting for #root and #app elements...');
                    const app = await this.waitForElement(document, '#root > #app');
                    console.log('Required elements found:', this.debugElement(app));

                    cookieJar.getCookieString(this.loginEndpoint).then((cookie) => { console.log('Cookie:', cookie); });
                    console.log('Looking for form elements...');
                    const form = app.querySelector('form') as HTMLFormElement | null;
                    const usernameInput = app.querySelector('input[name="username"]') as HTMLInputElement | null;
                    const passwordInput = app.querySelector('input[name="password"]') as HTMLInputElement | null;

                    if (!form || !usernameInput || !passwordInput) {
                        throw new Error('Required form elements not found in #app');
                    }

                    console.log('Form elements found, proceeding with login...');

                    usernameInput.value = username;
                    passwordInput.value = password;

                    const formData = {
                        username: username,
                        formAction: form.action || this.loginEndpoint
                    };

                    const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
                    hiddenInputs.forEach((input: HTMLInputElement) => {
                        if (input.name && input.value) {
                            formData[input.name] = input.value;
                        }
                    });

                    console.log('Form action:', formData.formAction);
                    console.log('Collected form data:', formData);

                    resolve(formData);
                } catch (error) {
                    console.error('JSDOM processing error:', error);
                    reject(error);
                }
            });
        } catch (error) {
            console.error('Login request error:', error);
            throw error;
        }
    }

    private async waitForElement(
        document: Document,
        selector: string,
        timeout: number = 5000,
        interval: number = 100
    ): Promise<Element> {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkElement = () => {
                const element = document.querySelector(selector);

                if (element) {
                    resolve(element);
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Timeout waiting for element: ${selector}`));
                    return;
                }

                setTimeout(checkElement, interval);
            };

            checkElement();
        });
    }

    private triggerEvent(element: Element, eventType: string): void {
        const event = new Event(eventType, { bubbles: true });
        element.dispatchEvent(event);
    }

    private debugElement(element: Element, indent: number = 0): string {
        const indentStr = '  '.repeat(indent);
        let output = '';

        output += `${indentStr}<${element.tagName.toLowerCase()}`;

        Array.from(element.attributes).forEach(attr => {
            output += ` ${attr.name}="${attr.value}"`;
        });
        output += '>\n';

        const textContent = element.textContent?.trim();
        if (textContent && !element.children.length) {
            output += `${indentStr}  ${textContent}\n`;
        }

        Array.from(element.children).forEach(child => {
            output += this.debugElement(child, indent + 1);
        });

        output += `${indentStr}</${element.tagName.toLowerCase()}>\n`;

        return output;
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
                const [action, formData] = form;
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