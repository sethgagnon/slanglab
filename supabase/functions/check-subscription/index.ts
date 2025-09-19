import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe price IDs to our plan names
const PRICE_TO_PLAN = {
  "price_1S8uzhDt8zpU0lE0erSCXXc1": "SearchPro", // SearchPro $3/month
  "price_1S8uztDt8zpU0lE0z8emJyw3": "LabPro",    // LabPro $5/month
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user is not subscribed");
      
      // Update profile to ensure it's set to Free plan
      await supabaseClient
        .from('profiles')
        .update({ 
          plan: 'Free',
          subscription_status: null,
          subscription_id: null,
          current_period_end: null
        })
        .eq('user_id', user.id);
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "Free",
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let plan = "Free";
    let subscriptionEnd = null;
    let subscriptionId = null;
    let subscriptionStatus = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      subscriptionId = subscription.id;
      subscriptionStatus = subscription.status;
      
      // Get the plan name from the price ID
      const priceId = subscription.items.data[0].price.id;
      plan = PRICE_TO_PLAN[priceId] || "Free";
      
      logStep("Active subscription found", { 
        subscriptionId, 
        endDate: subscriptionEnd, 
        plan,
        priceId 
      });

      // Update profile with subscription info
      await supabaseClient
        .from('profiles')
        .update({ 
          plan,
          stripe_customer_id: customerId,
          subscription_id: subscriptionId,
          subscription_status: subscriptionStatus,
          current_period_end: subscriptionEnd
        })
        .eq('user_id', user.id);
    } else {
      logStep("No active subscription found");
      
      // Update profile to Free plan
      await supabaseClient
        .from('profiles')
        .update({ 
          plan: 'Free',
          stripe_customer_id: customerId,
          subscription_status: null,
          subscription_id: null,
          current_period_end: null
        })
        .eq('user_id', user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});