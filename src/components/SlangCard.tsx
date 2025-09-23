import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Star,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { ReportButton } from '@/components/ReportButton';

interface SlangCardProps {
  creation: {
    id: string;
    phrase: string;
    meaning: string;
    example: string;
    safe_flag?: boolean;
    votes: number;
    creation_type?: string;
    vibe?: string;
    created_at: string;
  };
  showCuratedBadge?: boolean;
  showAIBadge?: boolean;
  isLabPro?: boolean;
  user?: any;
  onVote?: (creationId: string, value: 1 | -1) => void;
  onSave?: (creationId: string) => void;
  onCopy?: (example: string) => void;
  onShare?: (creation: any) => void;
  selectedVibes?: string[];
}

export const SlangCard: React.FC<SlangCardProps> = ({
  creation,
  showCuratedBadge = false,
  showAIBadge = false,
  isLabPro = false,
  user,
  onVote,
  onSave,
  onCopy,
  onShare,
  selectedVibes = []
}) => {
  return (
    <Card className="relative h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-foreground leading-tight">
            {creation.phrase}
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            {creation.safe_flag && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <CheckCircle className="w-3 h-3 mr-1" />
                Safe
              </Badge>
            )}
            {showCuratedBadge && (
              <Badge 
                variant="outline" 
                className="text-xs shrink-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              >
                Curated
              </Badge>
            )}
            {showAIBadge && (
              <Badge 
                variant="outline" 
                className="text-xs shrink-0 bg-accent/50 text-accent-foreground border-accent/30"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Meaning</p>
          <p className="text-sm text-foreground leading-relaxed">{creation.meaning}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Example</p>
          <p className="text-sm text-foreground italic leading-relaxed">
            "{creation.example}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {onVote && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onVote(creation.id, 1)}
                    className="hover:bg-accent hover:text-accent-foreground"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-1 min-w-[1.5rem] text-center">
                    {creation.votes}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onVote(creation.id, -1)}
                    className="hover:bg-accent hover:text-accent-foreground"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {onSave && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onSave(creation.id)}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              {onCopy && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onCopy(creation.example)}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <ReportButton 
                contentType="creation" 
                contentId={creation.id} 
                size="sm" 
              />
            </div>
          </div>

          {/* Share & Track for LabPro users */}
          {isLabPro && user && onShare && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">Share your creation:</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onShare({
                  id: creation.id,
                  phrase: creation.phrase,
                  meaning: creation.meaning,
                  example: creation.example,
                  vibe: selectedVibes.join(', '),
                  created_at: creation.created_at,
                  creation_type: creation.creation_type || 'manual'
                })}
                className="w-full hover:bg-accent hover:text-accent-foreground"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Share & Track
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};