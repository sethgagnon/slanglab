import { supabase } from "@/integrations/supabase/client";

export interface SearchSource {
  name: string;
  base_url: string;
}

// In-memory cache for sources
let sourcesCache: SearchSource[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Realtime subscription for cache invalidation
let realtimeChannel: any = null;

function invalidateCache() {
  console.log('[SOURCES] Cache invalidated');
  sourcesCache = null;
  cacheTimestamp = 0;
}

function initializeRealtime() {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('search_sources_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'search_sources'
      },
      (payload) => {
        console.log('[SOURCES] Realtime update received:', payload.eventType);
        invalidateCache();
      }
    )
    .subscribe();

  console.log('[SOURCES] Realtime subscription initialized');
}

export async function getTopSources(): Promise<SearchSource[]> {
  // Initialize realtime on first call
  initializeRealtime();

  // Check cache validity
  const now = Date.now();
  if (sourcesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[SOURCES] Returning cached sources');
    return sourcesCache;
  }

  try {
    console.log('[SOURCES] Fetching fresh sources from API');
    
    const { data, error } = await supabase.functions.invoke('get-active-sources', {
      method: 'GET'
    });

    if (error) {
      console.error('[SOURCES] API error:', error);
      throw error;
    }

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from get-active-sources');
    }

    // Update cache
    sourcesCache = data as SearchSource[];
    cacheTimestamp = now;

    console.log(`[SOURCES] Cached ${sourcesCache.length} sources:`, 
      sourcesCache.map(s => s.name).join(', '));

    return sourcesCache;

  } catch (error) {
    console.error('[SOURCES] Failed to fetch sources:', error);
    
    // Return fallback sources if available in cache or use defaults
    if (sourcesCache) {
      console.log('[SOURCES] Using stale cache as fallback');
      return sourcesCache;
    }

    // Absolute fallback - return required sources
    console.log('[SOURCES] Using hardcoded fallback sources');
    return [
      { name: 'UrbanDictionary', base_url: 'https://www.urbandictionary.com' },
      { name: 'TikTok', base_url: 'https://www.tiktok.com' }
    ];
  }
}

// Cleanup function for component unmounting
export function cleanupSourcesCache() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  invalidateCache();
}