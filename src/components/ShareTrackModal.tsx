import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Share2, 
  Copy, 
  ExternalLink,
  MessageSquare,
  Camera,
  Video,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTracking } from '@/hooks/useTracking';
import type { Creation } from '@/hooks/useCreations';
import {
  detectWebShareSupport,
  handleWebShare,
  copyToClipboard,
  openUrl,
  getShareUrls,
  generateCopyCaption,
  type SharePlatform
} from '@/lib/shareUtils';

interface ShareTrackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creation: Creation;
  userId: string;
  hasLabProAccess: boolean;
}

export const ShareTrackModal: React.FC<ShareTrackModalProps> = ({
  open,
  onOpenChange,
  creation,
  userId,
  hasLabProAccess
}) => {
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const { toast } = useToast();
  const { isTracking, toggleTracking, loading: trackingLoading, canTrack } = useTracking({
    creation,
    hasLabProAccess
  });

  const supportsWebShare = detectWebShareSupport();
  const shareUrls = getShareUrls(creation);

  const logShare = async (platform: SharePlatform) => {
    try {
      await fetch('/functions/v1/log-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          creation_id: creation.id,
          platform,
          share_url: shareUrls[platform as keyof typeof shareUrls]
        })
      });
    } catch (error) {
      console.error('Failed to log share:', error);
    }
  };

  const handlePlatformShare = async (platform: SharePlatform) => {
    await logShare(platform);

    switch (platform) {
      case 'web_share':
        if (await handleWebShare(creation)) {
          toast({ title: "Shared successfully!" });
        }
        break;
      
      case 'reddit':
        openUrl(shareUrls.reddit);
        toast({
          title: "Redirecting to Reddit",
          description: "If the form isn't pre-filled, use the copy button as backup"
        });
        break;
      
      case 'facebook':
        openUrl(shareUrls.facebook);
        break;
      
      case 'snapchat':
        // Snapchat Creative Kit Web integration would go here
        // For now, fallback to copy
        await handleCopyLink();
        toast({
          title: "Link copied for Snapchat",
          description: "Paste into Snapchat to share"
        });
        break;
      
      case 'youtube':
        if (supportsWebShare) {
          if (await handleWebShare(creation)) {
            toast({ title: "Shared successfully!" });
          }
        } else {
          setShowCopyDialog(true);
        }
        break;
      
      case 'copy_link':
        await handleCopyLink();
        break;
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrls.youtube);
    if (success) {
      toast({ title: "Link copied to clipboard!" });
    } else {
      toast({ 
        title: "Copy failed", 
        description: "Please copy the link manually",
        variant: "destructive"
      });
    }
  };

  const handleCopyCaption = async () => {
    const caption = generateCopyCaption(creation);
    const success = await copyToClipboard(caption);
    if (success) {
      toast({ title: "Caption copied to clipboard!" });
      setShowCopyDialog(false);
    } else {
      toast({ 
        title: "Copy failed", 
        description: "Please copy the caption manually",
        variant: "destructive"
      });
    }
  };

  const platformButtons = [
    {
      name: 'Reddit',
      icon: MessageSquare,
      platform: 'reddit' as SharePlatform,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      name: 'Facebook',
      icon: Monitor,
      platform: 'facebook' as SharePlatform,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      name: 'Snapchat',
      icon: Camera,
      platform: 'snapchat' as SharePlatform,
      color: 'bg-yellow-400 hover:bg-yellow-500',
    },
    {
      name: 'YouTube',
      icon: Video,
      platform: 'youtube' as SharePlatform,
      color: 'bg-red-600 hover:bg-red-700',
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share & Track "{creation.phrase}"</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Primary Web Share Button */}
            {supportsWebShare && (
              <>
                <Button
                  onClick={() => handlePlatformShare('web_share')}
                  className="w-full"
                  size="lg"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Separator />
              </>
            )}

            {/* Platform Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {platformButtons.map(({ name, icon: Icon, platform, color }) => (
                <Button
                  key={platform}
                  variant="outline"
                  onClick={() => handlePlatformShare(platform)}
                  className="h-12 flex flex-col gap-1"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{name}</span>
                </Button>
              ))}
            </div>

            {/* Copy Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handlePlatformShare('copy_link')}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyCaption}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Caption
              </Button>
            </div>

            <Separator />

            {/* Tracking Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tracking-toggle" className="text-sm font-medium">
                  Start tracking this creation
                </Label>
                <Switch
                  id="tracking-toggle"
                  checked={isTracking}
                  onCheckedChange={toggleTracking}
                  disabled={trackingLoading || !canTrack}
                />
              </div>
              
              {!hasLabProAccess && (
                <p className="text-xs text-muted-foreground">
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  Upgrade to LabPro to track your creations across platforms
                </p>
              )}
              
              {hasLabProAccess && (
                <p className="text-xs text-muted-foreground">
                  {isTracking 
                    ? "Monitoring social platforms for this creation"
                    : "Enable to track mentions and trends"
                  }
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* YouTube Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>YouTube Sharing</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              YouTube doesn't support direct web sharing. Copy the caption below and paste it into your YouTube Short or video description:
            </p>
            
            <div className="bg-muted p-3 rounded-md text-sm">
              {generateCopyCaption(creation)}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleCopyCaption} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copy Caption
              </Button>
              <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};