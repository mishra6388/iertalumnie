// components/navigation/ProfileDropdown.jsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ProfileDropdown Component
 * Props:
 * - isMobile: boolean (renders mobile version if true)
 */

export default function ProfileDropdown({ isMobile = false }) {
  const { currentUser, userProfile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get user display info
  const displayName = userProfile?.displayName || currentUser?.displayName || 'User';
  const userEmail = currentUser?.email || '';
  const profileImage = userProfile?.photoURL || currentUser?.photoURL;

  // Mobile version
  if (isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center px-3 py-2">
          <div className="flex-shrink-0">
            {profileImage ? (
              <img
                className="h-8 w-8 rounded-full"
                src={profileImage}
                alt={displayName}
              />
            ) : (
              <div className="h-8 w-8 bg-gray-400 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className="ml-3">
            <div className="text-base font-medium text-gray-800">{displayName}</div>
            <div className="text-sm font-medium text-gray-500">{userEmail}</div>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/profile"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            Edit Profile
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-700 hover:text-red-900 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {profileImage ? (
          <img
            className="h-8 w-8 rounded-full"
            src={profileImage}
            alt={displayName}
          />
        ) : (
          <div className="h-8 w-8 bg-gray-400 rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <span className="text-gray-700 font-medium">{displayName}</span>
        <svg
          className={`h-4 w-4 text-gray-500 transform transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500 truncate">{userEmail}</p>
            {userProfile?.membershipStatus && userProfile.membershipStatus !== 'none' && (
              <p className="text-xs text-green-600 capitalize mt-1">
                {userProfile?.membershipStatus} Member
              </p>
            )}
          </div>

          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Edit Profile
          </Link>

          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}