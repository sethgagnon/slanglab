import { toast } from "@/hooks/use-toast";

export interface Creation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  vibe: string;
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
  | 'web_share' 
  | 'copy_link';

export const detectWebShareSupport = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

export const detectMobile = (): boolean => {
  return typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const generateShareContent = (creation: Creation) => {
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/slang/${creation.id}`;
  
  const content = {
    title: `Check out this AI-generated slang: "${creation.phrase}"`,
    text: `"${creation.phrase}" means ${creation.meaning}. Example: "${creation.example}" #SlangLab #AISlang #${creation.vibe}`,
    url: shareUrl,
    hashtags: ['SlangLab', 'AISlang', creation.vibe],
  };

  return content;
};

export const formatForPlatform = (creation: Creation, platform: SharePlatform) => {
  const content = generateShareContent(creation);
  
  switch (platform) {
    case 'twitter':
      return {
        text: `${content.text} ${content.url}`,
        hashtags: content.hashtags.join(','),
      };
    
    case 'facebook':
      return {
        text: content.text,
        url: content.url,
      };
    
    case 'instagram':
    case 'snapchat':
    case 'tiktok':
      return {
        caption: `${content.text}\n\nGenerated with SlangLab 🚀\n${content.url}`,
      };
    
    case 'reddit':
      return {
        title: content.title,
        text: `${content.text}\n\n${content.url}`,
      };
    
    case 'linkedin':
      return {
        text: `${content.text}\n\n${content.url}`,
      };
    
    case 'whatsapp':
    case 'telegram':
      return {
        text: `${content.text}\n\n${content.url}`,
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
  const encodedUrl = encodeURIComponent(baseContent.url);
  const encodedTitle = encodeURIComponent(baseContent.title);
  
  // Format content for Twitter/X with character limit consideration
  const twitterContent = formatForPlatform(creation, 'twitter');
  const twitterText = twitterContent.text.length > 250 ? 
    `"${creation.phrase}" means ${creation.meaning}. Check it out!` : 
    twitterContent.text;
  const encodedTwitterText = encodeURIComponent(twitterText);
  
  // Format content for other platforms
  const linkedinContent = formatForPlatform(creation, 'linkedin');
  const whatsappContent = formatForPlatform(creation, 'whatsapp');
  const telegramContent = formatForPlatform(creation, 'telegram');
  
  return {
    twitter: `https://x.com/intent/tweet?text=${encodedTwitterText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(baseContent.text)}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodeURIComponent(linkedinContent.text)}`,
    whatsapp: `https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappContent.text)}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(telegramContent.text)}`,
  };
};