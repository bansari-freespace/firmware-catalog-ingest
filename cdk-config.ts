/* eslint-disable max-len */
import { AsyncLambdaProps, FilterScope } from 'wf-cdk/lib/types';
import { fromEnv, fromSsmParameter, importValue } from 'wf-cdk/lib/types/cfn-resolution';
import { ProductGroups, ServiceGroups } from 'wf-cdk/lib/utils/groups';

const serviceName = 'firmware-catalog-ingest';
const ingestQueueName = `${fromEnv('STAGE')}-${serviceName}`;

export const cdkConfig: AsyncLambdaProps = {
  service: serviceName,
  // TODO: confirm the service and product groups for this service.
  ServiceGroup: ServiceGroups.IOT, //change
  ProductGroup: ProductGroups.SMART_BUILDINGS,
  globals: {
    environmentVariables: {
      LOG_LEVEL: fromEnv('LOG_LEVEL', 'ALL'),
      // REDIS_NAMESPACE: fromSsmParameter(`/${fromEnv('STAGE')}/caching-tim-data/redis-namespace`),
      SSM_REDIS_HOST: fromSsmParameter(`${fromEnv('SSM_CACHE_SSM_PATH')}/redis/host`),
      SSM_REDIS_PORT: fromSsmParameter(`${fromEnv('SSM_CACHE_SSM_PATH')}/redis/port`),
      
    },
  },
  resources: {
    sqs: [
      {
        queueName: ingestQueueName,
        // Messages move to the DLQ after this many failed receives.
        maxReceiveCount: 5,
        dlq: {
          alarm: true,
        },
        snsSubscriptions: [
          {
            // wf-cdk builds the ARN from this name and the target region and account.
            topicName: importValue(`${fromEnv('STAGE')}-firmware-test`),
            rawMessageDelivery: true,
            filterPolicyScope: FilterScope.MESSAGE_BODY,
            // filterPolicy: {
            //   generation: {
            //     equals: 'gen4',
            //   },
            // },
          },
        ],
      },
    ],
  },
  functions: {
    catalogIngestProcessor: { // Write logic to ingest in mysql
      reservedConcurrentExecutions: 1,
      timeout: 30,
      memorySize: 256,
      triggers: {
        sqs: [
          {
            queueName: ingestQueueName,
            batchSize: 10,
            maxBatchingWindow: 5,
            // Return only the failed messages to the queue, not the whole batch.
            reportBatchItemFailures: true,
          },
        ],
      },
    },
  },
};
export default cdkConfig;
