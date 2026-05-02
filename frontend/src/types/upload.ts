export interface UploadFileItem {
  id: string;
  file: File;
  previewUrl: string | null;
  targetFormat: string; // User must choose this
  status: 'idle' | 'uploading' | 'error' | 'success';
  jobId?: string;
  error?: string;
  jobStatus?: 'waiting' | 'processing' | 'done' | 'failed' | null;
  jobProgress?: number;
  jobError?: string | null;
}
