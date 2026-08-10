export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body: ApiEnvelope<T> = await res.json().catch(() => ({ success: false, error: "Invalid server response" }));

  if (!res.ok || !body.success) {
    throw new ApiError(body.error ?? "Something went wrong.", res.status, body.details);
  }

  return body.data as T;
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(path, { method: "POST", credentials: "include", body: form });
  const body: ApiEnvelope<T> = await res.json().catch(() => ({ success: false, error: "Invalid server response" }));
  if (!res.ok || !body.success) {
    throw new ApiError(body.error ?? "Upload failed.", res.status, body.details);
  }
  return body.data as T;
}
