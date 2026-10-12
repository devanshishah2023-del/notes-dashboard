const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

/** Every failed request becomes an ApiError, so UI code handles one shape. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Turn FastAPI's `detail` (a string, or a list of validation errors) into readable text. */
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ');
    }
  } catch {
    // Body was not JSON; fall through to the status text.
  }
  return res.statusText || `Request failed (${res.status})`;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    // fetch only rejects on network failure (server down, CORS, offline).
    throw new ApiError('Could not reach the server. Is the backend running?', 0);
  }

  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
