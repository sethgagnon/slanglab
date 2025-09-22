import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Creation } from './useCreations';

interface UseTrackingProps {
  creation: Creation;
  hasLabProAccess: boolean;
}

export const useTracking = ({ creation, hasLabProAccess }: UseTrackingProps) => {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termId, setTermId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if tracking exists for this creation
  useEffect(() => {
    const checkTracking = async () => {
      if (!user || !hasLabProAccess) return;

      try {
        // First, find or create a term for this creation
        let { data: existingTerm } = await supabase
          .from('terms')
          .select('id')
          .eq('user_id', user.id)
          .eq('text', creation.phrase)
          .single();

        let currentTermId = existingTerm?.id;

        if (!existingTerm) {
          // Create a term for this creation
          const slug = creation.phrase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const { data: newTerm, error: termError } = await supabase
            .from('terms')
            .insert({
              user_id: user.id,
              text: creation.phrase,
              original_text: creation.phrase,
              normalized_text: creation.phrase.toLowerCase(),
              slug: slug
            })
            .select('id')
            .single();

          if (termError) throw termError;
          currentTermId = newTerm.id;
        }

        setTermId(currentTermId);

        // Check if tracking exists for this term
        const { data: tracker } = await supabase
          .from('trackers')
          .select('term_id')
          .eq('term_id', currentTermId)
          .single();

        setIsTracking(!!tracker);
      } catch (error) {
        console.error('Error checking tracking status:', error);
      }
    };

    checkTracking();
  }, [user, creation, hasLabProAccess]);

  const toggleTracking = async () => {
    if (!user || !hasLabProAccess || !termId) {
      toast({
        title: "LabPro Required",
        description: "Upgrade to LabPro to track your creations",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isTracking) {
        // Remove tracking
        await supabase
          .from('trackers')
          .delete()
          .eq('term_id', termId);
        
        setIsTracking(false);
        toast({
          title: "Tracking Disabled",
          description: "No longer tracking this creation",
        });
      } else {
        // Get enabled sources from source_rules
        const { data: sourceRules } = await supabase
          .from('source_rules')
          .select('source_name')
          .eq('enabled', true);

        const enabledSources = sourceRules?.map(rule => rule.source_name).filter(name => name !== null) || [];

        // Add tracking (upsert to handle existing trackers)
        await supabase
          .from('trackers')
          .upsert({
            term_id: termId,
            sensitivity: 'balanced',
            sources_enabled: enabledSources,
            schedule_cron: '0 */6 * * *'
          }, {
            onConflict: 'term_id'
          });

        setIsTracking(true);
        toast({
          title: "Tracking Enabled",
          description: "Now tracking this creation across platforms",
        });
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
      toast({
        title: "Error",
        description: "Failed to update tracking status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isTracking,
    toggleTracking,
    loading,
    canTrack: hasLabProAccess && !!termId
  };
};