import { RoutesService, eLayoutType } from '@abp/ng.core';
import { APP_INITIALIZER } from '@angular/core';

export const APP_ROUTE_PROVIDER = [
  { provide: APP_INITIALIZER, useFactory: configureRoutes, deps: [RoutesService], multi: true },
];

function configureRoutes(routesService: RoutesService) {
  return () => {
    routesService.add([
      {
        path: '/',
        name: '::Menu:Home',
        iconClass: 'fas fa-home',
        order: 1,
        layout: eLayoutType.application,
      },
      {
        path: 'media',
        name: 'Media',
        iconClass: 'fas fa-photo-video', 
        order: 2,
        layout: eLayoutType.application,
      },
      {
        path: 'projects',
        name: 'Projects',
        iconClass: 'fas fa-folder-open', 
        order: 3,
        layout: eLayoutType.application,
      },
      {
        path: 'studio',
        name: 'Studio',
        iconClass: 'fas fa-film', // Using a film icon as an example
        order: 4, // Placing it after Projects
        layout: eLayoutType.application,
      },
    ]);
  };
}
