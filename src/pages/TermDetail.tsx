import { useParams, useNavigate } from "react-router-dom";
import { useTermTracking } from "@/hooks/useTermTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, TrendingUp, Eye } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { SparklineChart } from "@/components/SparklineChart";
import { EvidenceCard } from "@/components/EvidenceCard";
import { ProtectedFeature } from "@/components/ProtectedFeature";

const TermDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: termData, isLoading, error } = useTermTracking(slug!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !termData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Term not found or no tracking data available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { term, sightings, summary } = termData;
  const confidenceBadge = summary.avgScore >= 80 ? 'high' : summary.avgScore >= 60 ? 'medium' : 'low';
  const confidenceText = confidenceBadge === 'high' ? 'Verified' : confidenceBadge === 'medium' ? 'Likely' : 'Review';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${term.text} - Tracking Dashboard`}
        description={`Real-time tracking data for "${term.text}". Total spotted: ${summary.totalSpotted} mentions across ${summary.platformCount} platforms.`}
      />
      
      <div className="max-w-6xl mx-auto p-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Badge 
            variant="outline" 
            className={`${
              confidenceBadge === 'high' ? 'bg-confidence-high/10 text-confidence-high border-confidence-high/20' :
              confidenceBadge === 'medium' ? 'bg-confidence-medium/10 text-confidence-medium border-confidence-medium/20' :
              'bg-confidence-low/10 text-confidence-low border-confidence-low/20'
            }`}
          >
            {confidenceText}
          </Badge>
        </div>

        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">{term.text}</h1>
          <p className="text-xl text-muted-foreground">
            Real-time tracking across the web
          </p>
        </div>

        {/* Tracking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tracking Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Spotted */}
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{summary.totalSpotted}</div>
                <div className="text-sm text-muted-foreground">Total Spotted</div>
              </div>

              {/* 7-Day Trend */}
              <div className="text-center">
                <div className="h-12 flex items-center justify-center">
                  <SparklineChart data={summary.sparklines.week} period="7d" />
                </div>
                <div className="text-sm text-muted-foreground">7-Day Trend</div>
              </div>

              {/* 30-Day Trend */}
              <div className="text-center">
                <div className="h-12 flex items-center justify-center">
                  <SparklineChart data={summary.sparklines.month} period="30d" />
                </div>
                <div className="text-sm text-muted-foreground">30-Day Trend</div>
              </div>

              {/* 90-Day Trend */}
              <div className="text-center">
                <div className="h-12 flex items-center justify-center">
                  <SparklineChart data={summary.sparklines.quarter} period="90d" />
                </div>
                <div className="text-sm text-muted-foreground">90-Day Trend</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Evidence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Top Evidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sightings.slice(0, 3).map((sighting) => (
                <EvidenceCard
                  key={sighting.id}
                  sighting={sighting}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Want to see all mentions?</h3>
              <p className="text-muted-foreground">
                Access the full tracking dashboard with advanced filtering and analytics.
              </p>
              <ProtectedFeature
                config={{ requiresLabPro: true }}
                showCard={false}
              >
                <Button
                  onClick={() => navigate(`/pro/mentions?term=${term.slug}`)}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View All Mentions
                </Button>
              </ProtectedFeature>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermDetail;