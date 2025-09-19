import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AgeVerificationModalProps {
  open: boolean;
  onVerificationComplete: (isMinor: boolean) => void;
  userId: string;
}

export const AgeVerificationModal = ({ open, onVerificationComplete, userId }: AgeVerificationModalProps) => {
  const [birthDate, setBirthDate] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleSubmit = async () => {
    if (!birthDate) {
      toast({
        title: 'Birth Date Required',
        description: 'Please enter your birth date to continue.',
        variant: 'destructive',
      });
      return;
    }

    const age = calculateAge(birthDate);
    const isMinor = age < 18;

    if (age < 13) {
      toast({
        title: 'Age Restriction',
        description: 'You must be at least 13 years old to use this service.',
        variant: 'destructive',
      });
      return;
    }

    if (isMinor && !parentEmail) {
      toast({
        title: 'Parent Email Required',
        description: 'For users under 18, a parent or guardian email is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          birth_date: birthDate,
          age_verified: true,
          parent_email: isMinor ? parentEmail : null,
          safe_mode: isMinor,
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Age Verification Complete',
        description: isMinor 
          ? 'Your account has been set up with enhanced safety features.'
          : 'Your account has been verified.',
      });

      onVerificationComplete(isMinor);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify age. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMinor = birthDate ? calculateAge(birthDate) < 18 : false;
  const isTooYoung = birthDate ? calculateAge(birthDate) < 13 : false;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Age Verification Required
          </DialogTitle>
          <DialogDescription>
            To ensure appropriate content and safety measures, please verify your age.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Birth Date</label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            {isTooYoung && (
              <p className="text-sm text-destructive mt-1">
                You must be at least 13 years old to use this service.
              </p>
            )}
          </div>

          {isMinor && !isTooYoung && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Parent or Guardian Email
              </label>
              <Input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Required for users under 18. This helps us provide appropriate safety features.
              </p>
            </div>
          )}

          <div className="bg-muted p-3 rounded-lg text-sm">
            <h4 className="font-medium mb-1">Privacy Notice</h4>
            <p className="text-muted-foreground">
              Your age information is used only for safety and compliance purposes. 
              Users under 18 receive enhanced content filtering and safety features.
            </p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !birthDate || isTooYoung || (isMinor && !parentEmail)}
            className="w-full"
          >
            {isSubmitting ? 'Verifying...' : 'Verify Age & Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};