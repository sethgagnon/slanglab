import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Creation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  creation_type: string;
  vibe?: string;
  created_at: string;
}

export const useCreations = (limit?: number) => {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadCreations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('creations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setCreations(data || []);
    } catch (error) {
      console.error('Error loading creations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreations();
  }, [user]);

  const deleteCreation = async (creationId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('creations')
        .delete()
        .eq('id', creationId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update local state by removing the deleted creation
      setCreations(prev => prev.filter(creation => creation.id !== creationId));
    } catch (error) {
      console.error('Error deleting creation:', error);
      throw error;
    }
  };

  return { creations, loading, refresh: loadCreations, deleteCreation };
};