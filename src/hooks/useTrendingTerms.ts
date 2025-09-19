import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrendingTerm {
  term: string;
  confidence: 'High' | 'Medium' | 'Low';
  tone: string;
  lookupCount: number;
}

interface UseTrendingTermsReturn {
  trendingTerms: TrendingTerm[];
  lastUpdated: string | null;
  isLoading: boolean;
}

const FALLBACK_TERMS = [
  { term: 'rizz', confidence: 'High' as const, tone: 'positive', lookupCount: 0 },
  { term: 'mid', confidence: 'High' as const, tone: 'neutral', lookupCount: 0 },
  { term: 'lowkey', confidence: 'High' as const, tone: 'neutral', lookupCount: 0 },
  { term: 'delulu', confidence: 'Medium' as const, tone: 'niche', lookupCount: 0 },
  { term: 'gyat', confidence: 'Medium' as const, tone: 'adult', lookupCount: 0 },
  { term: 'girl dinner', confidence: 'High' as const, tone: 'neutral', lookupCount: 0 },
  { term: 'ratio', confidence: 'High' as const, tone: 'neutral', lookupCount: 0 },
  { term: 'sigma', confidence: 'Medium' as const, tone: 'niche', lookupCount: 0 },
  { term: 'skibidi', confidence: 'Low' as const, tone: 'niche', lookupCount: 0 },
  { term: 'the ick', confidence: 'High' as const, tone: 'insulting', lookupCount: 0 }
];

export const useTrendingTerms = (): UseTrendingTermsReturn => {
  const [trendingTerms, setTrendingTerms] = useState<TrendingTerm[]>(FALLBACK_TERMS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingTerms = async () => {
      try {
        // Calculate date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch trending terms from the last 30 days
        const { data: lookupData, error } = await supabase
          .from('lookups')
          .select(`
            terms (text),
            created_at
          `)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching trending terms:', error);
          setLastUpdated(new Date().toISOString());
          return;
        }

        // Count term frequencies
        const termCounts = new Map<string, number>();
        lookupData?.forEach((lookup: any) => {
          const term = lookup.terms?.text;
          if (term) {
            termCounts.set(term, (termCounts.get(term) || 0) + 1);
          }
        });

        // Convert to array and sort by count
        const sortedTerms = Array.from(termCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);

        if (sortedTerms.length > 0) {
          // Fetch additional data for these terms
          const termTexts = sortedTerms.map(([term]) => term);
          const { data: senseData } = await supabase
            .from('senses')
            .select(`
              terms!inner(text),
              confidence,
              tone
            `)
            .in('terms.text', termTexts);

          // Map trending terms with their metadata
          const trending = sortedTerms.map(([term, count]) => {
            const sense = senseData?.find((s: any) => s.terms?.text === term);
            return {
              term,
              confidence: (sense?.confidence || 'Medium') as 'High' | 'Medium' | 'Low',
              tone: sense?.tone || 'neutral',
              lookupCount: count
            };
          }).slice(0, 10);

          setTrendingTerms(trending);
        }

        setLastUpdated(new Date().toISOString());
      } catch (error) {
        console.error('Failed to fetch trending terms:', error);
        setLastUpdated(new Date().toISOString());
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingTerms();
  }, []);

  return { trendingTerms, lastUpdated, isLoading };
};