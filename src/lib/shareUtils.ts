import { toast } from "@/hooks/use-toast";

export interface Creation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  vibe?: string;
  created_at: string;
  creation_type: string;
}

export type SharePlatform = 
  | 'twitter' 
  | 'facebook' 
  | 'instagram' 
  | 'snapchat' 
  | 'tiktok' 
  | 'reddit' 
  | 'linkedin' 
  | 'whatsapp' 
  | 'telegram' 
  | 'youtube'
  | 'web_share' 
  | 'copy_link';

export const detectWebShareSupport = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

export const detectMobile = (): boolean => {
  return typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const appendUTMs = (url: string, platform: SharePlatform): string => {
  const utmParams = new URLSearchParams({
    utm_source: platform,
    utm_medium: 'share',
    utm_campaign: 'creator_share'
  });
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${utmParams.toString()}`;
};

export const generateShareContent = (creation: Creation) => {
  const baseUrl = window.location.origin;
  const shareUrl = baseUrl; // Use main website instead of individual creation URL
  
  const content = {
    title: `Check out this AI-generated slang: "${creation.phrase}"`,
    text: `"${creation.phrase}" means ${creation.meaning}. Example: "${creation.example}" Create & Track your own slang & lingo at SlangLab. See if you start the next slang trend!`,
    url: shareUrl,
    hashtags: ['SlangLab', 'AISlang'],
  };

  return content;
};

export const generateCopyCaption = (creation: Creation): string => {
  const content = generateShareContent(creation);
  return `${content.title}\n\n${content.text}\n\n${content.url}\n\n#${content.hashtags.join(' #')}`;
};

export const formatForPlatform = (creation: Creation, platform: SharePlatform) => {
  const content = generateShareContent(creation);
  
  switch (platform) {
    case 'twitter':
      return {
        text: content.text,
        url: content.url,
        hashtags: content.hashtags.join(','),
      };
    
    case 'facebook':
      return {
        text: `${content.text} ${content.url}`,
        url: content.url,
      };
    
    case 'instagram':
    case 'snapchat':
    case 'tiktok':
      return {
        caption: `${content.text}\n\n${content.url}\n\n#${content.hashtags.join(' #')}`,
      };
    
    case 'reddit':
      return {
        title: content.title,
        text: `${content.text}\n\n${content.url}`,
      };
    
    case 'linkedin':
    case 'whatsapp':
    case 'telegram':
      return {
        text: `${content.text}\n\n${content.url}\n\n#${content.hashtags.join(' #')}`,
      };
    
    default:
      return content;
  }
};

export const handleWebShare = async (creation: Creation): Promise<boolean> => {
  if (!detectWebShareSupport()) return false;
  
  try {
    const content = generateShareContent(creation);
    await navigator.share({
      title: content.title,
      text: content.text,
      url: content.url,
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Web Share failed:', error);
    }
    return false;
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
};

export const openUrl = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const openApp = (deepLink: string): void => {
  try {
    window.location.href = deepLink;
  } catch (error) {
    console.error('Failed to open app:', error);
  }
};

export const getShareUrls = (creation: Creation) => {
  const baseContent = generateShareContent(creation);
  const shareUrlWithUTM = (platform: SharePlatform) => appendUTMs(baseContent.url, platform);
  
  const encodedUrl = (platform: SharePlatform) => encodeURIComponent(shareUrlWithUTM(platform));
  const encodedTitle = encodeURIComponent(baseContent.title);
  
  // Format content for all platforms consistently
  const twitterContent = formatForPlatform(creation, 'twitter') as { text: string; url: string; hashtags: string };
  const facebookContent = formatForPlatform(creation, 'facebook') as { text: string; url: string };
  const redditContent = formatForPlatform(creation, 'reddit') as { title: string; text: string };
  const linkedinContent = formatForPlatform(creation, 'linkedin') as { text: string };
  const whatsappContent = formatForPlatform(creation, 'whatsapp') as { text: string };
  const telegramContent = formatForPlatform(creation, 'telegram') as { text: string };
  
  return {
    twitter: `https://x.com/intent/tweet?text=${encodeURIComponent(twitterContent.text)}&url=${encodedUrl('twitter')}&hashtags=${twitterContent.hashtags}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl('facebook')}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl('reddit')}&title=${encodeURIComponent(redditContent.title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl('linkedin')}&title=${encodedTitle}&summary=${encodeURIComponent(linkedinContent.text)}`,
    whatsapp: `https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappContent.text)}`,
    telegram: `https://t.me/share/url?url=${encodedUrl('telegram')}&text=${encodeURIComponent(telegramContent.text)}`,
    youtube: shareUrlWithUTM('youtube'), // For copy functionality
    snapchat: shareUrlWithUTM('snapchat'), // For Snapchat Creative Kit
  };
};