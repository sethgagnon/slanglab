import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FavoriteItem {
  id: string;
  term: string;
  meaning: string;
  confidence: string;
  tone: string;
  created_at: string;
}

export const useFavorites = (limit: number = 5) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadFavorites = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('user-history', {
          body: {
            filters: { search: '', tone: 'all', dateRange: 'all' },
            page: 1,
            limit: 1000 // Get all to filter favorites
          }
        });

        if (error) throw error;

        // Get only favorites and limit them
        const favoritesData = data.favorites?.slice(0, limit) || [];
        setFavorites(favoritesData);
      } catch (error) {
        console.error('Error loading favorites:', error);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user, limit]);

  return { favorites, loading };
};