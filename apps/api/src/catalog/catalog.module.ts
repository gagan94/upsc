import { Module } from '@nestjs/common';
import { AdminSyllabusController } from './admin-syllabus.controller';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController, AdminSyllabusController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
