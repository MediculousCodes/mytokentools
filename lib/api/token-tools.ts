const RAW_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000').replace(/\/$/, '') || ''

const buildUrl = (path: string) => `${RAW_BASE_URL}${path}`

type JsonPayload = Record<string, unknown>

async function postJson<T>(path: string, body: JsonPayload): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => {
    throw new Error('Invalid server response')
  })

  if (!response.ok || data?.error) {
    throw new Error(data?.error || response.statusText || 'Request failed')
  }

  return data as T
}

export type TokenFileStat = {
  name: string
  token_count: number
  words: number
  chars: number
}

export type CountTokensResponse = {
  files: TokenFileStat[]
  total_tokens: number
}

type UploadParams = {
  files: File[]
  encoding: string
  onProgress?: (percentage: number) => void
  signal?: AbortSignal
}

export function countTokensFromFiles({
  files,
  encoding,
  onProgress,
  signal,
}: UploadParams): Promise<CountTokensResponse> {
  return new Promise((resolve, reject) => {
    if (!files.length) {
      reject(new Error('No files selected'))
      return
    }

    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`file${index}`, file)
    })
    formData.append('encoding', encoding)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', buildUrl('/api/count-tokens'))

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100)
        onProgress(pct)
      }
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText)
          if (parsed?.error) {
            reject(new Error(parsed.error))
          } else {
            resolve(parsed as CountTokensResponse)
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to parse response'))
        }
      } else {
        reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort()
        reject(new DOMException('Upload aborted', 'AbortError'))
      })
    }

    xhr.send(formData)
  })
}

type AnalyzeResponse = {
  token_count: number
  word_count: number
  tokens: number[]
}

export const analyzeText = (text: string, encoding: string) =>
  postJson<AnalyzeResponse>('/analyze', { text, encoding })

type BatchResponse = {
  results: { token_count: number; word_count: number }[]
}

export const batchTokenize = (texts: string[], encoding: string) =>
  postJson<BatchResponse>('/batch_tokenize', { texts, encoding })

type CompareResponse = {
  results: Record<string, number | string>
}

export const compareTokenizers = (text: string, encodings: string[]) =>
  postJson<CompareResponse>('/compare_tokenizers', { text, encodings })

