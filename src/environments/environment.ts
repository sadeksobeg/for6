import { Environment } from '@abp/ng.core';

const baseUrl = 'http://localhost:4200';

export const environment = {
  production: false,
  application: {
    baseUrl,
    name: 'MediaManagement',
    logoUrl: '',
  },
  oAuthConfig: {
    issuer: 'https://localhost:44323/',
    redirectUri: baseUrl,
    clientId: 'MediaManagement_App',
    responseType: 'code',
    scope: 'offline_access MediaManagement',
    requireHttps: true,
  },
  apis: {
    default: {
      url: 'https://localhost:44323',
      rootNamespace: 'MediaManagement',
    },
  },

  navItems: [
    {
      title: 'Media',
      route: '/media',
      iconClass: 'fas fa-photo-video',
    },
    {
      title: 'Studio',
      route: '/studio',
      iconClass: 'fas fa-film',
    },
  ],
} as Environment;
