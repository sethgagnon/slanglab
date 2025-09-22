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
  usage_examples?: string[];     // 1-2 additional examples
  part_of_speech?: string;       // POS chip (noun, verb, adjective, etc.)
  notes_for_moderator?: string;  // Safety explanation for tooltip
  safeFlag?: boolean;
  format?: ContentFormat;
  context?: ContentContext;
}

export interface GenerateSlangRequest {
  vibeTags: string[];           // Multi-select vibes
  context: ContentContext;      // Single context selection
  format: ContentFormat;        // Explicit format selection
  creativity: number;
  ageBand?: AgeBand;
  schoolSafe?: boolean;
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
          },
          usage_examples: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "string",
              minLength: 5,
              maxLength: 150
            },
            description: "1-2 additional usage examples"
          },
          part_of_speech: {
            type: "string",
            maxLength: 20,
            description: "Part of speech (noun, verb, adjective, etc.)"
          },
          notes_for_moderator: {
            type: "string",
            maxLength: 200,
            description: "Brief explanation of why this content is safe and appropriate"
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

// Content blocklist patterns - Enhanced for Phase 3
export const CONTENT_BLOCKLIST = [
  // Profanity and slurs (expanded)
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'ass', 'crap', 'piss', 'fag', 'retard',
  'fck', 'fuk', 'sh*t', 'sh1t', 'b*tch', 'b1tch', 'd*mn', 'd@mn', 'h*ll', 'h3ll', '@ss', 'a$$',
  'f.u.c.k', 's.h.i.t', 'b.i.t.c.h', 'a.s.s',
  
  // Sexual content (expanded)
  'sex', 'sexy', 'hot', 'horny', 'porn', 'nude', 'naked', 'penis', 'vagina', 'boobs', 'tits',
  'orgasm', 'masturbate', 'dildo', 'vibrator', 'anal', 'oral', 'cum', 'jizz', 'sperm',
  's3x', 's3xy', 'h0t', 'h07', 'p0rn', 'p*rn', 'n@ked', 'nak3d', 'b00bs', 'b00b5',
  's.e.x', 'p.o.r.n', 'n.u.d.e',
  
  // Drugs and alcohol (expanded)
  'drunk', 'wasted', 'high', 'stoned', 'blazed', 'lit', 'turnt', 'hammered', 'fucked up',
  'beer', 'wine', 'vodka', 'whiskey', 'tequila', 'rum', 'gin', 'alcohol', 'booze', 'liquor',
  'weed', 'pot', 'marijuana', 'cannabis', 'grass', 'herb', 'joint', 'blunt', 'bong', 'dab',
  'cocaine', 'coke', 'crack', 'heroin', 'meth', 'ecstasy', 'molly', 'acid', 'lsd', 'shrooms',
  'd*nk', 'w33d', 'p0t', 'w33d', 'mar1juana', 'c0caine', 'c0ke', 'h3roin', 'm3th',
  'd.r.u.n.k', 'w.e.e.d', 'c.o.k.e',
  
  // Violence and weapons (expanded)
  'kill', 'murder', 'gun', 'knife', 'weapon', 'shoot', 'stab', 'bomb', 'grenade', 'pistol',
  'rifle', 'shotgun', 'blade', 'sword', 'machete', 'axe', 'hammer', 'club', 'bat',
  'suicide bomber', 'terrorist', 'assassin', 'hitman', 'serial killer',
  'k*ll', 'k1ll', 'murd3r', 'sh00t', 'sh007', 'b0mb', 'p1stol', 'r1fle',
  'k.i.l.l', 'm.u.r.d.e.r', 's.h.o.o.t',
  
  // Self-harm and mental health (expanded)
  'suicide', 'kill myself', 'end it all', 'cutting', 'self harm', 'hurt myself', 'razor',
  'depression', 'anxiety', 'ptsd', 'bipolar', 'schizophrenia', 'eating disorder',
  'anorexia', 'bulimia', 'self injury', 'overdose',
  'su*c*de', 'su1c1de', 'd3pr3ss10n', 'anx13ty', 'cut71ng',
  's.u.i.c.i.d.e', 'c.u.t.t.i.n.g',
  
  // Hate speech and slurs (expanded)
  'nigger', 'nigga', 'faggot', 'dyke', 'tranny', 'chink', 'gook', 'spic', 'wetback',
  'kike', 'kyke', 'sand nigger', 'towelhead', 'raghead', 'terrorist', 'jihad',
  'nazi', 'hitler', 'holocaust', 'kkk', 'white power', 'white supremacy',
  'n*gger', 'n1gger', 'f@ggot', 'f@g', 'tr@nny', 'ch1nk', 'g00k', 'sp1c',
  'n.i.g.g.e.r', 'f.a.g.g.o.t', 'n.a.z.i',
  
  // General offensive terms
  'whore', 'slut', 'prostitute', 'hooker', 'pimp', 'pedophile', 'rapist', 'molester',
  'wh0re', 'sl*t', 'pr0stitute', 'h00ker', 'p3dophile', 'rap1st',
  'w.h.o.r.e', 's.l.u.t'
];

export const CONTENT_BLOCKLIST_REGEX = [
  // Enhanced leetspeak and obfuscation patterns
  /[s5$][h3][i1!][t7+]/gi, // shit variations
  /[f][u][c][k]/gi,        // fuck variations  
  /[b][i1!][t7+][c][h3]/gi, // bitch variations
  /[a@4][s5$]{2,}/gi,      // ass variations
  /[d][a@4][m][n]/gi,      // damn variations
  /[n][i1!][g9][g9][e3][r]/gi, // n-word variations
  /[f][a@4][g9]{2}[o0][t7+]/gi, // f-word slur variations
  
  // Sexual content patterns (enhanced)
  /[s5$][e3][x]/gi,        // sex variations
  /[p][o0][r][n]/gi,       // porn variations
  /[n][u][d][e3]/gi,       // nude variations
  /[h][o0][r][n][y]/gi,    // horny variations
  /[o0][r][g9][a@4][s5$][m]/gi, // orgasm variations
  
  // Drug patterns (enhanced)
  /[w][e3]{2}[d]/gi,       // weed variations
  /[h][i1!][g9][h3]/gi,    // high variations (context-dependent)
  /[s5$][t7+][o0][n][e3][d]/gi, // stoned variations
  /[c][o0][c][a@4][i1!][n][e3]/gi, // cocaine variations
  /[h3][e3][r][o0][i1!][n]/gi, // heroin variations
  /[m][e3][t7+][h3]/gi,    // meth variations
  
  // Violence patterns (enhanced)
  /[k][i1!][l]{2}/gi,      // kill variations
  /[m][u][r][d][e3][r]/gi, // murder variations
  /[s5$][h3][o0]{2}[t7+]/gi, // shoot variations
  /[b][o0][m][b]/gi,       // bomb variations
  /[g9][u][n]/gi,          // gun variations
  /[k][n][i1!][f][e3]/gi,  // knife variations
  
  // Self-harm patterns
  /[s5$][u][i1!][c][i1!][d][e3]/gi, // suicide variations
  /[c][u][t7+]{2}[i1!][n][g9]/gi,  // cutting variations
  /[s5$][e3][l][f][\s\.\-_]*[h3][a@4][r][m]/gi, // self harm variations
  
  // Hate speech patterns
  /[n][a@4][z][i1!]/gi,    // nazi variations
  /[h3][i1!][t7+][l][e3][r]/gi, // hitler variations
  /[t7+][e3][r]{2}[o0][r][i1!][s5$][t7+]/gi, // terrorist variations
  
  // Advanced obfuscation patterns
  /(.)\1{4,}/gi,           // Repeated characters (aaaa, 1111)
  /[0-9@$!#%^&*]{3,}/gi,   // Excessive special chars/numbers
  /[\.\-_\s]{2,}/gi,       // Multiple dots/dashes/spaces for separation
  /[aeiou]/gi,             // Vowel removal patterns (common obfuscation)
  /([a-z])\1+/gi,          // Character repetition (heeello)
  /\b[a-z]*[0-9]+[a-z]*\b/gi, // Mixed numbers in words
  /[^a-zA-Z0-9\s]{2,}/gi   // Multiple special characters together
];

// Age-specific vibe filtering
export const AGE_RESTRICTED_VIBES: Record<AgeBand, string[]> = {
  '11-13': ['gentle-roast'], // Remove potentially confusing vibes for youngest group
  '14-17': [], // Allow all vibes
  '18-22': []  // Allow all vibes
};