import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadFile, downloadResult } from '../services/api';
import { useJobPolling } from '../hooks/useJobPolling';
import type { UploadFileItem } from '../types/upload';
import JSZip from 'jszip';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
];

// Detect source format from file
const detectFormat = (file: File): string => {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return typeMap[file.type] || 'png';
};

export default function UploadZone() {
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [files]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return `Invalid type: ${file.type || 'unknown'}`;
    if (file.size > MAX_FILE_SIZE) return `Too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)`;
    return null;
  };

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFileItem[] = [];
    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      const detectedFormat = detectFormat(file);
      newFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: !error ? URL.createObjectURL(file) : null,
        targetFormat: detectedFormat, // Default to source format
        status: error ? 'error' : 'idle',
        error: error || undefined,
        jobStatus: null,
        jobProgress: 0,
        jobError: null,
      });
    });
    setFiles((prev) => [...prev, ...newFiles]);
    // NO auto-upload - wait for user to choose format and click convert
  }, []);

  const startUpload = useCallback(async (fileItem: UploadFileItem) => {
    setFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'uploading' } : f));
    try {
      const jobId = await uploadFile(fileItem.file, fileItem.targetFormat);
      setFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'success', jobId } : f));
    } catch {
      setFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'error', error: 'Upload failed' } : f));
    }
  }, []);

  const handleConvertAll = useCallback(() => {
    files.forEach((f) => {
      if (f.status === 'idle') {
        startUpload(f);
      }
    });
  }, [files, startUpload]);

  const updateFileFormat = (id: string, format: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, targetFormat: format } : f));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const retryJob = useCallback(async (jobId: string) => {
    const fileItem = files.find((f) => f.jobId === jobId);
    if (fileItem) {
      setFiles((prev) => prev.map((f) => f.jobId === jobId ? { ...f, status: 'idle', error: undefined, jobStatus: null } : f));
      if (fileItem.status === 'error' || fileItem.jobStatus === 'failed') {
        await startUpload(fileItem);
      }
    }
  }, [files, startUpload]);

  const downloadSingleFile = async (fileItem: UploadFileItem, jobStatus: string) => {
    if (!fileItem.jobId || jobStatus !== 'done') return;
    try {
      const blob = await downloadResult(fileItem.jobId);
      const ext = fileItem.targetFormat;
      const baseName = fileItem.file.name.replace(/\.[^/.]+$/, '');
      const fileName = `${baseName}.${ext}`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const downloadAllAsZip = async () => {
    const completedFiles = files.filter((f) => f.status === 'success' && f.jobId);
    if (completedFiles.length === 0) return;
    if (completedFiles.length === 1) {
      await downloadSingleFile(completedFiles[0], 'done');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('converted');
    
    for (const fileItem of completedFiles) {
      try {
        const blob = await downloadResult(fileItem.jobId!);
        const ext = fileItem.targetFormat;
        const baseName = fileItem.file.name.replace(/\.[^/.]+$/, '');
        const fileName = `${baseName}.${ext}`;
        folder?.file(fileName, blob);
      } catch (err) {
        console.error('Failed to add to zip:', fileItem.file.name, err);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-images.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get completed files count

  // Drag & drop handlers with counter to handle nested elements
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = '';
  };

  const idleFilesCount = files.filter(f => f.status === 'idle').length;
  const completedFilesCount = files.filter(f => f.status === 'success').length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg shadow-blue-100'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isDragOver && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-100/50 to-transparent animate-pulse" />
        )}

        <input ref={fileInputRef} type="file" multiple accept={ALLOWED_TYPES.join(',')} className="hidden" onChange={handleFileInputChange} />

        <div className="relative flex flex-col items-center gap-4">
          <div className={`transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
            <svg className={`w-16 h-16 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-700">
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500">
              or <span className="text-blue-600 font-medium hover:text-blue-700 transition-colors">click to browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: JPEG, PNG, WebP, GIF, AVIF (max 10MB per file)
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Files <span className="text-gray-400 font-normal">({files.length})</span>
            </h3>
            <div className="flex items-center gap-3">
              {completedFilesCount > 0 && (
                <button
                  onClick={downloadAllAsZip}
                  className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  Download {completedFilesCount === 1 ? '' : 'All as ZIP'}
                </button>
              )}
              {idleFilesCount > 0 && (
                <button
                  onClick={handleConvertAll}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  Convert {idleFilesCount} File{idleFilesCount > 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => {
                  files.forEach(f => {
                    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                  });
                  setFiles([]);
                }}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((fileItem, index) => (
              <div
                key={fileItem.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <FileItem
                  fileItem={fileItem}
                  onFormatChange={(format) => updateFileFormat(fileItem.id, format)}
                  onRemove={() => removeFile(fileItem.id)}
                  onRetry={fileItem.jobId ? () => retryJob(fileItem.jobId!) : undefined}
                  onDownload={() => downloadSingleFile(fileItem, status || '')}
                  jobStatus={status}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Separate FileItem component with format selector
function FileItem({ fileItem, onFormatChange, onRemove, onRetry, onDownload, jobStatus }: {
  fileItem: UploadFileItem;
  onFormatChange: (format: string) => void;
  onRemove: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  jobStatus?: string | null;
}) {
  const { status, progress, error } = useJobPolling(fileItem.jobId || null);
  const currentStatus = jobStatus || status;

  return (
    <div className={`border rounded-xl p-4 transition-all duration-300 hover:shadow-md ${
      fileItem.status === 'error' || currentStatus === 'failed' ? 'bg-red-50 border-red-200' :
      currentStatus === 'done' ? 'bg-green-50 border-green-200' :
      currentStatus === 'processing' || currentStatus === 'waiting' ? 'bg-blue-50 border-blue-200' :
      'bg-white border-gray-200'
    }`}>
      {/* Header: Preview + Name + Remove */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm ${
          currentStatus === 'processing' ? 'animate-pulse' : ''
        }`}>
          {fileItem.previewUrl ? (
            <img src={fileItem.previewUrl} alt={fileItem.file.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate" title={fileItem.file.name}>
            {fileItem.file.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {(fileItem.file.size / 1024 / 1024).toFixed(1)}MB
          </p>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 hover:bg-red-50 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Format Selector - Only show if idle */}
      {fileItem.status === 'idle' && (
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1.5 block">Convert to:</label>
          <div className="flex gap-1.5 flex-wrap">
            {FORMAT_OPTIONS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => onFormatChange(fmt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  fileItem.targetFormat === fmt.value
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show selected format if not idle */}
      {fileItem.status !== 'idle' && (
        <div className="mb-3">
          <span className="text-xs text-gray-500">Target: </span>
          <span className="text-xs font-medium text-gray-700 uppercase">{fileItem.targetFormat}</span>
        </div>
      )}

      {/* Progress bar */}
      {(currentStatus === 'waiting' || currentStatus === 'processing') && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                currentStatus === 'processing' ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
              }`}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2 bg-red-100 rounded-lg">
          <p className="text-xs text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {currentStatus === 'done' && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-all duration-200 hover:shadow-md active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </button>
        )}

        {(currentStatus === 'failed' || fileItem.status === 'error') && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-all duration-200 hover:shadow-md active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
