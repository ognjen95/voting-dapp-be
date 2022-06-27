import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('candidates')
  getCandidates() {
    return this.appService.checkForCandidates();
  }
  @Get('winners')
  getWinners() {
    return this.appService.getWinners();
  }
  @Post('vote')
  // make DTO
  vote(@Body() data: { address: string; userVote: number; amount: number }) {
    return this.appService.vote(data.address, data.userVote, data.amount);
  }
}
