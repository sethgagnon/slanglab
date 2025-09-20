import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  structuredData?: object;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'SlangLab - Evidence-Based Slang Decoder & Creator',
  description = 'Get evidence-based definitions with confidence scores, safety labels, and citations. Ideal for parents, teachers, and anyone navigating today\'s slang.',
  keywords = 'slang, decoder, dictionary, modern slang, teen language, slang creator, confidence scores, safety labels',
  image = 'https://lovable.dev/opengraph-image-p98pqg.png',
  url = 'https://slang-decoder-lab.lovable.app',
  type = 'website',
  author = 'SlangLab',
  publishedTime,
  modifiedTime,
  structuredData
}) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('author', author);

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'SlangLab', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    updateMetaTag('twitter:site', '@slanglab_app');

    // Article specific tags
    if (type === 'article' && publishedTime) {
      updateMetaTag('article:published_time', publishedTime, true);
      updateMetaTag('article:author', author, true);
    }

    if (modifiedTime) {
      updateMetaTag('article:modified_time', modifiedTime, true);
    }

    // Structured data
    if (structuredData) {
      let script = document.querySelector('#structured-data') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = 'structured-data';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function
    return () => {
      // Remove structured data when component unmounts
      const structuredDataScript = document.querySelector('#structured-data');
      if (structuredDataScript && !structuredData) {
        structuredDataScript.remove();
      }
    };
  }, [title, description, keywords, image, url, type, author, publishedTime, modifiedTime, structuredData]);

  return null;
};

// Predefined structured data schemas
export const createWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "SlangLab",
  "description": "Evidence-based slang decoder and creator platform",
  "url": "https://slang-decoder-lab.lovable.app",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://slang-decoder-lab.lovable.app/lookup?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
});

export const createSlangEntrySchema = (slang: {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  created_at: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": slang.phrase,
  "description": slang.meaning,
  "text": slang.example,
  "dateCreated": slang.created_at,
  "url": `https://slang-decoder-lab.lovable.app/slang/${slang.id}`,
  "creator": {
    "@type": "Organization",
    "name": "SlangLab Community"
  },
  "genre": "Slang Dictionary Entry",
  "inLanguage": "en-US"
});

export const createOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SlangLab",
  "description": "Evidence-based slang decoder and creator platform",
  "url": "https://slang-decoder-lab.lovable.app",
  "logo": "https://slang-decoder-lab.lovable.app/favicon.ico",
  "foundingDate": "2025",
  "applicationCategory": "Educational Technology",
  "operatingSystem": "Web Browser"
});