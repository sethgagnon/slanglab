import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, Filter, Download, ExternalLink } from "lucide-react";
import { EvidenceCard } from "@/components/EvidenceCard";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ProtectedFeature } from "@/components/ProtectedFeature";

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

const ProMentions = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const termSlug = searchParams.get('term');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: termData } = useQuery({
    queryKey: ["term", termSlug],
    queryFn: async () => {
      if (!termSlug) return null;
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .eq("slug", termSlug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!termSlug && !!user,
  });

  const { data: sightingsData, isLoading } = useQuery({
    queryKey: ["sightings", termData?.id, searchQuery, sourceFilter, scoreFilter, page],
    queryFn: async () => {
      if (!termData?.id) return { sightings: [], total: 0 };
      
      let query = supabase
        .from("sightings")
        .select("*", { count: 'exact' })
        .eq("term_id", termData.id)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%`);
      }

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      if (scoreFilter !== 'all') {
        const minScore = parseInt(scoreFilter);
        query = query.gte('score', minScore);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { sightings: data || [], total: count || 0 };
    },
    enabled: !!termData?.id && !!user,
  });

  const handleExport = async () => {
    if (!sightingsData?.sightings) return;
    
    const csvContent = [
      ['URL', 'Title', 'Source', 'Score', 'Date', 'Snippet'].join(','),
      ...sightingsData.sightings.map(s => [
        s.url,
        `"${s.title || 'Untitled'}"`,
        s.source,
        s.score,
        s.created_at,
        `"${s.snippet.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${termData?.text || 'mentions'}-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!termSlug || !termData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Invalid term or no tracking data available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil((sightingsData?.total || 0) / pageSize);

  return (
    <ProtectedFeature config={{ requiresLabPro: true }} showCard={false}>
      <div className="min-h-screen bg-background">
        <SEOHead
          title={`${termData.text} - All Mentions | LabPro`}
          description={`Comprehensive tracking dashboard for "${termData.text}". View all mentions with advanced filtering and analytics.`}
        />
        
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/t/${termSlug}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Summary
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{termData.text}</h1>
                <p className="text-muted-foreground">All Mentions</p>
              </div>
            </div>
            
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!sightingsData?.sightings?.length}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search mentions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="google_cse">Google Search</SelectItem>
                    <SelectItem value="news_api">News API</SelectItem>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="80">Verified (80+)</SelectItem>
                    <SelectItem value="60">Likely (60+)</SelectItem>
                    <SelectItem value="40">Review (40+)</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {sightingsData?.total || 0} mentions
                  </Badge>
                  {totalPages > 1 && (
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : sightingsData?.sightings?.length ? (
              sightingsData.sightings.map((sighting) => (
                <EvidenceCard key={sighting.id} sighting={sighting} />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No mentions found with current filters.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtectedFeature>
  );
};

export default ProMentions;