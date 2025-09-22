// components/navigation/Navbar.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
// In app/components/navigation/Navbar.jsx
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import ProfileDropdown from './ProfileDropdown';

export default function Navbar() {
  const { currentUser, userProfile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Alumni Portal
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <>
                {/* Navigation Links for Authenticated Users */}
                <Link 
                  href="/dashboard" 
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                
                {userProfile?.membershipStatus === 'none' && (
                  <Link 
                    href="/membership" 
                    className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Get Membership
                  </Link>
                )}

                {/* Profile Dropdown */}
                <ProfileDropdown />
              </>
            ) : (
              <>
                {/* Login/Signup Buttons for Non-authenticated Users */}
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 p-2"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {currentUser ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-gray-700 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  
                  {userProfile?.membershipStatus === 'none' && (
                    <Link
                      href="/membership"
                      className="text-blue-600 hover:text-blue-800 block px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Membership
                    </Link>
                  )}
                  
                  <div className="pt-2">
                    <ProfileDropdown isMobile={true} />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="text-gray-700 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}