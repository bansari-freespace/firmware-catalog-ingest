import { bootstrap } from '@libs/bootstrap';
import { FirmwareReleaseEvent } from '@type';
import { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import { LoggingService } from 'wf-utils/logging-service';

const initPromise = bootstrap();

export const processor = async (event: FirmwareReleaseEvent) => {
  const { logger } = await initPromise;
  logger.info('firmware release event', JSON.stringify(event));
  // TODO: ingest the release into the firmware catalog.
};

const processRecord = async (record: SQSRecord) => {
  const { logger } = await initPromise;
  logger.info(JSON.stringify({
    messageId: record.messageId,
    receiveCount: record.attributes.ApproximateReceiveCount,
    body: record.body,
  }));

  let event: FirmwareReleaseEvent;
  try {
    event = JSON.parse(record.body);
  } catch (e) {
    logger.error(JSON.stringify({ id: record.messageId, type: 'invalid JSON body', error: (e as Error).message }));
    throw e;
  }

  try {
    await processor(event);
  } catch (e) {
    logger.error(JSON.stringify({ id: record.messageId, type: (e as Error).message }));
    throw e;
  }
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  // Log the raw event before bootstrap, so it is logged even if bootstrap fails.
  LoggingService.GetLogger().info(
    `received ${event.Records.length} record(s)`,
    JSON.stringify(event),
  );

  const { logger, batchProcessor } = await initPromise;

  try {
    return await batchProcessor.handleQueueBatch(event.Records, processRecord);
  } catch (error) {
    logger.error(error);
    throw Error(`Error while executing handler ${error}`);
  }
};

export default handler;
