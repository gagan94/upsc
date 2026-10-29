import { Module } from '@nestjs/common';
import { MeModule } from '../me/me.module';
import { GoalsService } from './goals.service';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { PlannerController } from './planner.controller';
import { StudySessionsController } from './study-sessions.controller';
import { StudySessionsService } from './study-sessions.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [MeModule],
  controllers: [TasksController, StudySessionsController, PlannerController, HomeController],
  providers: [TasksService, StudySessionsService, GoalsService, HomeService],
  exports: [TasksService, StudySessionsService, GoalsService],
})
export class PlannerModule {}
