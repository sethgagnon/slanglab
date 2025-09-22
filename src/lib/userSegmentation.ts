interface UsageStats {
  searchesUsed: number;
  searchesLimit: number;
  aiCreationsUsed: number;
  aiCreationsLimit: number;
  manualCreationsUsed: number;
  manualCreationsLimit: number;
  plan: string;
}

interface UserSegment {
  type: 'heavy_creator' | 'search_power_user' | 'casual_user' | 'trial_user' | 'at_risk';
  confidence: number;
  recommendedPlan: 'SearchPro' | 'LabPro';
  urgency: 'low' | 'medium' | 'high';
  messaging: {
    primary: string;
    secondary: string;
    benefits: string[];
  };
}

export const analyzeUserSegment = (
  usage: UsageStats,
  accountAge: number = 0, // days since account creation
  recentActivity: number = 0 // actions in last 7 days
): UserSegment => {
  const searchUsageRate = usage.searchesLimit > 0 ? usage.searchesUsed / usage.searchesLimit : 0;
  const aiCreationRate = usage.aiCreationsLimit > 0 ? usage.aiCreationsUsed / usage.aiCreationsLimit : 0;
  const manualCreationRate = usage.manualCreationsLimit > 0 ? usage.manualCreationsUsed / usage.manualCreationsLimit : 0;
  
  // Heavy Creator: High creation usage, likely to benefit from LabPro
  if ((aiCreationRate >= 0.8 || manualCreationRate >= 0.8) && recentActivity >= 5) {
    return {
      type: 'heavy_creator',
      confidence: 0.9,
      recommendedPlan: 'LabPro',
      urgency: 'high',
      messaging: {
        primary: 'You\'re a creation powerhouse! 🚀',
        secondary: 'LabPro gives you unlimited manual creations + 2 AI per day',
        benefits: [
          'Unlimited manual creations',
          '2 AI creations daily (vs weekly)',
          'Advanced tracking & analytics',
          'Priority support'
        ]
      }
    };
  }

  // Search Power User: High search usage, good fit for SearchPro
  if (searchUsageRate >= 0.8 && recentActivity >= 3) {
    return {
      type: 'search_power_user',
      confidence: 0.85,
      recommendedPlan: 'SearchPro',
      urgency: 'medium',
      messaging: {
        primary: 'Unlock unlimited searches! 🔍',
        secondary: 'SearchPro removes daily limits and adds creation features',
        benefits: [
          'Unlimited daily searches',
          '3 AI creations per week',
          '5 manual creations per week',
          'No more waiting'
        ]
      }
    };
  }

  // Trial User: New account with moderate usage
  if (accountAge <= 7 && (searchUsageRate >= 0.5 || aiCreationRate >= 0.5)) {
    return {
      type: 'trial_user',
      confidence: 0.7,
      recommendedPlan: 'SearchPro',
      urgency: 'medium',
      messaging: {
        primary: 'Love SlangLab? Keep going! ✨',
        secondary: 'Most new creators upgrade to SearchPro within their first week',
        benefits: [
          'Join 2,000+ upgraded creators',
          'Unlimited searches',
          'More AI creations',
          'Special new user pricing'
        ]
      }
    };
  }

  // At Risk: High usage across multiple areas, likely to churn without upgrade
  if (searchUsageRate >= 0.9 && (aiCreationRate >= 0.8 || manualCreationRate >= 0.8)) {
    return {
      type: 'at_risk',
      confidence: 0.95,
      recommendedPlan: 'LabPro',
      urgency: 'high',
      messaging: {
        primary: 'Don\'t hit the wall! 🚧',
        secondary: 'You\'re maxing out limits. Upgrade now to keep your momentum',
        benefits: [
          'Never hit limits again',
          'Unlimited everything',
          'Advanced features',
          'Keep creating without stops'
        ]
      }
    };
  }

  // Casual User: Low but consistent usage
  return {
    type: 'casual_user',
    confidence: 0.6,
    recommendedPlan: 'SearchPro',
    urgency: 'low',
    messaging: {
      primary: 'Ready for more? 🌟',
      secondary: 'SearchPro unlocks unlimited searches and creation features',
      benefits: [
        'Unlimited daily searches',
        'More creation opportunities',
        'Priority support',
        'Advanced features'
      ]
    }
  };
};

export const getSegmentedPricing = (segment: UserSegment, plan: string) => {
  const basePrices = {
    SearchPro: { monthly: 1.99, annual: 19.99 },
    LabPro: { monthly: 3.99, annual: 39.99 }
  };

  const price = basePrices[segment.recommendedPlan];
  
  // Special pricing for trial users
  if (segment.type === 'trial_user') {
    return {
      ...price,
      monthlyDisplay: `$${price.monthly}/mo`,
      annualDisplay: `$${price.annual}/year (Save 17%)`,
      specialOffer: 'New user special: First month 50% off!'
    };
  }

  // Urgency pricing for at-risk users
  if (segment.type === 'at_risk') {
    return {
      ...price,
      monthlyDisplay: `$${price.monthly}/mo`,
      annualDisplay: `$${price.annual}/year`,
      specialOffer: 'Upgrade now and get your first week free!'
    };
  }

  return {
    ...price,
    monthlyDisplay: `$${price.monthly}/mo`,
    annualDisplay: `$${price.annual}/year (Save ${Math.round((1 - price.annual / (price.monthly * 12)) * 100)}%)`,
    specialOffer: null
  };
};