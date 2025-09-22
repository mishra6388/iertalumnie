// components/membership/MembershipPlans.jsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MEMBERSHIP_PLANS } from '@/constants/membershipPlans';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * MembershipPlans Component
 * Props:
 * - onPlanSelect: Function called when user selects a plan
 * - selectedPlan: Currently selected plan ID
 */

export default function MembershipPlans({ onPlanSelect, selectedPlan }) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(null);

  const handlePlanSelect = async (planId) => {
    if (loading) return;
    
    setLoading(planId);
    
    try {
      if (onPlanSelect) {
        await onPlanSelect(planId);
      }
    } catch (error) {
      console.error('Plan selection error:', error);
    } finally {
      setLoading(null);
    }
  };

  // Check if user already has membership
  const hasActiveMembership = userProfile?.membershipStatus && 
    userProfile.membershipStatus !== 'none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Membership Plan
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Join our alumni community and unlock exclusive benefits, networking opportunities, 
          and lifelong connections.
        </p>
      </div>

      {/* Current membership status */}
      {hasActiveMembership && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800">
            🎉 You are currently a <strong>{userProfile.membershipStatus === 'annual' ? '1 Year' : 'Lifetime'} Member</strong>!
          </p>
          <p className="text-sm text-green-600 mt-1">
            You can upgrade or renew your membership below.
          </p>
        </div>
      )}

      {/* Membership Plans */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {Object.values(MEMBERSHIP_PLANS).map((plan) => (
          <Card
            key={plan.id}
            className={`relative transition-all duration-200 hover:shadow-lg ${
              selectedPlan === plan.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : ''
            } ${
              plan.popular 
                ? 'border-blue-500 shadow-md' 
                : ''
            }`}
            padding="lg"
          >
            {/* Popular badge */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan header */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <div className="mb-2">
                <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                <span className="text-gray-500 ml-1">
                  /{plan.durationType === 'annual' ? 'year' : 'lifetime'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{plan.description}</p>
              {plan.savings && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  {plan.savings}
                </p>
              )}
            </div>

            {/* Features list */}
            <div className="mb-8">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action button */}
            <div className="mt-auto">
              <Button
                onClick={() => handlePlanSelect(plan.id)}
                loading={loading === plan.id}
                variant={plan.popular ? 'primary' : 'outline'}
                className="w-full"
                disabled={
                  // Disable if user already has this membership
                  hasActiveMembership && userProfile.membershipStatus === plan.durationType
                }
              >
                {hasActiveMembership && userProfile.membershipStatus === plan.durationType
                  ? 'Current Plan'
                  : loading === plan.id
                  ? 'Processing...'
                  : selectedPlan === plan.id
                  ? 'Selected'
                  : `Choose ${plan.name}`
                }
              </Button>
            </div>

            {/* Current plan indicator */}
            {hasActiveMembership && userProfile.membershipStatus === plan.durationType && (
              <div className="absolute top-4 right-4">
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Additional info */}
      <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
        <p className="mb-2">
          🔒 Secure payment processing with Cashfree
        </p>
        <p>
          Questions about membership? Contact us at{' '}
          <a href="mailto:support@alumni.edu" className="text-blue-600 hover:underline">
            support@alumni.edu
          </a>
        </p>
      </div>
    </div>
  );
}