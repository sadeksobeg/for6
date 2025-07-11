import { Environment } from '@abp/ng.core';

const baseUrl = 'http://localhost:4200';

export const environment = {
  production: true,
  application: {
    baseUrl,
    name: 'MediaManagement_Angular2',
    logoUrl: '',
  },
  oAuthConfig: {
    issuer: 'https://localhost:44389/',
    redirectUri: baseUrl,
    clientId: 'MediaManagement_Angular2_App',
    responseType: 'code',
    scope: 'offline_access MediaManagement_Angular2',
    requireHttps: true
  },
  apis: {
    default: {
      url: 'https://localhost:44389',
      rootNamespace: 'MediaManagement_Angular2',
    },
  },
} as Environment;
