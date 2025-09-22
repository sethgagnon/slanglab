import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SparklineData {
  date: string;
  value: number;
}

interface TrackingSummary {
  totalSpotted: number;
  avgScore: number;
  platformCount: number;
  sparklines: {
    week: SparklineData[];
    month: SparklineData[];
    quarter: SparklineData[];
  };
}

interface Sighting {
  id: string;
  url: string;
  title: string | null;
  snippet: string;
  score: number;
  source: string;
  created_at: string;
  first_seen_at: string;
  last_seen_at: string;
}

interface Term {
  id: string;
  text: string;
  slug: string;
  original_text: string;
  normalized_text: string;
  created_at: string;
}

interface TermTrackingData {
  term: Term;
  sightings: Sighting[];
  summary: TrackingSummary;
}

const generateSparklineData = (sightings: Sighting[], days: number): SparklineData[] => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  
  const dailyTI: { [key: string]: number } = {};
  
  // Initialize all days with 0
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dailyTI[dateStr] = 0;
  }
  
  // Calculate daily TI (Trending Index = Σ score/100 per day)
  sightings.forEach(sighting => {
    const sightingDate = new Date(sighting.created_at).toISOString().split('T')[0];
    if (dailyTI.hasOwnProperty(sightingDate)) {
      dailyTI[sightingDate] += sighting.score / 100;
    }
  });
  
  return Object.entries(dailyTI).map(([date, value]) => ({
    date,
    value: Math.round(value * 100) / 100
  }));
};

export const useTermTracking = (slug: string) => {
  return useQuery({
    queryKey: ["termTracking", slug],
    queryFn: async (): Promise<TermTrackingData> => {
      // Get term by slug
      const { data: term, error: termError } = await supabase
        .from("terms")
        .select("*")
        .eq("slug", slug)
        .single();

      if (termError) throw termError;
      if (!term) throw new Error("Term not found");

      // Get source rules to find min_score threshold
      const { data: sourceRules } = await supabase
        .from("source_rules")
        .select("min_score")
        .eq("enabled", true);

      const minScore = sourceRules?.reduce((min, rule) => 
        Math.min(min, rule.min_score || 60), 60) || 60;

      // Get sightings for this term
      const { data: sightings, error: sightingsError } = await supabase
        .from("sightings")
        .select("*")
        .eq("term_id", term.id)
        .gte("score", minScore)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false });

      if (sightingsError) throw sightingsError;

      const sightingsData = sightings || [];
      
      // Calculate summary metrics
      const uniqueUrls = new Set(sightingsData.map(s => s.url));
      const uniqueSources = new Set(sightingsData.map(s => s.source));
      const avgScore = sightingsData.length > 0 
        ? sightingsData.reduce((sum, s) => sum + s.score, 0) / sightingsData.length 
        : 0;

      const summary: TrackingSummary = {
        totalSpotted: uniqueUrls.size,
        avgScore: Math.round(avgScore),
        platformCount: uniqueSources.size,
        sparklines: {
          week: generateSparklineData(sightingsData, 7),
          month: generateSparklineData(sightingsData, 30),
          quarter: generateSparklineData(sightingsData, 90),
        }
      };

      return {
        term,
        sightings: sightingsData,
        summary
      };
    },
    enabled: !!slug,
  });
};