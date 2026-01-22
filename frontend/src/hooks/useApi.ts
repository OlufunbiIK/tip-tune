import { useState, useEffect } from 'react';
import apiClient from '../utils/api';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  skip?: boolean;
}

function useApi<T>(
  url: string,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError, skip = false } = options;

  const fetchData = async () => {
    if (skip) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<T>(url);
      setData(response.data);
      onSuccess?.(response.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url, skip]);

  return { data, loading, error, refetch: fetchData };
}

export default useApi;
