import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Twitter, 
  Facebook, 
  Instagram, 
  MessageCircle,
  Share2,
  Copy,
  Linkedin,
  Send,
  Video,
  Ghost,
  Hash,
  Phone
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Creation,
  SharePlatform,
  detectWebShareSupport,
  detectMobile,
  formatForPlatform,
  handleWebShare,
  copyToClipboard,
  openUrl,
  openApp,
  getShareUrls,
  generateShareContent
} from '@/lib/shareUtils';

interface SharePanelProps {
  creation: Creation;
  userId: string;
  className?: string;
}

export const SharePanel: React.FC<SharePanelProps> = ({ creation, userId, className = '' }) => {
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<SharePlatform | null>(null);

  const logShare = async (platform: SharePlatform) => {
    try {
      const { error } = await supabase.functions.invoke('log-share', {
        body: {
          creation_id: creation.id,
          user_id: userId,
          platform,
          share_content: formatForPlatform(creation, platform),
          share_url: generateShareContent(creation).url,
        },
      });

      if (error) {
        console.error('Failed to log share:', error);
      }
    } catch (error) {
      console.error('Error logging share:', error);
    }
  };

  const handlePlatformShare = async (platform: SharePlatform) => {
    await logShare(platform);

    switch (platform) {
      case 'web_share':
        if (detectWebShareSupport()) {
          const success = await handleWebShare(creation);
          if (success) {
            toast({ title: 'Shared successfully!' });
          }
        } else {
          toast({ 
            title: 'Web Share not supported',
            description: 'Please use individual platform buttons.',
            variant: 'destructive'
          });
        }
        break;

      case 'copy_link':
        const shareUrl = generateShareContent(creation).url;
        const success = await copyToClipboard(shareUrl);
        if (success) {
          toast({ title: 'Link copied to clipboard!' });
        } else {
          toast({ 
            title: 'Failed to copy link',
            variant: 'destructive'
          });
        }
        break;

      case 'twitter':
        openUrl(getShareUrls(creation).twitter);
        break;

      case 'facebook':
        openUrl(getShareUrls(creation).facebook);
        break;

      case 'reddit':
        openUrl(getShareUrls(creation).reddit);
        break;

      case 'linkedin':
        openUrl(getShareUrls(creation).linkedin);
        break;

      case 'whatsapp':
        openUrl(getShareUrls(creation).whatsapp);
        break;

      case 'telegram':
        openUrl(getShareUrls(creation).telegram);
        break;

      case 'instagram':
        await handleCopyAndOpenApp(platform, 'instagram://');
        break;

      case 'tiktok':
        await handleCopyAndOpenApp(platform, 'tiktok://');
        break;

      case 'snapchat':
        if (detectWebShareSupport() && detectMobile()) {
          const success = await handleWebShare(creation);
          if (!success) {
            await handleCopyAndOpenApp(platform, 'snapchat://');
          } else {
            toast({ title: 'Share sheet opened!' });
          }
        } else {
          await handleCopyAndOpenApp(platform, 'snapchat://');
        }
        break;
    }
  };

  const handleCopyAndOpenApp = async (platform: SharePlatform, deepLink: string) => {
    const content = formatForPlatform(creation, platform);
    const textToCopy = 'caption' in content ? content.caption : content.text;
    
    const copySuccess = await copyToClipboard(textToCopy);
    
    if (copySuccess) {
      toast({ 
        title: 'Caption copied!',
        description: `Open ${platform} and paste your content.`
      });
      
      // Try to open the app
      try {
        openApp(deepLink);
      } catch {
        // If deep link fails, show instruction modal
        setCurrentPlatform(platform);
        setIsInstructionModalOpen(true);
      }
    } else {
      toast({ 
        title: 'Failed to copy caption',
        variant: 'destructive'
      });
    }
  };

  const platformButtons = [
    { platform: 'twitter' as SharePlatform, icon: Twitter, label: 'X (Twitter)', color: 'hover:bg-slate-100' },
    { platform: 'facebook' as SharePlatform, icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-50' },
    { platform: 'snapchat' as SharePlatform, icon: Ghost, label: 'Snapchat', color: 'hover:bg-yellow-50' },
    { platform: 'tiktok' as SharePlatform, icon: Video, label: 'TikTok', color: 'hover:bg-slate-100' },
    { platform: 'reddit' as SharePlatform, icon: Hash, label: 'Reddit', color: 'hover:bg-orange-50' },
  ];

  if (detectWebShareSupport()) {
    platformButtons.unshift({
      platform: 'web_share' as SharePlatform,
      icon: Share2,
      label: 'Share',
      color: 'hover:bg-primary/10'
    });
  }

  platformButtons.push({
    platform: 'copy_link' as SharePlatform,
    icon: Copy,
    label: 'Copy Link',
    color: 'hover:bg-slate-100'
  });

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {platformButtons.map(({ platform, icon: Icon, label, color }) => (
          <Button
            key={platform}
            variant="outline"
            size="sm"
            onClick={() => handlePlatformShare(platform)}
            className={`h-8 w-8 p-0 ${color}`}
            title={label}
            aria-label={`Share on ${label}`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <Dialog open={isInstructionModalOpen} onOpenChange={setIsInstructionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share on {currentPlatform}</DialogTitle>
            <DialogDescription>
              Your caption has been copied to clipboard. Follow these steps:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open the {currentPlatform} app on your device</li>
              <li>Create a new post</li>
              <li>Paste the copied caption</li>
              <li>Share your slang creation!</li>
            </ol>
            <Button
              onClick={async () => {
                if (currentPlatform) {
                  const content = formatForPlatform(creation, currentPlatform);
                  const textToCopy = 'caption' in content ? content.caption : content.text;
                  const success = await copyToClipboard(textToCopy);
                  if (success) {
                    toast({ title: 'Caption copied again!' });
                  }
                }
              }}
              variant="outline"
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Caption Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};