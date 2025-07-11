import type { CreateUpdateMediaDto, MediaDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';
import type { IFormFile } from '../microsoft/asp-net-core/http/models';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  apiName = 'Default';
  

  create = (input: CreateUpdateMediaDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MediaDto>({
      method: 'POST',
      url: '/api/app/media',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/media/${id}`,
    },
    { apiName: this.apiName,...config });
  

  downloadVideo = (mediaId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>({
      method: 'POST',
      responseType: 'blob',
      url: `/api/app/media/download-video/${mediaId}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MediaDto>({
      method: 'GET',
      url: `/api/app/media/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<MediaDto>>({
      method: 'GET',
      url: '/api/app/media',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  getProjectMedias = (projectId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MediaDto[]>({
      method: 'GET',
      url: `/api/app/media/project-medias/${projectId}`,
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateMediaDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MediaDto>({
      method: 'PUT',
      url: `/api/app/media/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
  

  uploadVideo = (mediaId: string, video: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MediaDto>({
      method: 'POST',
      url: `/api/app/media/upload-video/${mediaId}`,
      body: video,
    },
    { apiName: this.apiName,...config });

  constructor(private restService: RestService) {}
}
