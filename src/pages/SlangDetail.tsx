import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SharePanel } from '@/components/SharePanel';
import { ArrowLeft, Calendar, Sparkles } from 'lucide-react';
import { Creation } from '@/lib/shareUtils';

const SlangDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creation, setCreation] = useState<Creation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCreation = async () => {
      if (!id) {
        setError('Invalid slang ID');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('creations')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          setError('Slang not found');
          return;
        }

        // Transform the data to match the Creation interface
        const transformedCreation: Creation = {
          id: data.id,
          phrase: data.phrase,
          meaning: data.meaning,
          example: data.example,
          vibe: data.creation_type || 'cool'
        };

        setCreation(transformedCreation);

        // Update page meta tags for better social sharing
        document.title = `"${data.phrase}" - SlangLab`;
        
        // Add Open Graph meta tags
        const existingOgTitle = document.querySelector('meta[property="og:title"]');
        if (existingOgTitle) {
          existingOgTitle.setAttribute('content', `"${data.phrase}" - AI-Generated Slang`);
        } else {
          const metaOgTitle = document.createElement('meta');
          metaOgTitle.setAttribute('property', 'og:title');
          metaOgTitle.setAttribute('content', `"${data.phrase}" - AI-Generated Slang`);
          document.head.appendChild(metaOgTitle);
        }

        const existingOgDescription = document.querySelector('meta[property="og:description"]');
        const description = `"${data.phrase}" means ${data.meaning}. Example: "${data.example}"`;
        if (existingOgDescription) {
          existingOgDescription.setAttribute('content', description);
        } else {
          const metaOgDescription = document.createElement('meta');
          metaOgDescription.setAttribute('property', 'og:description');
          metaOgDescription.setAttribute('content', description);
          document.head.appendChild(metaOgDescription);
        }

      } catch (error: any) {
        console.error('Error loading creation:', error);
        setError('Failed to load slang creation');
      } finally {
        setLoading(false);
      }
    };

    loadCreation();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading slang...</p>
        </div>
      </div>
    );
  }

  if (error || !creation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Slang Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This slang creation could not be found.'}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SlangLab
          </Button>

          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-xs">
                  AI-Generated Slang
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold text-primary">
                "{creation.phrase}"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">Meaning</h2>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {creation.meaning}
                </p>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">Example</h2>
                <p className="text-muted-foreground text-base italic leading-relaxed">
                  "{creation.example}"
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {creation.vibe}
                </Badge>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 text-center">Share This Slang</h3>
                <div className="flex justify-center">
                  <SharePanel 
                    creation={creation} 
                    userId="anonymous" 
                    className="justify-center"
                  />
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Created with SlangLab AI</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SlangDetail;