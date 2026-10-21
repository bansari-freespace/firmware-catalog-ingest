// TODO: align with the payload that Jenkins publishes to the firmware release topic.
export interface FirmwareReleaseEvent {
  generation: string;
  version: string;
  s3Key?: string;
}
