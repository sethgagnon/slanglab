interface TimeBasedOffer {
  type: 'weekend_boost' | 'week_end_rush' | 'monday_fresh_start' | 'limit_reset_reminder';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  validUntil: Date;
  specialOffer?: string;
  isActive: boolean;
}

export const getTimeBasedOffers = (): TimeBasedOffer[] => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hourOfDay = now.getHours();
  
  const offers: TimeBasedOffer[] = [];

  // Weekend Boost (Friday evening to Sunday)
  if (dayOfWeek === 5 && hourOfDay >= 17 || dayOfWeek === 6 || dayOfWeek === 0) {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (7 - dayOfWeek) % 7); // Next Monday
    endDate.setHours(0, 0, 0, 0);

    offers.push({
      type: 'weekend_boost',
      title: 'Weekend Creator Boost! 🚀',
      description: 'Perfect time to upgrade and fuel your weekend creativity',
      urgency: 'medium',
      validUntil: endDate,
      specialOffer: 'Weekend only: First month 25% off',
      isActive: true
    });
  }

  // Week End Rush (Thursday-Friday, when weekly limits are likely hit)
  if (dayOfWeek === 4 || dayOfWeek === 5) {
    const nextMonday = new Date(now);
    nextMonday.setDate(nextMonday.getDate() + (8 - dayOfWeek) % 7);
    nextMonday.setHours(0, 0, 0, 0);

    offers.push({
      type: 'week_end_rush',
      title: 'End of week? Keep going! ⚡',
      description: 'Don\'t let weekly limits stop your momentum',
      urgency: 'high',
      validUntil: nextMonday,
      specialOffer: 'Beat the limits: Upgrade before Monday reset',
      isActive: true
    });
  }

  // Monday Fresh Start
  if (dayOfWeek === 1 && hourOfDay < 12) {
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    offers.push({
      type: 'monday_fresh_start',
      title: 'Fresh week, fresh possibilities! ✨',
      description: 'Start the week unlimited with an upgrade',
      urgency: 'low',
      validUntil: endOfWeek,
      specialOffer: 'Monday motivation: Start unlimited today',
      isActive: true
    });
  }

  // Limit Reset Reminder (Sunday evening before Monday reset)
  if (dayOfWeek === 0 && hourOfDay >= 18) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);

    offers.push({
      type: 'limit_reset_reminder',
      title: 'Limits reset in hours! ⏰',
      description: 'Your weekly limits reset Monday morning. Upgrade for unlimited access',
      urgency: 'medium',
      validUntil: tomorrow,
      specialOffer: 'Last chance: Upgrade before reset',
      isActive: true
    });
  }

  return offers.filter(offer => offer.isActive);
};

export const shouldShowTimeBasedPrompt = (): boolean => {
  const offers = getTimeBasedOffers();
  
  // Don't show more than once per day
  const lastShown = localStorage.getItem('time_based_prompt_last_shown');
  const today = new Date().toDateString();
  
  if (lastShown === today) {
    return false;
  }

  // Show if we have active offers
  if (offers.length > 0) {
    localStorage.setItem('time_based_prompt_last_shown', today);
    return true;
  }

  return false;
};

export const getTimeBasedPricing = (basePrice: number): { price: number; discount: number; label: string } => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hourOfDay = now.getHours();

  // Weekend special pricing
  if (dayOfWeek === 5 && hourOfDay >= 17 || dayOfWeek === 6 || dayOfWeek === 0) {
    return {
      price: basePrice * 0.75, // 25% off
      discount: 25,
      label: 'Weekend Special'
    };
  }

  // End of week urgency pricing
  if (dayOfWeek === 4 || dayOfWeek === 5) {
    return {
      price: basePrice * 0.85, // 15% off
      discount: 15,
      label: 'Beat the Reset'
    };
  }

  // Monday motivation pricing
  if (dayOfWeek === 1 && hourOfDay < 12) {
    return {
      price: basePrice * 0.9, // 10% off
      discount: 10,
      label: 'Monday Boost'
    };
  }

  return {
    price: basePrice,
    discount: 0,
    label: 'Regular Price'
  };
};