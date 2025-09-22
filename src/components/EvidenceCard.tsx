import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Globe, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface EvidenceCardProps {
  sighting: Sighting;
}

const EvidenceCard = ({ sighting }: EvidenceCardProps) => {
  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return { variant: 'high', text: 'Verified' };
    if (score >= 60) return { variant: 'medium', text: 'Likely' };
    return { variant: 'low', text: 'Review' };
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
      return null;
    }
  };

  const getSourceDisplayName = (source: string) => {
    const sourceMap: { [key: string]: string } = {
      'google_cse': 'Google Search',
      'news_api': 'News API',
      'reddit': 'Reddit',
      'twitter': 'Twitter',
      'tiktok': 'TikTok',
    };
    return sourceMap[source] || source;
  };

  const confidence = getConfidenceBadge(sighting.score);
  const faviconUrl = getFaviconUrl(sighting.url);
  
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Header with favicon and title */}
            <div className="flex items-start gap-2">
              {faviconUrl && (
                <img
                  src={faviconUrl}
                  alt=""
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-sm line-clamp-2 text-foreground">
                  {sighting.title || 'Untitled'}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {getSourceDisplayName(sighting.source)}
                  </span>
                </div>
              </div>
            </div>

            {/* Snippet */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {sighting.snippet}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(sighting.created_at), { addSuffix: true })}
                </span>
              </div>
              <div>
                Score: {sighting.score}
              </div>
            </div>
          </div>

          {/* Right side - Badge and action */}
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant="outline"
              className={`${
                confidence.variant === 'high' ? 'bg-confidence-high/10 text-confidence-high border-confidence-high/20' :
                confidence.variant === 'medium' ? 'bg-confidence-medium/10 text-confidence-medium border-confidence-medium/20' :
                'bg-confidence-low/10 text-confidence-low border-confidence-low/20'
              }`}
            >
              {confidence.text}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(sighting.url, '_blank', 'noopener,noreferrer')}
              className="h-8 px-2"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { EvidenceCard };