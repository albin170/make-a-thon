import { Module } from '@nestjs/common';
import { CustomerOwnershipService } from './customer-ownership.service';

@Module({
  providers: [CustomerOwnershipService],
  exports: [CustomerOwnershipService],
})
export class AuthorizationModule {}
