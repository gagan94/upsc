import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller';
import { QuestionsAdminController } from './questions.admin.controller';
import { QuestionsService } from './questions.service';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [QuestionsAdminController, PracticeController],
  providers: [QuestionsService, SessionsService],
  exports: [QuestionsService, SessionsService],
})
export class PracticeModule {}
