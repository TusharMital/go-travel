const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

class ApiClient {
  private getAccessToken(): string | null {
    return localStorage.getItem('travel_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('travel_refresh_token');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('travel_access_token', accessToken);
    localStorage.setItem('travel_refresh_token', refreshToken);
  }

  public clearTokens() {
    localStorage.removeItem('travel_access_token');
    localStorage.removeItem('travel_refresh_token');
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration & automatic refresh
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            this.setTokens(data.accessToken, data.refreshToken);
            headers['Authorization'] = `Bearer ${data.accessToken}`;
            response = await fetch(url, { ...options, headers });
          } else {
            this.clearTokens();
          }
        } catch {
          this.clearTokens();
        }
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error: ApiError = data?.error || {
        code: 'HTTP_ERROR',
        message: response.statusText || 'An unexpected error occurred',
      };
      throw error;
    }

    return data as T;
  }

  setSession(accessToken: string, refreshToken: string) {
    this.setTokens(accessToken, refreshToken);
  }
}

export const api = new ApiClient();
