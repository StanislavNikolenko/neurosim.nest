export interface StorageResult {
  url: string;
  key: string;
  originalName: string;
  size: number;
  type: string;
}

export interface IStorageService {
  uploadFile(file: Express.Multer.File, key?: string): Promise<StorageResult>;
}
