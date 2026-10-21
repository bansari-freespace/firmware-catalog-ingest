import * as process from 'process';
import { RedisService } from 'wf-utils';
import { BatchProcessor } from 'wf-utils/aws/sqs-batch-processor';
import { LoggingService } from 'wf-utils/logging-service';
import { LogLevels } from 'wf-utils/types';
import { SSM } from 'wf-utils/aws/ssm';
import { LocalEncryptionService } from 'wf-utils/local-encryption-service';



export async function bootstrap() {
  try {
    const logger = LoggingService.GetLogger();
    const encryptionService = new LocalEncryptionService({ logger });
    const redisService = new RedisService({
      namespace: process.env.REDIS_NAMESPACE,
      logger,
      host: process.env.SSM_REDIS_HOST,
      port: Number(process.env.SSM_REDIS_PORT),
    });

    const ssm = new SSM({
      logger,
      cacheService: redisService,
      encryptionService,
    });

    await ssm.resolveEnvironmentVariables();
    const batchProcessor = new BatchProcessor({ logger });

    return { logger, batchProcessor };
  } catch (err) {
    LoggingService.GetLogger({ level: LogLevels.ERROR }).error(
      'error reading config',
      err,
    );
    throw err;
  }
}

export default bootstrap;
