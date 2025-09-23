'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
// import { usePayment } from '@/hooks/usePayment';
import { MEMBERSHIP_PLANS } from '@/lib/cashfree';

export default function MembershipPlans() {
  const router = useRouter();
  const { user } = useAuth();
  const { processPayment, loading, error, clearError } = usePayment();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: 'yearly',
      ...MEMBERSHIP_PLANS.YEARLY,
      popular: false,
      features: [
        'Access to alumni directory',
        'Job postings and opportunities',
        'Networking events',
        'Alumni meetups',
        'Career guidance',
        '1 year validity'
      ]
    },
    {
      id: 'lifetime', 
      ...MEMBERSHIP_PLANS.LIFETIME,
      popular: true,
      features: [
        'All yearly plan features',
        'Lifetime access',
        'Priority support',
        'Exclusive lifetime member events',
        'Mentorship opportunities',
        'No renewal required'
      ]
    }
  ];

  const handleSelectPlan = async (planId) => {
    try {
      clearError();
      
      // Check if user is logged in
      if (!user) {
        router.push('/login?redirect=/membership');
        return;
      }

      setSelectedPlan(planId);

      // Process payment with redirect
      await processPayment(planId, '_self');
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      setSelectedPlan(null);
    }
  };

  const handleTryModal = async (planId) => {
    try {
      clearError();
      
      if (!user) {
        router.push('/login?redirect=/membership');
        return;
      }

      setSelectedPlan(planId);

      // Process payment with modal
      const result = await processPayment(planId, '_modal');
      
      if (result.paymentSuccessful) {
        router.push('/dashboard?welcome=true');
      }
      
    } catch (error) {
      console.error('Modal payment error:', error);
    } finally {
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Membership Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our alumni network and stay connected with your peers. 
            Get access to exclusive opportunities and resources.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-md mx-auto mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button onClick={clearError} className="text-red-400 hover:text-red-600">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-blue-600 ring-opacity-50' : ''
              }`}
            >
              
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">₹{plan.amount}</span>
                  {plan.id === 'yearly' && (
                    <span className="text-gray-500">/year</span>
                  )}
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              {/* Features */}
              <div className="mb-8">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-800 hover:bg-gray-900 text-white'
                  } ${loading && selectedPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </button>

                {/* Modal Payment Option */}
                <button
                  onClick={() => handleTryModal(plan.id)}
                  disabled={loading}
                  className="w-full py-2 px-6 rounded-lg font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pay in Popup
                </button>
              </div>

              {/* Value Proposition */}
              {plan.id === 'lifetime' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800 text-center">
                    <span className="font-semibold">Save ₹{(500 * 5) - 2000}!</span> 
                    {' '}Compared to 5 years of yearly membership
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Secure Payment Methods
          </h3>
          <div className="flex justify-center items-center space-x-6 text-gray-600">
            <div className="flex items-center">
              <span className="text-2xl mr-2">💳</span>
              <span>Cards</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">🏦</span>
              <span>Net Banking</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">📱</span>
              <span>UPI</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">👝</span>
              <span>Wallets</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Powered by Cashfree Payments - PCI DSS Compliant
          </p>
        </div>

        {/* Login Prompt for Non-Authenticated Users */}
        {!user && (
          <div className="mt-12 max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Ready to Join?
            </h3>
            <p className="text-blue-700 mb-4">
              Please login or create an account to purchase membership.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/login?redirect=/membership')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/signup?redirect=/membership')}
                className="flex-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 py-2 px-4 rounded-lg transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}