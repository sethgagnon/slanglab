import { useState, useEffect } from 'react';

interface ABTestConfig {
  testName: string;
  variants: string[];
  weights?: number[];
}

interface ABTestResult {
  variant: string;
  isControl: boolean;
}

export const useABTesting = (config: ABTestConfig): ABTestResult => {
  const [variant, setVariant] = useState<string>('');

  useEffect(() => {
    const { testName, variants, weights } = config;
    
    // Check if user already has a variant assigned for this test
    const storageKey = `ab_test_${testName}`;
    const existingVariant = localStorage.getItem(storageKey);
    
    if (existingVariant && variants.includes(existingVariant)) {
      setVariant(existingVariant);
      return;
    }

    // Assign new variant based on weights or equal distribution
    let selectedVariant: string;
    
    if (weights && weights.length === variants.length) {
      // Weighted assignment
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const random = Math.random() * totalWeight;
      let currentWeight = 0;
      
      for (let i = 0; i < variants.length; i++) {
        currentWeight += weights[i];
        if (random <= currentWeight) {
          selectedVariant = variants[i];
          break;
        }
      }
      selectedVariant = selectedVariant! || variants[0];
    } else {
      // Equal distribution
      const randomIndex = Math.floor(Math.random() * variants.length);
      selectedVariant = variants[randomIndex];
    }

    // Store the variant assignment
    localStorage.setItem(storageKey, selectedVariant);
    setVariant(selectedVariant);
  }, [config.testName, config.variants, config.weights]);

  return {
    variant,
    isControl: variant === config.variants[0]
  };
};

// Pre-configured A/B tests
export const useUpgradeMessageTest = () => {
  return useABTesting({
    testName: 'upgrade_message_v1',
    variants: ['standard', 'urgency', 'social_proof', 'value_focused'],
    weights: [0.25, 0.25, 0.25, 0.25]
  });
};

export const usePricingEmphasisTest = () => {
  return useABTesting({
    testName: 'pricing_emphasis_v1',
    variants: ['monthly', 'savings', 'value_per_feature'],
    weights: [0.4, 0.3, 0.3]
  });
};

export const useCtaVariantTest = () => {
  return useABTesting({
    testName: 'cta_variant_v1',
    variants: ['upgrade_now', 'get_started', 'unlock_features', 'join_creators'],
    weights: [0.25, 0.25, 0.25, 0.25]
  });
};