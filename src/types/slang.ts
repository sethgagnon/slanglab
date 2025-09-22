// Phase 1: Safety Backbone + Age Controls - Type Definitions

export type AgeBand = '11-13' | '14-17' | '18-22';

export type ContentFormat = 'word' | 'short_phrase' | 'emoji_word_mash';

export type ContentContext = 
  | 'homework' 
  | 'food' 
  | 'sports' 
  | 'gaming' 
  | 'music' 
  | 'fashion' 
  | 'generic' 
  | 'inside-joke';

export interface AgePolicy {
  ageBand: AgeBand;
  requireSchoolSafe: boolean;
  maxCreativity: number;
  allowedFormats: ContentFormat[];
  allowedContexts: ContentContext[];
  canShare: boolean;
}

export interface SlangItem {
  phrase: string;
  meaning: string;
  example: string;
  safeFlag?: boolean;
  format?: ContentFormat;
  context?: ContentContext;
}

export interface GenerateSlangRequest {
  vibe: string;
  ageBand?: AgeBand;
  schoolSafe?: boolean;
  creativity?: number;
  format?: ContentFormat;
  context?: ContentContext;
}

export interface GenerateSlangResponse {
  success: boolean;
  creations: SlangItem[];
  isFromAI: boolean;
  message: string;
  cached?: boolean;
  canRetry?: boolean;
  ageBand?: AgeBand;
  appliedPolicy?: AgePolicy;
}

// OpenAI Structured Output Schema
export const slangJsonSchema = {
  type: "object",
  properties: {
    slang_items: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          phrase: {
            type: "string",
            minLength: 1,
            maxLength: 50,
            description: "1-3 word slang phrase"
          },
          meaning: {
            type: "string", 
            minLength: 5,
            maxLength: 100,
            description: "Brief explanation (15-20 words maximum)"
          },
          example: {
            type: "string",
            minLength: 5,
            maxLength: 150,
            description: "Natural conversational sentence using the phrase"
          }
        },
        required: ["phrase", "meaning", "example"],
        additionalProperties: false
      }
    }
  },
  required: ["slang_items"],
  additionalProperties: false
} as const;

// Content blocklist patterns
export const CONTENT_BLOCKLIST = [
  // Profanity and slurs
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'ass', 'crap', 'piss',
  'fck', 'sh*t', 'b*tch', 'd*mn', 'h*ll', '@ss',
  
  // Sexual content
  'sex', 'sexy', 'hot', 'horny', 'porn', 'nude', 'naked',
  's3x', 's3xy', 'h0t', 'p0rn',
  
  // Drugs and alcohol
  'drunk', 'wasted', 'high', 'stoned', 'blazed', 'lit', 'turnt',
  'beer', 'wine', 'vodka', 'weed', 'pot', 'marijuana',
  'd*nk', 'w33d', 'p0t',
  
  // Violence and weapons
  'kill', 'murder', 'gun', 'knife', 'weapon', 'shoot', 'stab',
  'k*ll', 'murd3r', 'sh00t',
  
  // Self-harm and mental health
  'suicide', 'depression', 'cutting', 'harm', 'hurt',
  'su*c*de', 'd3pr3ss10n',
  
  // Hate speech
  'hate', 'racist', 'nazi', 'terrorist',
  'h@te', 'rac*st'
];

export const CONTENT_BLOCKLIST_REGEX = [
  // Leetspeak variations
  /[s5][h3][i1][t7]/gi, // shit variations
  /[f][u][c][k]/gi,     // fuck variations  
  /[b][i1][t7][c][h]/gi, // bitch variations
  /[a@][s5]{2}/gi,      // ass variations
  /[d][a@][m][n]/gi,    // damn variations
  
  // Sexual content patterns
  /[s5][e3][x]/gi,      // sex variations
  /[h][o0][t]/gi,       // hot (context-dependent)
  /[p][o0][r][n]/gi,    // porn variations
  
  // Drug patterns
  /[w][e3]{2}[d]/gi,    // weed variations
  /[h][i1][g][h]/gi,    // high (context-dependent)
  /[s5][t7][o0][n][e3][d]/gi, // stoned variations
  
  // Violence patterns
  /[k][i1][l]{2}/gi,    // kill variations
  /[s5][h][o0]{2}[t7]/gi, // shoot variations
  
  // Common substitution patterns
  /[0-9@$!#%^&*]+/g     // Excessive special chars/numbers
];

// Age-specific vibe filtering
export const AGE_RESTRICTED_VIBES: Record<AgeBand, string[]> = {
  '11-13': ['gentle-roast'], // Remove potentially confusing vibes for youngest group
  '14-17': [], // Allow all vibes
  '18-22': []  // Allow all vibes
};