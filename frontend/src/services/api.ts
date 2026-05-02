// deklarasi API_BASE
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

// uploadFile
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/convert`, { method: 'POST', body: formData })

  if (!res.ok) throw new Error('Upload Failed')
  const { jobId } = await res.json()
  return jobId
}

// jobStatus
export async function getJobStatus(jobId: string): Promise<{ status: string; progress?: number }> {
  const res = await fetch(`${API_BASE}/api/poll/${jobId}`)

  if (!res.ok) throw new Error('Status check Failed')
  return res.json()
}

// downloadResult
export async function downloadResult(jobId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/download/${jobId}`)

  if (!res.ok) throw new Error('Download Failed')
  return res.blob()
}
