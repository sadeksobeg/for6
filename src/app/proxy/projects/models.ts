import type { AuditedEntityDto } from '@abp/ng.core';

export interface CreateUpdateProjectDto {
  title: string;
  description?: string;
}

export interface ProjectDto extends AuditedEntityDto<string> {
  title?: string;
  description?: string;
  userId?: string;
}
