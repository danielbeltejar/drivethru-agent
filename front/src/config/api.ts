export const API_BASE =
  process.env.NODE_ENV !== 'production'
    ? 'http://localhost:8000'
    : '/api';

export async function fetchData<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error('API request failed');
  }
  return res.json();
}
