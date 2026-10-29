import { Module } from '@nestjs/common';
import { QuestionsAdminController } from './questions.admin.controller';
import { QuestionsService } from './questions.service';

@Module({
  controllers: [QuestionsAdminController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class PracticeModule {}
