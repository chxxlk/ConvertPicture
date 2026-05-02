// deklarasi API_BASE
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export async function uploadFile(file: File, targetFormat: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('targetFormat', targetFormat)
  const res = await fetch(`${API_BASE}/api/convert`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Upload Failed')
  const { jobId } = await res.json()
  return jobId
}

export async function getJobStatus(jobId: string): Promise<{ status: string; progress?: number }> {
  const res = await fetch(`${API_BASE}/api/poll/${jobId}`)
  if (!res.ok) throw new Error('Status check Failed')
  return res.json()
}

export async function downloadResult(jobId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/download/${jobId}`)
  if (!res.ok) throw new Error('Download Failed')
  return res.blob()
}
