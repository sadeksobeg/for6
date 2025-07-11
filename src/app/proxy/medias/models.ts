import type { EntityDto } from '@abp/ng.core';

export interface CreateUpdateMediaDto {
  title: string;
  description?: string;
  video?: string;
  metaData?: string;
  projectId: string;
  sourceLanguage: string;
  destinationLanguage: string;
  countryDialect?: string;
}

export interface MediaDto extends EntityDto<string> {
  title?: string;
  description?: string;
  video?: string;
  metaData?: string;
  projectId?: string;
  sourceLanguage?: string;
  destinationLanguage?: string;
  countryDialect?: string;
  creationTime?: string;
}
