import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MonitoringData {
  id: string;
  creation_id: string;
  monitoring_started_at: string;
  last_checked_at: string | null;
  last_found_at: string | null;
  times_found: number;
  trending_score: number;
  status: 'monitoring' | 'spotted' | 'trending' | 'dormant';
  platforms_detected: string[];
  creations: {
    phrase: string;
    meaning: string;
    example: string;
  };
}

export const useSlangMonitoring = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadMonitoringData = async () => {
      try {
        const { data, error } = await supabase
          .from('creation_monitoring')
          .select(`
            id,
            creation_id,
            monitoring_started_at,
            last_checked_at,
            last_found_at,
            times_found,
            trending_score,
            status,
            platforms_detected,
            creations!inner(phrase, meaning, example)
          `)
          .eq('user_id', user.id)
          .order('trending_score', { ascending: false });

        if (error) throw error;

        setMonitoringData((data as MonitoringData[]) || []);
      } catch (error) {
        console.error('Error loading monitoring data:', error);
        setMonitoringData([]);
      } finally {
        setLoading(false);
      }
    };

    loadMonitoringData();

    // Set up real-time subscription for monitoring updates
    const channel = supabase
      .channel('monitoring-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creation_monitoring',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadMonitoringData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const triggerManualCheck = async () => {
    try {
      const { error } = await supabase.functions.invoke('monitor-shared-slang');
      if (error) throw error;
      
      // Data will be automatically refreshed via real-time subscription
      return { success: true };
    } catch (error) {
      console.error('Error triggering manual monitoring check:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    monitoringData,
    loading,
    triggerManualCheck
  };
};