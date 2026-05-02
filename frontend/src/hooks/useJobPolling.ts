import { useState, useEffect, useRef } from 'react';
import { getJobStatus } from '../services/api';

export type JobPollingStatus = 'waiting' | 'processing' | 'done' | 'failed';

export interface JobPollingResult {
  status: JobPollingStatus | null;
  progress: number;
  error: string | null;
  jobData: unknown;
  isPolling: boolean;
}

const POLLING_INTERVAL = 2000; // 2 seconds
const POLLING_TIMEOUT = 5 * 60 * 1000; // 5 minutes max polling
const STUCK_JOB_THRESHOLD = 2 * 60 * 1000; // 2 minutes without progress

export function useJobPolling(jobId: string | null): JobPollingResult {
  const [status, setStatus] = useState<JobPollingStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<unknown>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef({ value: 0, timestamp: 0 });
  const pollCountRef = useRef(0);
  const prevJobIdRef = useRef<string | null>(null);

  // Derive isPolling from status
  const isCurrentlyPolling = jobId !== null && status !== null && status !== 'done' && status !== 'failed';

  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    cleanup();

    // Handle jobId change to null
    if (prevJobIdRef.current !== null && jobId === null) {
      prevJobIdRef.current = jobId;
      return;
    }

    prevJobIdRef.current = jobId;

    if (!jobId) {
      return;
    }

    // Initialize refs for new job
    lastProgressRef.current = { value: 0, timestamp: Date.now() };
    pollCountRef.current = 0;

    // Reset state for new job - must be done synchronously when jobId changes
    // This is a valid use case: we need to reset state before starting new polling
    /* eslint-disable react-hooks/set-state-in-effect */
    setStatus(null);
    setProgress(0);
    setError(null);
    setJobData(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const poll = async () => {
      try {
        pollCountRef.current += 1;
        const data = await getJobStatus(jobId);

        // Map backend BullMQ status to hook status
        let mappedStatus: JobPollingStatus;
        switch (data.status) {
          case 'waiting':
          case 'delayed':
            mappedStatus = 'waiting';
            break;
          case 'active':
            mappedStatus = 'processing';
            break;
          case 'completed':
            mappedStatus = 'done';
            break;
          case 'failed':
            mappedStatus = 'failed';
            break;
          default:
            mappedStatus = 'waiting';
        }

        // Check for stuck job (active but no progress for too long)
        if (mappedStatus === 'processing') {
          const currentProgress = data.progress || 0;
          const now = Date.now();

          if (currentProgress > lastProgressRef.current.value) {
            lastProgressRef.current = { value: currentProgress, timestamp: now };
          } else if (now - lastProgressRef.current.timestamp > STUCK_JOB_THRESHOLD) {
            setError('Job appears stuck - no progress for 2 minutes');
            setStatus('failed');
            cleanup();
            return;
          }
        }

        setStatus(mappedStatus);
        setProgress(data.progress || 0);
        setError(null);
        setJobData(data);

        // Stop polling if done or failed
        if (data.status === 'completed' || data.status === 'failed') {
          cleanup();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to check job status';

        // Provide clear error messages based on error type
        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
          setError('Network error - unable to reach server. Please check your connection.');
        } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
          setError('Request timeout - server is taking too long to respond.');
        } else if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
          setError('Server error - please try again later.');
        } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          setError('Job not found - it may have expired or been removed.');
        } else if (errorMsg.includes('Status check Failed')) {
          setError('Unable to check job status - server error.');
        } else {
          setError(`Unable to check status: ${errorMsg}`);
        }

        // Don't stop polling on network errors, keep trying
        // But after too many attempts, suggest retry
        if (pollCountRef.current > 30) { // ~1 minute of retries
          setError(prev => prev ? `${prev} Please try uploading again.` : 'Connection issues - please try again.');
        }
      }
    };

    // Set timeout for maximum polling duration
    timeoutRef.current = setTimeout(() => {
      setError('Job processing timeout - took longer than 5 minutes. Please try again.');
      setStatus('failed');
      cleanup();
    }, POLLING_TIMEOUT);

    // Start polling
    poll(); // Initial poll
    intervalRef.current = setInterval(poll, POLLING_INTERVAL);

    // Cleanup on unmount or jobId change
    return () => {
      cleanup();
    };
  }, [jobId]);

  return { status, progress, error, jobData, isPolling: isCurrentlyPolling };
}
