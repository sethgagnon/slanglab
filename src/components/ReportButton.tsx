import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReportButtonProps {
  contentType: 'creation' | 'term' | 'user';
  contentId: string;
  size?: 'sm' | 'default';
}

export const ReportButton = ({ contentType, contentId, size = 'sm' }: ReportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const reasons = [
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'bullying', label: 'Bullying or Harassment' },
    { value: 'spam', label: 'Spam' },
    { value: 'violence', label: 'Violence or Threats' },
    { value: 'sexual_content', label: 'Sexual Content' },
    { value: 'self_harm', label: 'Self-Harm Content' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to report content.',
        variant: 'destructive',
      });
      return;
    }

    if (!reason) {
      toast({
        title: 'Reason Required',
        description: 'Please select a reason for reporting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_user_id: user.id,
          reported_content_type: contentType,
          reported_content_id: contentId,
          reason,
          description: description || null,
        });

      if (error) throw error;

      toast({
        title: 'Report Submitted',
        description: 'Thank you for reporting this content. Our moderation team will review it.',
      });

      setOpen(false);
      setReason('');
      setDescription('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className="text-muted-foreground hover:text-destructive"
        >
          <AlertTriangle className="h-4 w-4" />
          {size !== 'sm' && <span className="ml-2">Report</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Reason for reporting</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              Additional details (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context about why you're reporting this content..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !reason}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};