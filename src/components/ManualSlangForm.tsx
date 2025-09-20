import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualSlangFormProps {
  onCreationSuccess: () => void;
  disabled?: boolean;
}

export const ManualSlangForm: React.FC<ManualSlangFormProps> = ({
  onCreationSuccess,
  disabled = false
}) => {
  const [phrase, setPhrase] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate phrase
    if (!phrase.trim()) {
      newErrors.phrase = 'Phrase is required';
    } else {
      const wordCount = phrase.trim().split(/\s+/).length;
      if (wordCount > 3) {
        newErrors.phrase = 'Phrase must be 1-3 words only';
      }
      if (phrase.length > 100) {
        newErrors.phrase = 'Phrase must be 100 characters or less';
      }
    }

    // Validate meaning
    if (!meaning.trim()) {
      newErrors.meaning = 'Meaning is required';
    } else if (meaning.length > 500) {
      newErrors.meaning = 'Meaning must be 500 characters or less';
    }

    // Validate example
    if (!example.trim()) {
      newErrors.example = 'Example is required';
    } else if (example.length > 500) {
      newErrors.example = 'Example must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-manual-slang', {
        body: {
          phrase: phrase.trim(),
          meaning: meaning.trim(),
          example: example.trim()
        }
      });

      if (error) {
        console.error('Error creating manual slang:', error);
        toast({
          title: "Creation Failed",
          description: error.message || "Failed to create manual slang entry",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: (
          <div className="space-y-2">
            <p>Your slang entry has been created successfully!</p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${phrase}: ${meaning}\nExample: "${example}"`
                  );
                  toast({ title: "Copied!", description: "Creation copied to clipboard" });
                }}
              >
                Share Now
              </Button>
            </div>
          </div>
        ),
      });

      // Reset form
      setPhrase('');
      setMeaning('');
      setExample('');
      setErrors({});
      
      // Notify parent component
      onCreationSuccess();

    } catch (error) {
      console.error('Error creating manual slang:', error);
      toast({
        title: "Creation Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          Create Manual Slang
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phrase">Word/Phrase *</Label>
            <div className="space-y-1">
              <Input
                id="phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="e.g., no cap, salty, ghosting"
                maxLength={100}
                disabled={disabled || loading}
                className={errors.phrase ? 'border-destructive' : ''}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1-3 words only</span>
                <span>{getWordCount(phrase)}/3 words • {phrase.length}/100 chars</span>
              </div>
              {errors.phrase && (
                <p className="text-xs text-destructive">{errors.phrase}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meaning">Meaning *</Label>
            <div className="space-y-1">
              <Textarea
                id="meaning"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Define what this slang means..."
                maxLength={500}
                disabled={disabled || loading}
                className={errors.meaning ? 'border-destructive' : ''}
                rows={3}
              />
              <div className="flex justify-end text-xs text-muted-foreground">
                <span>{meaning.length}/500 chars</span>
              </div>
              {errors.meaning && (
                <p className="text-xs text-destructive">{errors.meaning}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="example">Example Usage *</Label>
            <div className="space-y-1">
              <Textarea
                id="example"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="Show how to use it in a sentence..."
                maxLength={500}
                disabled={disabled || loading}
                className={errors.example ? 'border-destructive' : ''}
                rows={3}
              />
              <div className="flex justify-end text-xs text-muted-foreground">
                <span>{example.length}/500 chars</span>
              </div>
              {errors.example && (
                <p className="text-xs text-destructive">{errors.example}</p>
              )}
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please ensure your content is appropriate and follows community guidelines. 
              All entries are subject to review.
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            disabled={disabled || loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Slang Entry'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};