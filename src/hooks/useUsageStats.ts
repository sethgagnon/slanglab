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
  isAdmin?: boolean;
}

export const useUsageStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats>({
    searchesUsed: 0,
    searchesLimit: 3, // Default for Free plan
    creationsUsed: 0,
    creationsLimit: 1, // Default for Free plan (weekly)
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
        // Get user profile for plan and role info
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, role')
          .eq('user_id', user.id)
          .single();

        // Check if user is admin
        const isAdmin = profile?.role === 'admin';
        
        // Normalize plan name to proper case for frontend consistency
        const rawPlan = profile?.plan || 'free';
        const userPlan = rawPlan === 'free' ? 'Free' : 
                        rawPlan === 'searchpro' ? 'SearchPro' : 
                        rawPlan === 'labpro' ? 'LabPro' : rawPlan;

        // Get today's usage for searches (daily) and weekly usage for creations
        const today = new Date().toISOString().split('T')[0];
        
        // Get weekly creation usage
        const { data: weekStartData } = await supabase
          .rpc('get_week_start')
          .maybeSingle();
        
        const weekStart = weekStartData;
        
        // Get daily limits for searches
        const { data: dailyLimits } = await supabase
          .from('limits')
          .select('lookups_used')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        // Get weekly limits for creations
        const { data: weeklyLimits } = await supabase
          .from('limits')
          .select('generations_used')
          .eq('user_id', user.id)
          .eq('week_start_date', weekStart)
          .maybeSingle();

        // Set limits based on role and plan
        let searchesLimit = 3; // Free plan default
        let creationsLimit = 1; // Free plan gets 1 per week

        // Admin users get unlimited everything
        if (isAdmin) {
          searchesLimit = -1; // Unlimited
          creationsLimit = -1; // Unlimited
        } else if (userPlan === 'SearchPro') {
          searchesLimit = -1; // Unlimited
          creationsLimit = 1; // Still 1 per week for SearchPro
        } else if (userPlan === 'LabPro') {
          searchesLimit = -1; // Unlimited
          creationsLimit = -1; // Unlimited for LabPro
        }

        setStats({
          searchesUsed: dailyLimits?.lookups_used || 0,
          searchesLimit,
          creationsUsed: weeklyLimits?.generations_used || 0,
          creationsLimit,
          plan: isAdmin ? 'Admin' : userPlan,
          loading: false,
          isAdmin
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