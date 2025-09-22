// components/debug/DebugPayment.jsx - Temporary for production debugging
'use client';

import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useState } from 'react';

export default function DebugPayment() {
  const { currentUser, userProfile } = useAuth();
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const testPaymentData = () => {
    const testData = {
      planId: 'annual',
      userId: currentUser?.uid,
      userEmail: currentUser?.email,
      userName: userProfile?.displayName || currentUser?.displayName || 'User',
      userPhone: userProfile?.profile?.phone || null,
    };

    setDebugInfo({
      currentUser: !!currentUser,
      userProfile: !!userProfile,
      testData,
      missingFields: Object.entries(testData).filter(([key, value]) => 
        !value && key !== 'userPhone' // phone is optional
      )
    });
  };

  const testCreateOrder = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'annual',
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: userProfile?.displayName || currentUser.displayName || 'TestUser',
          userPhone: '9999999999'
        }),
      });
      
      const data = await response.json();
      setDebugInfo(prev => ({
        ...prev,
        apiResponse: {
          status: response.status,
          success: response.ok,
          data
        }
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        apiError: error.message
      }));
    }
    setLoading(false);
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <h3 className="text-lg font-semibold mb-4">Payment Debug Info</h3>
      
      <div className="space-y-4">
        <Button onClick={testPaymentData}>
          Test Payment Data
        </Button>
        
        <Button 
          onClick={testCreateOrder} 
          loading={loading}
          disabled={!currentUser}
        >
          Test Create Order API
        </Button>
        
        {debugInfo && (
          <div className="bg-gray-50 p-4 rounded text-sm overflow-auto">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    </Card>
  );
}