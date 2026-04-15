import { useState, useEffect } from 'react';
import { MenuData } from '@/models/MenuItem';
import { fetchData } from '@/config/api';

export function useMenu() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData<MenuData>('/menu')
      .then(data => {
        setMenu(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { menu, loading, error };
}
