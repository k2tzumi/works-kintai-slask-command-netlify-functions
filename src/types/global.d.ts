/// <reference types="node" />

declare namespace NodeJS {
    interface ProcessEnv {
        readonly HUE_DOMAIN: string,
        readonly HUE_AUTH_DOMAIN: string;
    }
}
