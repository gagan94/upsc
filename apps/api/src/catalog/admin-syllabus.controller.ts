import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../identity/auth.guard';
import { Roles } from '../identity/decorators';
import { RolesGuard } from '../identity/roles.guard';
import { CatalogService } from './catalog.service';

@Controller('admin/syllabus-nodes')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'content_editor')
export class AdminSyllabusController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  async list() {
    return { nodes: await this.catalog.listPublishedSyllabusNodes() };
  }
}
