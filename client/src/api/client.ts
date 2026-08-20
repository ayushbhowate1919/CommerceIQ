export type PaginationMetadata = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export async function request<T>(
  path: string,
  options: RequestInit = {},
  explicitToken?: string,
): Promise<{ data: T; pagination?: PaginationMetadata }> {
  const token = explicitToken ?? localStorage.getItem('commerceiq.authToken') ?? undefined;
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = (await response.json()) as {
    success: boolean;
    data?: T;
    pagination?: PaginationMetadata;
    error?: { message: string; code: string };
  };

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Request failed.');
  }

  return {
    data: payload.data as T,
    pagination: payload.pagination,
  };
}
