import type { CreateUpdateProjectDto, ProjectDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  apiName = 'Default';
  

  create = (input: CreateUpdateProjectDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDto>({
      method: 'POST',
      url: '/api/app/project',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/project/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDto>({
      method: 'GET',
      url: `/api/app/project/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ProjectDto>>({
      method: 'GET',
      url: '/api/app/project',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  getUserProjects = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDto[]>({
      method: 'GET',
      url: '/api/app/project/user-projects',
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateProjectDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDto>({
      method: 'PUT',
      url: `/api/app/project/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });

  constructor(private restService: RestService) {}
}
