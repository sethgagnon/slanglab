// Phase 1: Safety Backbone + Age Controls - Age Policy Library

import type { AgeBand, AgePolicy, ContentFormat, ContentContext } from '@/types/slang';

/**
 * Get age-specific content policy (client-side helper)
 * Note: Server-side enforcement is authoritative, this is for UI guidance only
 */
export function getAgePolicyForBand(ageBand: AgeBand): AgePolicy {
  switch (ageBand) {
    case '11-13':
      return {
        ageBand: '11-13',
        requireSchoolSafe: true,
        maxCreativity: 0.6,
        allowedFormats: ['word', 'short_phrase'],
        allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
        canShare: false
      };
    case '14-17':
      return {
        ageBand: '14-17',
        requireSchoolSafe: true,
        maxCreativity: 0.7,
        allowedFormats: ['word', 'short_phrase', 'emoji_word_mash'],
        allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'fashion', 'generic', 'inside-joke'],
        canShare: true
      };
    case '18+':
      return {
        ageBand: '18+',
        requireSchoolSafe: false,
        maxCreativity: 0.8,
        allowedFormats: ['word', 'short_phrase', 'emoji_word_mash'],
        allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'fashion', 'generic', 'inside-joke'],
        canShare: true
      };
    default:
      // Default to safest policy
      return {
        ageBand: '11-13',
        requireSchoolSafe: true,
        maxCreativity: 0.6,
        allowedFormats: ['word', 'short_phrase'],
        allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
        canShare: false
      };
  }
}

/**
 * Check if a platform is allowed for sharing based on age band
 */
export function canShareToPlatform(
  ageBand: AgeBand, 
  platform: 'reddit' | 'youtube' | 'snapchat' | 'facebook' | 'twitter' | 'tiktok'
): boolean {
  // Under 13: no public sharing (most platforms are 13+)
  if (ageBand === '11-13') {
    return false;
  }
  
  // 14-17 and 18-22: allow sharing to 13+ platforms
  return true;
}

/**
 * Get creativity slider constraints for UI
 */
export function getCreativityConstraints(ageBand: AgeBand) {
  const policy = getAgePolicyForBand(ageBand);
  return {
    min: 0.1,
    max: policy.maxCreativity,
    default: Math.min(0.7, policy.maxCreativity),
    step: 0.1
  };
}

/**
 * Filter vibes based on age appropriateness
 */
export function filterVibesForAge(
  vibes: Array<{ value: string; label: string }>, 
  ageBand: AgeBand
): Array<{ value: string; label: string }> {
  const policy = getAgePolicyForBand(ageBand);
  
  // For youngest group, filter out potentially confusing vibes
  if (ageBand === '11-13') {
    return vibes.filter(vibe => vibe.value !== 'gentle-roast');
  }
  
  return vibes;
}

/**
 * Get sharing button configuration based on age
 */
export function getSharingConfig(ageBand: AgeBand) {
  const policy = getAgePolicyForBand(ageBand);
  
  return {
    canShare: policy.canShare,
    allowedPlatforms: policy.canShare ? 
      ['reddit', 'twitter', 'facebook', 'tiktok'] : [],
    showWarning: ageBand === '14-17', // Show ToS reminder for teens
    warningMessage: ageBand === '14-17' ? 
      'Public posts are visible to everyone. Share responsibly!' : null
  };
}

/**
 * Validate request parameters against age policy (client-side)
 */
export function validateRequestForAge(
  request: {
    creativity?: number;
    format?: ContentFormat;
    context?: ContentContext;
    schoolSafe?: boolean;
  },
  ageBand: AgeBand
) {
  const policy = getAgePolicyForBand(ageBand);
  const errors: string[] = [];
  
  // Check creativity bounds
  if (request.creativity && request.creativity > policy.maxCreativity) {
    errors.push(`Creativity level too high for age group (max: ${policy.maxCreativity})`);
  }
  
  // Check format allowed
  if (request.format && !policy.allowedFormats.includes(request.format)) {
    errors.push(`Format "${request.format}" not allowed for age group`);
  }
  
  // Check context allowed
  if (request.context && !policy.allowedContexts.includes(request.context)) {
    errors.push(`Context "${request.context}" not allowed for age group`);
  }
  
  // Check school-safe requirement - Phase 3: Only 18+ can disable school-safe
  if (request.schoolSafe === false && ageBand !== '18+') {
    errors.push('School-safe mode can only be disabled for ages 18+');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get user-friendly age band display
 */
export function getAgeBandDisplay(ageBand: AgeBand): string {
  switch (ageBand) {
    case '11-13':
      return '11-13 years (Enhanced Safety)';
    case '14-17':
      return '14-17 years (School-Safe Required)';
    case '18+':
      return '18+ years (Full Access)';
    default:
      return 'Unknown Age Range';
  }
}

/**
 * Calculate age band from birth date (client-side helper)
 */
export function calculateAgeBand(birthDate: string): AgeBand {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  if (age >= 11 && age <= 13) return '11-13';
  if (age >= 14 && age <= 17) return '14-17';
  if (age >= 18) return '18+';
  
  // Default to safest for out-of-range ages
  return '11-13';
}