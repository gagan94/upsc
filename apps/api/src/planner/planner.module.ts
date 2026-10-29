import { Module } from '@nestjs/common';
import { MeModule } from '../me/me.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [MeModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class PlannerModule {}
