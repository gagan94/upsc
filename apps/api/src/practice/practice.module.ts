import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller';
import { QuestionsAdminController } from './questions.admin.controller';
import { QuestionsService } from './questions.service';
import { ReportsAdminController } from './reports.admin.controller';
import { ReviewService } from './review.service';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [QuestionsAdminController, ReportsAdminController, PracticeController],
  providers: [QuestionsService, SessionsService, ReviewService],
  exports: [QuestionsService, SessionsService],
})
export class PracticeModule {}
