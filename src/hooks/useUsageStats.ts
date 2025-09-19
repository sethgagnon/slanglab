import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UsageStats {
  searchesUsed: number;
  searchesLimit: number;
  creationsUsed: number;
  creationsLimit: number;
  plan: string;
  loading: boolean;
}

export const useUsageStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats>({
    searchesUsed: 0,
    searchesLimit: 3, // Default for Free plan
    creationsUsed: 0,
    creationsLimit: 0, // Default for Free plan
    plan: 'Free',
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        // Anonymous user - check localStorage for usage
        const anonymousSearches = localStorage.getItem('anonymous_searches') || '0';
        setStats({
          searchesUsed: parseInt(anonymousSearches),
          searchesLimit: 1, // Anonymous users get 1 free search
          creationsUsed: 0,
          creationsLimit: 0,
          plan: 'Anonymous',
          loading: false
        });
        return;
      }

      try {
        // Get user profile for plan info
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('user_id', user.id)
          .single();

        const userPlan = profile?.plan || 'Free';

        // Get today's usage
        const today = new Date().toISOString().split('T')[0];
        const { data: limits } = await supabase
          .from('limits')
          .select('lookups_used, creations_used')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        // Set limits based on plan
        let searchesLimit = 3; // Free plan default
        let creationsLimit = 0; // Free plan default

        if (userPlan === 'SearchPro') {
          searchesLimit = -1; // Unlimited
          creationsLimit = 0;
        } else if (userPlan === 'LabPro') {
          searchesLimit = -1; // Unlimited
          creationsLimit = 25;
        }

        setStats({
          searchesUsed: limits?.lookups_used || 0,
          searchesLimit,
          creationsUsed: limits?.creations_used || 0,
          creationsLimit,
          plan: userPlan,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching usage stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, [user]);

  return stats;
};