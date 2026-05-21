import { API_BASE_URL, getAuthHeaders } from './config'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      throw new Error(`API GET ${path} failed: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`API POST ${path} failed: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
