import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CreationWithTracking {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  creation_type: string;
  vibe?: string;
  created_at: string;
  term_id?: string;
  slug?: string;
  tracking_enabled: boolean;
  last_run_at?: string;
  total_spotted: number;
  spotted_7d_current: number;
  spotted_7d_previous: number;
  trend_direction: 'up' | 'down' | 'neutral';
  trend_percentage: number;
}

export const useCreationsWithTracking = () => {
  const [creations, setCreations] = useState<CreationWithTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadCreationsWithTracking = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get minimum score threshold from source rules
      const { data: sourceRules } = await supabase
        .from('source_rules')
        .select('min_score')
        .eq('enabled', true)
        .order('min_score', { ascending: true })
        .limit(1);

      const minScore = sourceRules?.[0]?.min_score || 60;

      // Get creations data
      const { data: creationsData, error: creationsError } = await supabase
        .from('creations')
        .select(`
          id,
          phrase,
          meaning,
          example,
          creation_type,
          vibe,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (creationsError) throw creationsError;

      // For each creation, get associated term and tracking data
      const enrichedCreations: CreationWithTracking[] = await Promise.all(
        (creationsData || []).map(async (creation) => {
          // Look for existing term
          const { data: termData } = await supabase
            .from('terms')
            .select('id, slug')
            .eq('user_id', user.id)
            .eq('text', creation.phrase)
            .maybeSingle();

          let trackingData = null;
          let sightingsData = { total: 0, current7d: 0, previous7d: 0 };

          if (termData) {
            // Get tracking status
            const { data: trackerData } = await supabase
              .from('trackers')
              .select('last_run_at')
              .eq('term_id', termData.id)
              .maybeSingle();

            trackingData = trackerData;

            // Get sightings count
            const { count: totalCount } = await supabase
              .from('sightings')
              .select('*', { count: 'exact', head: true })
              .eq('term_id', termData.id)
              .gte('score', minScore);

            const { count: current7dCount } = await supabase
              .from('sightings')
              .select('*', { count: 'exact', head: true })
              .eq('term_id', termData.id)
              .gte('score', minScore)
              .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            const { count: previous7dCount } = await supabase
              .from('sightings')
              .select('*', { count: 'exact', head: true })
              .eq('term_id', termData.id)
              .gte('score', minScore)
              .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
              .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            sightingsData = {
              total: totalCount || 0,
              current7d: current7dCount || 0,
              previous7d: previous7dCount || 0
            };
          }

          const trendPercentage = sightingsData.previous7d > 0 
            ? ((sightingsData.current7d - sightingsData.previous7d) / sightingsData.previous7d) * 100
            : sightingsData.current7d > 0 ? 100 : 0;

          const trendDirection: 'up' | 'down' | 'neutral' = 
            sightingsData.current7d > sightingsData.previous7d ? 'up' :
            sightingsData.current7d < sightingsData.previous7d ? 'down' : 'neutral';

          return {
            ...creation,
            term_id: termData?.id,
            slug: termData?.slug,
            tracking_enabled: !!trackingData,
            last_run_at: trackingData?.last_run_at,
            total_spotted: sightingsData.total,
            spotted_7d_current: sightingsData.current7d,
            spotted_7d_previous: sightingsData.previous7d,
            trend_direction: trendDirection,
            trend_percentage: Math.abs(trendPercentage)
          };
        })
      );

      // Sort by 7-day spotted count descending
      enrichedCreations.sort((a, b) => b.spotted_7d_current - a.spotted_7d_current);
      setCreations(enrichedCreations);
    } catch (error) {
      console.error('Error loading creations with tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreationsWithTracking();
  }, [user]);

  return { creations, loading, refresh: loadCreationsWithTracking };
};