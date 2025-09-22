// components/membership/MembershipPlans.jsx
'use client';

import { useState } from 'react';
import { getAllMembershipPlans, formatCurrency } from '@/constants/membershipPlans';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DebugPayment from '@/components/debug/DebugPayment';

/**
 * MembershipPlans Component
 * Displays available membership plans with selection functionality
 * 
 * Props:
 * - onPlanSelect: Function called when user selects a plan
 */
export default function MembershipPlans({ onPlanSelect }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const plans = getAllMembershipPlans();

  const handlePlanSelect = async (planId) => {
    if (loading) return;
    
    setLoading(true);
    setSelectedPlan(planId);
    
    try {
      if (onPlanSelect) {
        await onPlanSelect(planId);
      }
    } catch (error) {
      console.error('Plan selection failed:', error);
      // Reset selection on error
      setSelectedPlan(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`relative transition-all duration-200 hover:shadow-lg ${
              plan.popular ? 'border-blue-500 shadow-lg' : 'hover:border-gray-300'
            } ${
              selectedPlan === plan.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-blue-600">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-gray-500 ml-2">
                  / {plan.duration.toLowerCase()}
                </span>
              </div>
              {plan.savings && (
                <p className="text-green-600 font-medium text-sm">
                  {plan.savings}
                </p>
              )}
            </div>

            {/* Plan Features */}
            <div className="mb-8">
              <h4 className="font-semibold text-gray-900 mb-4">What's included:</h4>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg 
                      className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Plan Action Button */}
            <div className="mt-auto">
              <Button
                onClick={() => handlePlanSelect(plan.id)}
                loading={loading && selectedPlan === plan.id}
                disabled={loading}
                variant={plan.popular ? 'primary' : 'outline'}
                className="w-full"
                size="lg"
              >
                {loading && selectedPlan === plan.id 
                  ? 'Processing...' 
                  : `Choose ${plan.name}`
                }
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center">
        <div className="bg-gray-50 rounded-lg p-6 max-w-3xl mx-auto">
          <h4 className="font-semibold text-gray-900 mb-3">
            Why join our alumni network?
          </h4>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h5 className="font-medium text-gray-900 mb-1">Network</h5>
              <p>Connect with alumni from your batch and across different years</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h5 className="font-medium text-gray-900 mb-1">Career</h5>
              <p>Access job opportunities, mentorship, and career guidance</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                </svg>
              </div>
              <h5 className="font-medium text-gray-900 mb-1">Events</h5>
              <p>Attend exclusive alumni events, reunions, and networking sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Security */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure payments
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Instant activation
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Email confirmation
          </div>
          <DebugPayment/>
        </div>
      </div>
    </div>
  );
}