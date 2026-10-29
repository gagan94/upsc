import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../identity/auth.guard';
import { CatalogService } from './catalog.service';

@Controller('learn')
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('subjects')
  async subjects() {
    return { subjects: await this.catalog.listSubjects() };
  }
}
