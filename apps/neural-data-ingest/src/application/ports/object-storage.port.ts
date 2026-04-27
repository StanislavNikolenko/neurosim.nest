export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');

export interface ObjectStoragePort {
  listObjectKeys(bucketName: string, prefix: string): Promise<string[]>;
  downloadObjectToTempFile(
    bucketName: string,
    key: string,
    extension: string,
  ): Promise<string>;
  uploadJsonToBucket(
    bucketName: string,
    key: string,
    jsonContent: string,
  ): Promise<void>;
}
