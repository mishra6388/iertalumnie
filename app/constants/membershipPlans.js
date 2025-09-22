// constants/membershipPlans.js

export const MEMBERSHIP_PLANS = {
  ANNUAL: {
    id: 'annual',
    name: '1 Year Membership',
    price: 500,
    duration: '1 Year',
    durationType: 'annual',
    features: [
      'Access to alumni directory',
      'Join alumni events',
      'Networking opportunities',
      'Job posting access',
      'Alumni newsletter',
      'Member-only resources'
    ],
    popular: false,
    description: 'Perfect for staying connected with the alumni community',
  },
  LIFETIME: {
    id: 'lifetime',
    name: 'Lifetime Membership',
    price: 2000,
    duration: 'Lifetime',
    durationType: 'lifetime',
    features: [
      'Everything in 1 Year plan',
      'Priority event registration',
      'Exclusive lifetime member badge',
      'Special alumni meetups',
      'Career mentorship access',
      'Alumni business directory',
      'Lifetime updates & benefits'
    ],
    popular: true,
    description: 'Best value for long-term alumni engagement',
    savings: 'Save ₹3000 compared to annual renewals',
  }
};

export const getMembershipPlan = (planId) => {
  return MEMBERSHIP_PLANS[planId.toUpperCase()] || null;
};

export const getAllMembershipPlans = () => {
  return Object.values(MEMBERSHIP_PLANS);
};

// Helper function to check if user has active membership
export const hasActiveMembership = (membershipStatus) => {
  return membershipStatus && membershipStatus !== 'none';
};

// Helper function to get membership display name
export const getMembershipDisplayName = (membershipStatus) => {
  switch (membershipStatus) {
    case 'annual':
      return '1 Year Member';
    case 'lifetime':
      return 'Lifetime Member';
    default:
      return 'Not a Member';
  }
};