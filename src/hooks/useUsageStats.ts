import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UsageStats {
  searchesUsed: number;
  searchesLimit: number;
  aiCreationsUsed: number;
  aiCreationsLimit: number;
  manualCreationsUsed: number;
  manualCreationsLimit: number;
  plan: string;
  loading: boolean;
  isAdmin?: boolean;
}

export const useUsageStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats>({
    searchesUsed: 0,
    searchesLimit: 3, // Default for Free plan
    aiCreationsUsed: 0,
    aiCreationsLimit: 1, // Default for Free plan (weekly)
    manualCreationsUsed: 0,
    manualCreationsLimit: 3, // Default for Free plan (weekly)
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
          aiCreationsUsed: 0,
          aiCreationsLimit: 0,
          manualCreationsUsed: 0,
          manualCreationsLimit: 0,
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

        // Get weekly limits for AI and manual creations
        const { data: weeklyLimits } = await supabase
          .from('limits')
          .select('generations_used, manual_generations_used')
          .eq('user_id', user.id)
          .eq('week_start_date', weekStart)
          .maybeSingle();

        // Get daily AI limits for LabPro users
        const { data: dailyAiLimits } = await supabase
          .from('limits')
          .select('generations_used')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        // Set limits based on role and plan
        let searchesLimit = 3; // Free plan default
        let aiCreationsLimit = 1; // Free plan gets 1 AI per week
        let manualCreationsLimit = 3; // Free plan gets 3 manual per week

        // Admin users get unlimited everything
        if (isAdmin) {
          searchesLimit = -1; // Unlimited
          aiCreationsLimit = -1; // Unlimited
          manualCreationsLimit = -1; // Unlimited
        } else if (userPlan === 'SearchPro') {
          searchesLimit = -1; // Unlimited
          aiCreationsLimit = 1; // Still 1 AI per week for SearchPro
          manualCreationsLimit = 3; // Still 3 manual per week for SearchPro
        } else if (userPlan === 'LabPro') {
          searchesLimit = -1; // Unlimited
          aiCreationsLimit = 1; // 1 AI per day for LabPro
          manualCreationsLimit = -1; // Unlimited manual for LabPro
        }

        // For LabPro users, use daily AI limits instead of weekly
        const aiCreationsUsed = userPlan === 'LabPro' && !isAdmin 
          ? dailyAiLimits?.generations_used || 0
          : weeklyLimits?.generations_used || 0;

        setStats({
          searchesUsed: dailyLimits?.lookups_used || 0,
          searchesLimit,
          aiCreationsUsed,
          aiCreationsLimit,
          manualCreationsUsed: weeklyLimits?.manual_generations_used || 0,
          manualCreationsLimit,
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