import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-BILLING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    logStep('Starting billing data sync');

    // Get admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can sync billing data');
    }

    logStep('Admin authentication verified');

    const results = await Promise.allSettled([
      syncOpenAIBilling(),
      syncStripeBilling(),
      syncSerpAPIBilling()
    ]);

    logStep('Billing sync completed', { results: results.map(r => r.status) });

    return new Response(JSON.stringify({ 
      success: true, 
      results: results.map((r, i) => ({
        provider: ['openai', 'stripe', 'serpapi'][i],
        status: r.status,
        error: r.status === 'rejected' ? r.reason : null
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('ERROR in sync-billing-data', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function syncOpenAIBilling() {
  logStep('Syncing OpenAI billing data');
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get usage data for current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // OpenAI Usage API
    const usageResponse = await fetch(
      `https://api.openai.com/v1/usage?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!usageResponse.ok) {
      throw new Error(`OpenAI API error: ${usageResponse.status}`);
    }

    const usageData = await usageResponse.json();
    logStep('OpenAI usage data retrieved', { 
      totalUsage: usageData.total_usage,
      dailyUsage: usageData.daily_usage?.length
    });

    // Calculate total cost from usage data
    let totalCost = 0;
    const usageDetails = {
      models: {},
      totalTokens: 0,
      totalRequests: 0
    };

    if (usageData.daily_usage) {
      usageData.daily_usage.forEach((day: any) => {
        day.results?.forEach((result: any) => {
          if (result.aggregated_by === 'model') {
            const modelName = result.model || 'unknown';
            const tokens = result.n_context_tokens_total || 0;
            const requests = result.n_requests || 0;
            
            if (!usageDetails.models[modelName]) {
              usageDetails.models[modelName] = { tokens: 0, requests: 0, cost: 0 };
            }
            
            usageDetails.models[modelName].tokens += tokens;
            usageDetails.models[modelName].requests += requests;
            usageDetails.totalTokens += tokens;
            usageDetails.totalRequests += requests;

            // Estimate cost based on model pricing
            let costPerToken = 0;
            if (modelName.includes('gpt-4')) costPerToken = 0.00003;
            else if (modelName.includes('gpt-3.5')) costPerToken = 0.000002;
            else if (modelName.includes('text-moderation')) costPerToken = 0.000002;
            
            const modelCost = tokens * costPerToken;
            usageDetails.models[modelName].cost += modelCost;
            totalCost += modelCost;
          }
        });
      });
    }

    // Store billing data
    await supabase.from('billing_data').upsert({
      provider: 'openai',
      billing_period_start: startDate.toISOString().split('T')[0],
      billing_period_end: endDate.toISOString().split('T')[0],
      total_cost: totalCost,
      usage_details: usageDetails,
      raw_billing_data: usageData,
      synced_at: new Date().toISOString()
    });

    logStep('OpenAI billing data synced', { totalCost, totalTokens: usageDetails.totalTokens });
    return { provider: 'openai', totalCost, usageDetails };

  } catch (error) {
    logStep('OpenAI billing sync error', { error: error.message });
    throw error;
  }
}

async function syncStripeBilling() {
  logStep('Syncing Stripe billing data');
  
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    throw new Error('Stripe API key not configured');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get current month's subscriptions and payments
    const now = new Date();
    const startDate = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    const endDate = Math.floor(new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() / 1000);

    // Fetch active subscriptions
    const subscriptionsResponse = await fetch(
      'https://api.stripe.com/v1/subscriptions?status=all&limit=100',
      {
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!subscriptionsResponse.ok) {
      throw new Error(`Stripe API error: ${subscriptionsResponse.status}`);
    }

    const subscriptionsData = await subscriptionsResponse.json();
    
    // Calculate revenue
    let totalRevenue = 0;
    const revenueDetails = {
      activeSubscriptions: 0,
      totalSubscriptions: subscriptionsData.data.length,
      planBreakdown: {}
    };

    subscriptionsData.data.forEach((sub: any) => {
      if (sub.status === 'active') {
        revenueDetails.activeSubscriptions++;
        const amount = sub.items.data[0]?.price?.unit_amount || 0;
        totalRevenue += amount / 100; // Convert from cents
        
        const planName = sub.items.data[0]?.price?.nickname || 'Unknown Plan';
        if (!revenueDetails.planBreakdown[planName]) {
          revenueDetails.planBreakdown[planName] = { count: 0, revenue: 0 };
        }
        revenueDetails.planBreakdown[planName].count++;
        revenueDetails.planBreakdown[planName].revenue += amount / 100;
      }
    });

    // Store Stripe revenue data
    await supabase.from('billing_data').upsert({
      provider: 'stripe',
      billing_period_start: new Date(startDate * 1000).toISOString().split('T')[0],
      billing_period_end: new Date(endDate * 1000).toISOString().split('T')[0],
      total_cost: -totalRevenue, // Negative because it's revenue, not cost
      usage_details: revenueDetails,
      raw_billing_data: subscriptionsData,
      synced_at: new Date().toISOString()
    });

    logStep('Stripe billing data synced', { totalRevenue, activeSubscriptions: revenueDetails.activeSubscriptions });
    return { provider: 'stripe', totalRevenue, revenueDetails };

  } catch (error) {
    logStep('Stripe billing sync error', { error: error.message });
    throw error;
  }
}

async function syncSerpAPIBilling() {
  logStep('Syncing SerpAPI billing data');
  
  const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
  if (!serpApiKey) {
    throw new Error('SerpAPI key not configured');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get account info and usage
    const accountResponse = await fetch(
      `https://serpapi.com/account?api_key=${serpApiKey}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!accountResponse.ok) {
      throw new Error(`SerpAPI account error: ${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();
    logStep('SerpAPI account data retrieved', { 
      plan: accountData.plan,
      searches_used: accountData.total_searches_used
    });

    // Calculate estimated cost based on searches used
    const searchesUsed = accountData.total_searches_used || 0;
    const costPerSearch = 0.004; // Estimate $0.004 per search
    const estimatedCost = searchesUsed * costPerSearch;

    const usageDetails = {
      plan: accountData.plan,
      totalSearches: searchesUsed,
      searchesRemaining: accountData.searches_remaining,
      costPerSearch: costPerSearch
    };

    // Store SerpAPI usage data
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await supabase.from('billing_data').upsert({
      provider: 'serpapi',
      billing_period_start: startDate.toISOString().split('T')[0],
      billing_period_end: endDate.toISOString().split('T')[0],
      total_cost: estimatedCost,
      usage_details: usageDetails,
      raw_billing_data: accountData,
      synced_at: new Date().toISOString()
    });

    logStep('SerpAPI billing data synced', { estimatedCost, searchesUsed });
    return { provider: 'serpapi', estimatedCost, searchesUsed };

  } catch (error) {
    logStep('SerpAPI billing sync error', { error: error.message });
    throw error;
  }
}