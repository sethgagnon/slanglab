interface UpgradeFlowConfig {
  plan: 'SearchPro' | 'LabPro';
  source: string; // Where the upgrade was triggered from
  context?: string; // Additional context
  isFromTrial?: boolean;
}

interface PlanConfig {
  name: string;
  priceId: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popularFeatures: string[];
  limits: {
    searches: string;
    aiCreations: string;
    manualCreations: string;
    tracking: boolean;
    analytics: boolean;
  };
}

export const PLAN_CONFIGS: Record<'SearchPro' | 'LabPro', PlanConfig> = {
  SearchPro: {
    name: 'SearchPro',
    priceId: 'price_1SADlGDt8zpU0lE0mlv6nVLL',
    monthlyPrice: 1.99,
    annualPrice: 19.99,
    features: [
      'Unlimited daily searches',
      '3 AI creations per week',
      '5 manual creations per week',
      'Priority support',
      'No daily limits',
      'Advanced search filters'
    ],
    popularFeatures: [
      'Unlimited searches',
      '3x more AI creations',
      'Priority support'
    ],
    limits: {
      searches: 'Unlimited',
      aiCreations: '3 per week',
      manualCreations: '5 per week',
      tracking: false,
      analytics: false
    }
  },
  LabPro: {
    name: 'LabPro',
    priceId: 'price_1SADmrDt8zpU0lE0PKZLjhJA',
    monthlyPrice: 3.99,
    annualPrice: 39.99,
    features: [
      'Everything in SearchPro',
      '2 AI creations per day',
      'Unlimited manual creations',
      'Advanced tracking & analytics',
      'Weekly digest reports',
      'Viral score tracking',
      'Platform monitoring',
      'Custom alerts'
    ],
    popularFeatures: [
      'Unlimited everything',
      'Daily AI creations',
      'Viral tracking'
    ],
    limits: {
      searches: 'Unlimited',
      aiCreations: '2 per day',
      manualCreations: 'Unlimited',
      tracking: true,
      analytics: true
    }
  }
};

export const createUpgradeFlow = (config: UpgradeFlowConfig) => {
  const plan = PLAN_CONFIGS[config.plan];
  
  return {
    plan,
    priceId: plan.priceId,
    source: config.source,
    context: config.context,
    isFromTrial: config.isFromTrial || false,
    
    // Analytics tracking
    trackEvent: () => {
      // Track upgrade attempt
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'upgrade_attempt', {
          plan: config.plan,
          source: config.source,
          context: config.context,
          is_from_trial: config.isFromTrial
        });
      }
    },
    
    // Success tracking
    trackSuccess: () => {
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'upgrade_success', {
          plan: config.plan,
          source: config.source,
          value: plan.monthlyPrice
        });
      }
    }
  };
};

export const getRecommendedPlan = (usage: {
  searchesUsed: number;
  searchesLimit: number;
  aiCreationsUsed: number;
  aiCreationsLimit: number;
  manualCreationsUsed: number;
  manualCreationsLimit: number;
}): 'SearchPro' | 'LabPro' => {
  const searchUsageRate = usage.searchesLimit > 0 ? usage.searchesUsed / usage.searchesLimit : 0;
  const aiCreationRate = usage.aiCreationsLimit > 0 ? usage.aiCreationsUsed / usage.aiCreationsLimit : 0;
  const manualCreationRate = usage.manualCreationsLimit > 0 ? usage.manualCreationsUsed / usage.manualCreationsLimit : 0;
  
  // Recommend LabPro for heavy creators or high overall usage
  if (
    (aiCreationRate >= 0.8 || manualCreationRate >= 0.8) ||
    (searchUsageRate >= 0.8 && (aiCreationRate >= 0.5 || manualCreationRate >= 0.5))
  ) {
    return 'LabPro';
  }
  
  return 'SearchPro';
};

export const formatPrice = (price: number, isAnnual: boolean = false): string => {
  if (isAnnual) {
    return `$${price.toFixed(2)}/year`;
  }
  return `$${price.toFixed(2)}/mo`;
};

export const calculateSavings = (monthlyPrice: number, annualPrice: number): number => {
  const annualMonthly = annualPrice / 12;
  return Math.round(((monthlyPrice - annualMonthly) / monthlyPrice) * 100);
};