import { useState, useEffect } from 'react';

interface TrialState {
  isTrialActive: boolean;
  trialPlan: 'SearchPro' | 'LabPro' | null;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  daysRemaining: number;
  canStartTrial: boolean;
  hasUsedTrial: boolean;
}

interface TrialConfig {
  plan: 'SearchPro' | 'LabPro';
  durationDays: number;
}

export const useTrialManagement = () => {
  const [trialState, setTrialState] = useState<TrialState>({
    isTrialActive: false,
    trialPlan: null,
    trialStartDate: null,
    trialEndDate: null,
    daysRemaining: 0,
    canStartTrial: true,
    hasUsedTrial: false
  });

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = () => {
    const trialData = localStorage.getItem('slanglab_trial');
    if (!trialData) {
      setTrialState(prev => ({ ...prev, canStartTrial: true, hasUsedTrial: false }));
      return;
    }

    try {
      const trial = JSON.parse(trialData);
      const now = new Date();
      const endDate = new Date(trial.endDate);
      const startDate = new Date(trial.startDate);
      
      const isActive = now < endDate;
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      setTrialState({
        isTrialActive: isActive,
        trialPlan: trial.plan,
        trialStartDate: startDate,
        trialEndDate: endDate,
        daysRemaining,
        canStartTrial: !trial.used,
        hasUsedTrial: trial.used
      });

      // Auto-expire trial if needed
      if (!isActive && trial.plan) {
        endTrial();
      }
    } catch (error) {
      console.error('Error parsing trial data:', error);
      localStorage.removeItem('slanglab_trial');
    }
  };

  const startTrial = (config: TrialConfig): boolean => {
    if (!trialState.canStartTrial) {
      return false;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.durationDays);

    const trialData = {
      plan: config.plan,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      used: true
    };

    localStorage.setItem('slanglab_trial', JSON.stringify(trialData));
    
    setTrialState({
      isTrialActive: true,
      trialPlan: config.plan,
      trialStartDate: startDate,
      trialEndDate: endDate,
      daysRemaining: config.durationDays,
      canStartTrial: false,
      hasUsedTrial: true
    });

    // Track trial start
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'trial_started', {
        plan: config.plan,
        duration: config.durationDays
      });
    }

    return true;
  };

  const endTrial = () => {
    const trialData = localStorage.getItem('slanglab_trial');
    if (trialData) {
      try {
        const trial = JSON.parse(trialData);
        // Keep the 'used' flag but mark as inactive
        localStorage.setItem('slanglab_trial', JSON.stringify({
          ...trial,
          ended: true
        }));
      } catch (error) {
        localStorage.removeItem('slanglab_trial');
      }
    }

    setTrialState(prev => ({
      ...prev,
      isTrialActive: false,
      trialPlan: null,
      daysRemaining: 0
    }));

    // Track trial end
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'trial_ended', {
        plan: trialState.trialPlan
      });
    }
  };

  const getTrialFeatures = (): string[] => {
    if (!trialState.trialPlan) return [];

    if (trialState.trialPlan === 'SearchPro') {
      return [
        'Unlimited daily searches',
        '3 AI creations per week',
        '5 manual creations per week',
        'Priority support'
      ];
    }

    return [
      'Unlimited searches & manual creations',
      '2 AI creations per day',
      'Advanced tracking & analytics',
      'Weekly digest reports',
      'Priority support'
    ];
  };

  const shouldShowTrialOffer = (): boolean => {
    return trialState.canStartTrial && !trialState.hasUsedTrial;
  };

  const shouldShowTrialReminder = (): boolean => {
    return trialState.isTrialActive && trialState.daysRemaining <= 2;
  };

  return {
    ...trialState,
    startTrial,
    endTrial,
    checkTrialStatus,
    getTrialFeatures,
    shouldShowTrialOffer,
    shouldShowTrialReminder
  };
};
