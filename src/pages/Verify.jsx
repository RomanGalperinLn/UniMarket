import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';

export default function Verify() {
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const urlParams = new URLSearchParams(window.location.search);
  const uid = urlParams.get('uid');
  const token = urlParams.get('token');

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      if (!uid || !token) {
        throw new Error('Invalid link.');
      }

      let currentUser;
      try {
        currentUser = await base44.auth.me();
      } catch (err) {
        base44.auth.redirectToLogin(`${createPageUrl('Verify')}?uid=${uid}&token=${token}`);
        return;
      }

      if (currentUser.id !== uid) {
        throw new Error('This verification link is for a different user. Please log in with the correct account.');
      }

      const users = await base44.entities.User.filter({ id: uid });
      if (!users || users.length === 0) {
        throw new Error('User not found.');
      }

      const userRecord = users[0];

      if (userRecord.verified) {
        setSuccess(true);
        setVerifying(false);
        setTimeout(() => {
          navigate(createPageUrl('Profile') + '?email_confirmed=yes');
        }, 3000);
        return;
      }

      if (!userRecord.verification_token || userRecord.verification_token !== token) {
        throw new Error('Invalid or expired link. Please request a new verification email.');
      }

      if (userRecord.verification_expires_at) {
        const expiresAt = new Date(userRecord.verification_expires_at);
        const now = new Date();
        
        if (now > expiresAt) {
          throw new Error('Link expired. Please request a new one from your profile.');
        }
      }

      await base44.auth.updateMe({
        verified: true,
        verification_token: null,
        verification_expires_at: null
      });

      setSuccess(true);
      setVerifying(false);

      setTimeout(() => {
        navigate(createPageUrl('Profile') + '?email_confirmed=yes');
      }, 3000);

    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Verification failed. Please try again.');
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-xl shadow-sm">
        <div className="text-center">
          {verifying ? (
            <>
              <div className="relative w-16 h-16 mx-auto mb-4">
                <Loader2 className="w-16 h-16 text-[#B08968] animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying email...</h2>
              <p className="text-gray-600">Please wait while we verify your email address</p>
            </>
          ) : success ? (
            <>
              <div className="w-16 h-16 bg-green-100 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h2>
              <p className="text-gray-600 mb-6">
                You now have full access to all marketplace features!
              </p>
              <Alert className="bg-green-50 border-green-200 mb-4">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-gray-900">
                  Redirecting to your profile...
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => navigate(createPageUrl('Profile'))}
                className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold rounded-lg shadow-md"
              >
                Go to Profile Now
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate(createPageUrl('Profile'))}
                  className="w-full bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold rounded-lg shadow-md"
                >
                  Go to Profile
                </Button>
                <p className="text-sm text-gray-500">
                  You can request a new verification link from your profile.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}