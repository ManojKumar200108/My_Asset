import { useCallback, useEffect, useState } from 'react';
import { api } from '../contexts/AuthContext';

export function useAppData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/data/all');
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const guardedLoad = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/data/all');
        if (mounted) setData(res.data?.data || null);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    guardedLoad();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error, refresh: load };
}
