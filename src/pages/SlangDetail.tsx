import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShareTrackModal } from '@/components/ShareTrackModal';
import { ArrowLeft, Calendar, Sparkles } from 'lucide-react';
import { Creation } from '@/lib/shareUtils';
import { SEOHead, createSlangEntrySchema } from '@/components/SEOHead';

const SlangDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creation, setCreation] = useState<Creation | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCreation = async () => {
      if (!id) {
        setError('No creation ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First, try to find the creation in the public creations table
        const { data, error: fetchError } = await supabase
          .from('creations')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching creation:', fetchError);
          if (fetchError.code === 'PGRST116') {
            setError('Slang creation not found');
          } else {
            setError('Failed to load slang creation');
          }
          return;
        }

        if (!data) {
          setError('Slang creation not found');
          return;
        }

        setCreation(data);

        // Update document title and meta tags for SEO
        document.title = `"${data.phrase}" - SlangLab`;
        
        // Update Open Graph meta tags
        const updateMetaTag = (property: string, content: string) => {
          let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', content);
        };

        updateMetaTag('og:title', `"${data.phrase}" - SlangLab`);
        updateMetaTag('og:description', `Learn what "${data.phrase}" means: ${data.meaning}`);
        updateMetaTag('og:url', `https://slang-decoder-lab.lovable.app/slang/${data.id}`);

      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadCreation();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading slang creation...</p>
        </div>
      </div>
    );
  }

  if (error || !creation) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-destructive">Oops!</h1>
              <p className="text-muted-foreground">
                {error || 'The slang creation you\'re looking for doesn\'t exist or has been removed.'}
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => navigate('/')}>
                Return Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={`"${creation.phrase}" - SlangLab`}
        description={`Learn what "${creation.phrase}" means: ${creation.meaning}. Example: "${creation.example}"`}
        keywords={`${creation.phrase}, slang, definition, meaning, modern language, AI generated`}
        type="article"
        structuredData={createSlangEntrySchema({
          id: creation.id,
          phrase: creation.phrase,
          meaning: creation.meaning,
          example: creation.example,
          created_at: creation.created_at
        })}
        url={`https://slang-decoder-lab.lovable.app/slang/${creation.id}`}
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Button */}
            <Button 
              onClick={() => navigate(-1)} 
              variant="ghost" 
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {/* Main Content */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <Badge variant="secondary" className="text-xs">
                    {creation.creation_type === 'ai' ? 'AI Generated' : 'Manual Creation'}
                  </Badge>
                </div>
                <CardTitle className="text-4xl font-bold text-primary">
                  "{creation.phrase}"
                </CardTitle>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(creation.created_at).toLocaleDateString()}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8">
                <div className="grid gap-6 md:gap-8">
                  <section className="space-y-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      Meaning
                    </h2>
                    <p className="text-lg leading-relaxed">{creation.meaning}</p>
                  </section>
                  
                  <section className="space-y-3">
                    <h2 className="text-xl font-semibold">Example</h2>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-lg">
                      "{creation.example}"
                    </blockquote>
                  </section>

                  {creation.vibe && (
                    <section className="space-y-3">
                      <h2 className="text-xl font-semibold">Vibe</h2>
                      <p className="text-lg">{creation.vibe}</p>
                    </section>
                  )}
                </div>

                {/* Share Section */}
                <div className="border-t pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">Share This Slang</h3>
                    <Button 
                      onClick={() => setShareModalOpen(true)}
                      className="w-full max-w-sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Share & Track
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center pt-4">
                  <Button asChild variant="outline">
                    <a href="/">
                      Discover More Slang
                    </a>
                  </Button>
                  <Button asChild>
                    <a href="/slang-lab">
                      Create Your Own
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Share & Track Modal */}
      {creation && (
        <ShareTrackModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          creation={creation}
          userId={creation.id} // Use creation ID as fallback since no user context
          hasLabProAccess={false} // Public page, no LabPro access
        />
      )}
    </>
  );
};

export default SlangDetail;