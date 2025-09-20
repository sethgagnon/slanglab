// Facebook SDK utility for proper share dialog integration
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface FacebookSDKConfig {
  appId?: string;
  version?: string;
}

class FacebookSDKManager {
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<boolean> | null = null;

  async loadSDK(config: FacebookSDKConfig = {}): Promise<boolean> {
    // Return existing promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    if (this.isLoaded) {
      return true;
    }

    this.loadPromise = new Promise((resolve) => {
      this.isLoading = true;

      // Configure Facebook SDK initialization
      window.fbAsyncInit = () => {
        window.FB.init({
          appId: config.appId || '1', // Generic app ID for basic sharing
          xfbml: true,
          version: config.version || 'v18.0'
        });
        this.isLoaded = true;
        this.isLoading = false;
        resolve(true);
      };

      // Load the SDK script
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.onerror = () => {
        this.isLoading = false;
        resolve(false);
      };
      
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async shareDialog(url: string, quote?: string): Promise<boolean> {
    try {
      console.log('Attempting Facebook share for URL:', url);
      const loaded = await this.loadSDK();
      
      if (!loaded) {
        console.warn('Facebook SDK failed to load');
        return false;
      }
      
      if (!window.FB) {
        console.warn('Facebook SDK not available on window object');
        return false;
      }

      return new Promise((resolve) => {
        window.FB.ui({
          method: 'share',
          href: url,
          quote: quote
        }, (response: any) => {
          console.log('Facebook share response:', response);
          
          // Check if user cancelled the dialog
          if (!response || response.error_code) {
            console.log('Facebook share cancelled or failed:', response);
            resolve(false);
            return;
          }
          
          // Share was successful
          console.log('Facebook share successful');
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Facebook share error:', error);
      return false;
    }
  }
}

export const facebookSDK = new FacebookSDKManager();