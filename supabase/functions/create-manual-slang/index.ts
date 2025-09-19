import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Check if user can create content (not banned/too many strikes)
    const { data: canCreate, error: strikeError } = await supabase
      .rpc('user_can_create_content', { user_uuid: user.id });
    
    if (strikeError) {
      console.error('Error checking user strikes:', strikeError);
      throw new Error('Unable to verify user status');
    }

    if (!canCreate) {
      return new Response(
        JSON.stringify({ 
          error: 'Your account has been temporarily restricted due to policy violations. Please contact support if you believe this is an error.',
          code: 'USER_RESTRICTED'
        }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { phrase, meaning, example } = await req.json();

    // Validate input
    if (!phrase || !meaning || !example) {
      throw new Error('phrase, meaning, and example are required');
    }

    // Validate phrase length (1-3 words)
    const words = phrase.trim().split(/\s+/);
    if (words.length > 3) {
      throw new Error('Phrase must be 3 words or less');
    }

    // Validate content length
    if (phrase.length > 100 || meaning.length > 500 || example.length > 500) {
      throw new Error('Content exceeds maximum length limits');
    }

    // Get user profile to check plan and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, role')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Unable to verify user plan');
    }

    const isAdmin = profile?.role === 'admin';
    const isLabPro = profile?.plan === 'labpro';

    // Check weekly limits for non-admin, non-LabPro users (3 manual creations per week)
    if (!isAdmin && !isLabPro) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
      weekStart.setHours(0, 0, 0, 0);

      const { data: weeklyLimits, error: limitsError } = await supabase
        .from('limits')
        .select('manual_generations_used')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .single();

      if (limitsError && limitsError.code !== 'PGRST116') {
        console.error('Error checking weekly limits:', limitsError);
        throw new Error('Unable to verify usage limits');
      }

      const currentUsage = weeklyLimits?.manual_generations_used || 0;
      if (currentUsage >= 3) {
        return new Response(
          JSON.stringify({ 
            error: 'Weekly manual creation limit reached (3 per week). Upgrade to LabPro for unlimited manual creations.',
            code: 'LIMIT_EXCEEDED'
          }), 
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Comprehensive content moderation
    const moderationResult = await moderateContent({ phrase, meaning, example });
    
    if (!moderationResult.safe) {
      // Log potential violation
      console.log('Content moderation violation:', {
        user_id: user.id,
        content: { phrase, meaning, example },
        violations: moderationResult.violations
      });

      return new Response(
        JSON.stringify({ 
          error: 'Content violates community guidelines. Please review our content policy and try again with appropriate language.',
          violations: moderationResult.violations,
          code: 'CONTENT_VIOLATION'
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert the validated slang entry
    const { data: creation, error: insertError } = await supabase
      .from('creations')
      .insert({
        user_id: user.id,
        phrase: phrase.trim(),
        meaning: meaning.trim(),
        example: example.trim(),
        creation_type: 'manual',
        vibe: 'manual',
        safe_flag: moderationResult.safe,
        moderation_status: moderationResult.requiresReview ? 'flagged' : 'approved',
        moderation_reason: moderationResult.requiresReview ? 'Flagged for manual review' : null,
        moderated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting creation:', insertError);
      throw new Error('Failed to save slang creation');
    }

    // Update limits for non-admin, non-LabPro users
    if (!isAdmin && !isLabPro) {
      await updateManualCreationLimits(supabase, user.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        creation,
        message: moderationResult.requiresReview ? 'Creation submitted for review' : 'Creation added successfully'
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-manual-slang function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function moderateContent(content: { phrase: string; meaning: string; example: string }) {
  const violations: string[] = [];
  let requiresReview = false;

  // 1. Check banned terms database
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: bannedTerms } = await supabase
    .from('banned_terms')
    .select('phrase');

  const bannedWords = bannedTerms?.map(t => t.phrase.toLowerCase()) || [];
  
  // Check all content fields for banned words
  const allContent = `${content.phrase} ${content.meaning} ${content.example}`.toLowerCase();
  const foundBanned = bannedWords.filter(word => allContent.includes(word));
  
  if (foundBanned.length > 0) {
    violations.push('Contains inappropriate language');
    return { safe: false, violations, requiresReview: false };
  }

  // 2. OpenAI Moderation API check
  try {
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: `${content.phrase}: ${content.meaning}. Example: ${content.example}`
      }),
    });

    if (moderationResponse.ok) {
      const moderation = await moderationResponse.json();
      const result = moderation.results[0];
      
      if (result.flagged) {
        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category, _]) => category);
        
        violations.push(`Flagged by AI moderation: ${flaggedCategories.join(', ')}`);
        
        // Some violations require human review rather than auto-rejection
        const reviewCategories = ['harassment', 'hate'];
        requiresReview = flaggedCategories.some(cat => reviewCategories.includes(cat));
        
        if (!requiresReview) {
          return { safe: false, violations, requiresReview: false };
        }
      }
    }
  } catch (error) {
    console.error('OpenAI moderation error:', error);
    // Continue without OpenAI moderation if it fails
  }

  // 3. Pattern matching for disguised content
  const patterns = [
    /f[*@#$]ck/gi,
    /sh[*@#$]t/gi,
    /b[*@#$]tch/gi,
    /n[*@#$]gger/gi,
    /\d+\s*(kill|murder|die)/gi,
    /(k\s*i\s*l\s*l|k1ll|ki11)/gi,
  ];

  for (const pattern of patterns) {
    if (pattern.test(allContent)) {
      violations.push('Contains disguised inappropriate content');
      return { safe: false, violations, requiresReview: false };
    }
  }

  // 4. Check for concerning mental health content that needs review
  const concerningPatterns = [
    /\b(suicide|kill myself|end it all|want to die)\b/gi,
    /\b(cutting|self harm|hurt myself)\b/gi,
  ];

  for (const pattern of concerningPatterns) {
    if (pattern.test(allContent)) {
      violations.push('Contains content requiring review');
      requiresReview = true;
    }
  }

  return { 
    safe: violations.length === 0 || requiresReview, 
    violations, 
    requiresReview 
  };
}

async function updateManualCreationLimits(supabase: any, userId: string) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Try to update existing record
  const { error: updateError } = await supabase
    .from('limits')
    .update({ 
      manual_generations_used: supabase.sql`manual_generations_used + 1`
    })
    .eq('user_id', userId)
    .eq('week_start_date', weekStartStr);

  if (updateError && updateError.code === 'PGRST116') {
    // No existing record, create new one
    await supabase
      .from('limits')
      .insert({
        user_id: userId,
        week_start_date: weekStartStr,
        manual_generations_used: 1,
        date: weekStartStr
      });
  }
}