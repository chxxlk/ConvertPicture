import { useJobPolling } from '../hooks/useJobPolling';
import { downloadResult } from '../services/api';
import { useState, useEffect, useRef, useCallback } from 'react';

interface JobData {
  outputUrl?: string;
  [key: string]: unknown;
}

interface JobCardProps {
  jobId: string;
  fileName: string;
  previewUrl?: string | null;
  onRetry?: (jobId: string) => void;
  onRemove?: (jobId: string) => void;
}

export default function JobCard({ jobId, fileName, previewUrl, onRetry, onRemove }: JobCardProps) {
  const { status, progress, error, jobData } = useJobPolling(jobId);
  const typedJobData = jobData as JobData | null;
  const [downloading, setDownloading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const downloadFnRef = useRef<(() => Promise<void>) | null>(null);

  // Download function
  const performDownload = useCallback(async () => {
    if (!typedJobData?.outputUrl || downloading) return;

    try {
      setDownloading(true);
      const blob = await downloadResult(jobId);

      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
        setBlobUrl(null);
      }, 1000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [typedJobData?.outputUrl, downloading, jobId, fileName]);

  useEffect(() => {
    downloadFnRef.current = performDownload;
  }, [performDownload]);

  // Auto-download when status changes to 'done'
  useEffect(() => {
    if (status === 'done' && prevStatusRef.current !== 'done' && typedJobData?.outputUrl && !blobUrl) {
      downloadFnRef.current?.();
    }
    prevStatusRef.current = status;
  }, [status, typedJobData?.outputUrl, blobUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const getStatusText = (): string => {
    if (error) return 'Error occurred';
    switch (status) {
      case 'waiting': return 'In queue...';
      case 'processing': return 'Processing...';
      case 'done': return 'Complete!';
      case 'failed': return 'Failed';
      default: return 'Pending...';
    }
  };

  const getStatusColor = (): string => {
    if (error || status === 'failed') return 'text-red-600';
    if (status === 'done') return 'text-green-600';
    if (status === 'processing' || status === 'waiting') return 'text-blue-600';
    return 'text-gray-600';
  };

  const handleRetry = () => {
    if (onRetry) onRetry(jobId);
  };

  // Determine card styling based on state
  const cardBg = error || status === 'failed'
    ? 'bg-red-50 border-red-200'
    : status === 'done'
      ? 'bg-green-50 border-green-200'
      : status === 'processing' || status === 'waiting'
        ? 'bg-blue-50 border-blue-200'
        : 'bg-white border-gray-200';

  return (
    <div className={`border rounded-xl p-4 transition-all duration-300 hover:shadow-md ${cardBg}`}>

      {/* Header with file name and remove button */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Preview thumbnail with animation */}
          <div className={`w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm transition-transform duration-300 ${
            status === 'processing' ? 'animate-pulse' : ''
          }`}>
            {previewUrl ? (
              <img src={previewUrl} alt={fileName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate" title={fileName}>
              {fileName}
            </p>
            <p className={`text-xs mt-1 font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>

        {onRemove && (
          <button
            onClick={() => onRemove(jobId)}
            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2 p-1 hover:bg-red-50 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar - show for waiting and processing states */}
      {(status === 'waiting' || status === 'processing') && (
        <div className="mb-4 animate-fade-in">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                status === 'processing' ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
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
        {status === 'done' && (
          <button
            onClick={performDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        )}

        {(status === 'failed' || error) && onRetry && (
          <button
            onClick={handleRetry}
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
