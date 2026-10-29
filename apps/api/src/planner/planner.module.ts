import { Module } from '@nestjs/common';
import { MeModule } from '../me/me.module';
import { StudySessionsController } from './study-sessions.controller';
import { StudySessionsService } from './study-sessions.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [MeModule],
  controllers: [TasksController, StudySessionsController],
  providers: [TasksService, StudySessionsService],
  exports: [TasksService, StudySessionsService],
})
export class PlannerModule {}
