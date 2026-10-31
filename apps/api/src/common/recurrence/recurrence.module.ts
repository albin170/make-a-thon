import { Global, Module } from '@nestjs/common';
import { RecurrenceEngine } from './recurrence.engine';

@Global()
@Module({
  providers: [RecurrenceEngine],
  exports: [RecurrenceEngine],
})
export class RecurrenceModule {}
