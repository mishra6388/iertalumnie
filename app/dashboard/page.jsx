// app/dashboard/page.jsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/auth/AuthGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/**
 * Dashboard Page - Protected route for members only
 * Shows member-exclusive content and features
 */
function DashboardContent() {
  const { user } = useAuth();

  const formatDate = (dateString) => {
    if (!dateString) return 'Never expires';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMembershipBadgeColor = (status) => {
    switch (status) {
      case 'lifetime':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'annual':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isExpiringSoon = () => {
    if (user?.membership?.status === 'lifetime') return false;
    if (!user?.membership?.expiryDate) return false;
    
    const expiryDate = new Date(user.membership.expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return expiryDate <= thirtyDaysFromNow;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600 mt-2">
            Access your alumni dashboard and exclusive member content.
          </p>
        </div>

        {/* Membership Status Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Membership Status
                </h3>
                <div className="flex items-center space-x-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getMembershipBadgeColor(user?.membership?.status)}`}>
                    {user?.membership?.planName || 'Active Member'}
                  </span>
                  {user?.membership?.status === 'lifetime' && (
                    <span className="text-sm text-green-600 font-medium">✓ Lifetime Access</span>
                  )}
                </div>
                
                {user?.membership?.expiryDate && (
                  <div className="text-sm text-gray-600">
                    <p className="mb-1">
                      <span className="font-medium">Expires:</span> {formatDate(user.membership.expiryDate)}
                    </p>
                    {isExpiringSoon() && (
                      <p className="text-amber-600 font-medium">
                        ⚠️ Membership expires soon
                      </p>
                    )}
                  </div>
                )}
                
                {user?.membership?.purchaseDate && (
                  <p className="text-sm text-gray-500 mt-2">
                    Member since: {formatDate(user.membership.purchaseDate)}
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                Edit Profile
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Alumni Directory
              </Button>
              {isExpiringSoon() && (
                <Button className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM12 15a1 1 0 01-1-1v-1a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1z" />
                  </svg>
                  Renew Membership
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Alumni Directory */}
          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Alumni Directory</h3>
              <p className="text-gray-600 text-sm mb-4">
                Connect with fellow alumni from your batch and across all years.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Browse Directory
              </Button>
            </div>
          </Card>

          {/* Events */}
          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Exclusive Events</h3>
              <p className="text-gray-600 text-sm mb-4">
                Join member-only meetups, webinars, and networking events.
              </p>
              <Button variant="outline" className="w-full" disabled>
                View Events
              </Button>
            </div>
          </Card>

          {/* Job Board */}
          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Opportunities</h3>
              <p className="text-gray-600 text-sm mb-4">
                Access exclusive job postings and career opportunities.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Browse Jobs
              </Button>
            </div>
          </Card>

          {/* Mentorship */}
          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mentorship Program</h3>
              <p className="text-gray-600 text-sm mb-4">
                Find mentors or become one to help fellow alumni grow.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Join Program
              </Button>
            </div>
          </Card>

          {/* Resources */}
          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Learning Resources</h3>
              <p className="text-gray-600 text-sm mb-4">
                Access premium courses, webinars, and educational content.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Explore Resources
              </Button>
            </div>
          </Card>

          {/* Community Forum */}
          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Forum</h3>
              <p className="text-gray-600 text-sm mb-4">
                Participate in discussions and stay connected with the community.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Join Discussion
              </Button>
            </div>
          </Card>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-12">
          <Card className="bg-blue-50 border-blue-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                🚀 More Features Coming Soon!
              </h3>
              <p className="text-blue-700">
                We're working hard to bring you more exclusive features and content. 
                Stay tuned for updates on alumni directory, events, job board, and much more!
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth={true} requireMembership={true}>
      <DashboardContent />
    </AuthGuard>
  );
}