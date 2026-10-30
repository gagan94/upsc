import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser } from '../identity/decorators';
import type { UserView } from '../identity/users.service';
import { HomeService } from './home.service';

@Controller('home')
@UseGuards(AuthGuard)
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  get(@CurrentUser() user: UserView) {
    return this.home.home(user);
  }
}
