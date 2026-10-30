import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { parseLimit } from '../common/cursor';
import { AuthGuard } from '../identity/auth.guard';
import { Roles } from '../identity/decorators';
import { RolesGuard } from '../identity/roles.guard';
import { ReviewService } from './review.service';

@Controller('admin/question-reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'content_editor')
export class ReportsAdminController {
  constructor(private readonly review: ReviewService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.review.openReports(parseLimit(limit));
  }
}
