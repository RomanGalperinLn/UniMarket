
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package, CheckCircle, AlertTriangle, Clock, Flag, Upload, QrCode, Key, MapPin } from 'lucide-react';
import RatingForm from '../components/marketplace/RatingForm';
import RatingStars from '../components/marketplace/RatingStars';

export default function OrderDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [handoffCode, setHandoffCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin(window.location.pathname);
    }
  };

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId && !!user,
    refetchInterval: 10000,
  });

  const { data: listing } = useQuery({
    queryKey: ['listing', order?.listing_id],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: order.listing_id });
      return listings[0];
    },
    enabled: !!order?.listing_id,
  });

  const { data: otherUser } = useQuery({
    queryKey: ['other-user', order?.buyer_id, order?.seller_id],
    queryFn: async () => {
      const userId = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
      const users = await base44.entities.User.filter({ id: userId });
      return users[0];
    },
    enabled: !!order && !!user,
  });

  const { data: myRating } = useQuery({
    queryKey: ['my-rating', orderId, user?.id],
    queryFn: async () => {
      const ratings = await base44.entities.Rating.filter({ 
        order_id: orderId, 
        rater_id: user.id 
      });
      return ratings[0];
    },
    enabled: !!orderId && !!user && order?.status === 'Completed',
  });

  const generateHandoffCodeMutation = useMutation({
    mutationFn: async () => {
      if (order.handoff_code && order.handoff_expires_at) {
        const expiresAt = new Date(order.handoff_expires_at);
        const now = new Date();
        if (now < expiresAt) {
          throw new Error('Active code already exists. Wait for it to expire or use it first.');
        }
      }

      const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const token = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
      const qrToken = token.substr(0, 32);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2);

      await base44.entities.Order.update(order.id, {
        handoff_code: code,
        handoff_qr_token: qrToken,
        handoff_expires_at: expiresAt.toISOString(),
        handoff_attempts: 0,
        handoff_max_attempts: 5,
        status: 'Ready'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });

  const confirmHandoffMutation = useMutation({
    mutationFn: async (inputCode) => {
      if (user.id !== order.buyer_id) {
        throw new Error('Only the buyer can confirm delivery');
      }

      if (!order.handoff_code) {
        throw new Error('No handoff code has been generated yet');
      }

      const now = new Date();
      const expiresAt = new Date(order.handoff_expires_at);
      
      if (now > expiresAt) {
        throw new Error('Code expired—ask seller to generate a new one');
      }

      if (order.handoff_attempts >= order.handoff_max_attempts) {
        throw new Error('Too many attempts—ask seller to regenerate');
      }

      if (inputCode !== order.handoff_code) {
        await base44.entities.Order.update(order.id, {
          handoff_attempts: order.handoff_attempts + 1
        });
        throw new Error('Incorrect code. Please try again.');
      }

      await base44.entities.Order.update(order.id, {
        handoff_confirmed_by: user.id,
        handoff_confirmed_at: now.toISOString(),
        handoff_code: null,
        handoff_qr_token: null,
        delivery_confirmed_by_buyer: true,
        delivery_confirmed_at: now.toISOString(),
        status: 'Completed'
      });

      console.log('Stripe PaymentIntent captured:', order.stripe_payment_intent_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
      setHandoffCode('');
      setCodeError('');
      setShowRating(true);
    },
    onError: (err) => {
      setCodeError(err.message);
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Order.update(order.id, {
        status: 'Completed',
        delivery_confirmed_by_buyer: true,
        delivery_confirmed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
      setShowRating(true);
    },
  });

  const submitRatingMutation = useMutation({
    mutationFn: async ({ stars, comment }) => {
      const rateeId = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
      
      await base44.entities.Rating.create({
        order_id: order.id,
        rater_id: user.id,
        ratee_id: rateeId,
        stars: stars,
        comment: comment || '',
      });

      const ratee = await base44.entities.User.filter({ id: rateeId });
      if (ratee[0]) {
        const newCount = (ratee[0].rating_count || 0) + 1;
        const newSum = (ratee[0].rating_sum || 0) + stars;
        const newAvg = newSum / newCount;
        
        await base44.entities.User.update(rateeId, {
          rating_count: newCount,
          rating_sum: newSum,
          average_rating: newAvg,
        });
      }

      const updateData = user.id === order.buyer_id 
        ? { buyer_rated: true }
        : { seller_rated: true };
      
      await base44.entities.Order.update(order.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['my-rating'] });
      setShowRating(false);
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);
      setDisputeEvidence([...disputeEvidence, ...fileUrls]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const openDisputeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Dispute.create({
        order_id: order.id,
        raised_by_id: user.id,
        reason: disputeReason,
        evidence: disputeEvidence,
        status: 'Open',
      });

      await base44.entities.Order.update(order.id, {
        status: 'Disputed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
      setShowDispute(false);
      setDisputeReason('');
      setDisputeEvidence([]);
    },
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#B08968]" />
      </div>
    );
  }

  if (!order || (order.buyer_id !== user.id && order.seller_id !== user.id)) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h2>
          <Button onClick={() => navigate(createPageUrl('Profile'))}>
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  const isBuyer = user.id === order.buyer_id;
  const timeUntilAutoRelease = order.auto_release_time 
    ? Math.max(0, (new Date(order.auto_release_time) - new Date()) / (1000 * 60 * 60))
    : null;

  const isHandoffActive = order.handoff_code && order.handoff_expires_at && 
    new Date() < new Date(order.handoff_expires_at);
  
  const timeUntilHandoffExpiry = order.handoff_expires_at 
    ? Math.max(0, (new Date(order.handoff_expires_at) - new Date()) / (1000 * 60 * 60))
    : null;

  const qrUrl = order.handoff_qr_token 
    ? `${window.location.origin}${createPageUrl('VerifyHandoff')}?oid=${order.id}&t=${order.handoff_qr_token}`
    : '';

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Details</h1>
          <p className="text-gray-600">Order ID: {order.id.slice(0, 8)}...</p>
        </div>

        {/* Status Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#B08968] to-[#D4AF37] flex items-center justify-center shadow-md">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">{order.status}</p>
              </div>
            </div>
            <Badge className={
              order.status === 'Completed' ? 'bg-green-100 text-green-700 border border-green-200' :
              order.status === 'Ready' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
              order.status === 'Disputed' ? 'bg-red-100 text-red-700 border border-red-200' :
              order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
              'bg-gray-100 text-gray-700 border border-gray-200'
            }>
              {order.status}
            </Badge>
          </div>
        </div>

        {/* SELLER VIEW - Generate & Show Verification Code */}
        {!isBuyer && (order.status === 'Pending' || order.status === 'Ready') && (
          <div className="bg-white border-2 border-[#B08968] rounded-xl mb-6 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-[#B08968]" />
                <h3 className="text-xl font-bold text-gray-900">Verification Code for Buyer</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {!isHandoffActive ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    When you meet the buyer, generate a verification code and give it to them. They'll enter it to confirm they received the item.
                  </p>
                  <Button
                    onClick={() => generateHandoffCodeMutation.mutate()}
                    disabled={generateHandoffCodeMutation.isPending}
                    className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold rounded-lg shadow-md"
                  >
                    {generateHandoffCodeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Generate Verification Code
                      </>
                    )}
                  </Button>
                  {generateHandoffCodeMutation.error && (
                    <Alert variant="destructive" className="mt-3 bg-red-50 border-red-200">
                      <AlertDescription className="text-red-600">{generateHandoffCodeMutation.error.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div>
                  <Alert className="bg-green-50 border-green-200 mb-4">
                    <AlertTriangle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-gray-900">
                      <strong className="text-green-600">Give this code to the buyer</strong> when you hand over the item. They need to enter it to confirm receipt.
                    </AlertDescription>
                  </Alert>

                  {/* Large Code Display */}
                  <div className="bg-gradient-to-br from-[#B08968] to-[#D4AF37] rounded-lg p-8 text-center mb-4 border-2 border-[#B08968] shadow-md">
                    <p className="text-sm text-white/80 mb-3">Your Verification Code</p>
                    <p className="text-7xl font-bold text-white tracking-wider font-mono">
                      {order.handoff_code}
                    </p>
                    <p className="text-sm text-white/80 mt-3">
                      Expires in {timeUntilHandoffExpiry?.toFixed(1)} hours
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-3">Or buyer can scan this QR code:</p>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                      alt="Verification QR Code"
                      className="mx-auto rounded-lg shadow-md"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
                    <div>
                      <p>Failed attempts: {order.handoff_attempts || 0} / {order.handoff_max_attempts || 5}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BUYER VIEW - Enter Code from Seller */}
        {isBuyer && (order.status === 'Pending' || order.status === 'Ready') && (
          <div className="bg-white border-2 border-green-500 rounded-xl mb-6 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Confirm You Received the Item</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-gray-900">
                  <strong className="text-blue-600">After receiving the item:</strong> Ask the seller for their 6-digit verification code and enter it below, or scan their QR code.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label htmlFor="handoff-code" className="text-gray-900">Enter Seller's 6-Digit Code</Label>
                <Input
                  id="handoff-code"
                  type="text"
                  maxLength={6}
                  value={handoffCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setHandoffCode(value);
                    setCodeError('');
                  }}
                  placeholder="000000"
                  className="text-center text-3xl font-mono tracking-widest bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
                />

                {codeError && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-600">{codeError}</AlertDescription>
                  </Alert>
                )}

                {order.handoff_attempts > 0 && (
                  <p className="text-sm text-gray-600">
                    Failed attempts: {order.handoff_attempts} / {order.handoff_max_attempts || 5}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => confirmHandoffMutation.mutate(handoffCode)}
                    disabled={handoffCode.length !== 6 || confirmHandoffMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md"
                  >
                    {confirmHandoffMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Received
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => navigate(createPageUrl(`VerifyHandoff?oid=${order.id}&scan=true`))}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </Button>
                </div>
              </div>

              {/* Fallback: Old Manual Confirm Button */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2">
                  Seller hasn't generated a code yet? Use manual confirmation:
                </p>
                <Button
                  onClick={() => confirmDeliveryMutation.mutate()}
                  disabled={confirmDeliveryMutation.isPending}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                  size="sm"
                >
                  Manual Confirm (No Code Required)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Seller View - Awaiting Buyer Code Entry */}
        {order.status === 'Ready' && !isBuyer && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-gray-900">
              <strong>Waiting for buyer to enter the code.</strong> Once they enter the code you gave them, payment will be released.
            </AlertDescription>
          </Alert>
        )}

        {/* Auto-Release Timer for Buyer */}
        {order.status === 'Pending' && isBuyer && timeUntilAutoRelease !== null && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-gray-900">
              <strong>Auto-Release:</strong> Funds will be automatically released to seller in {timeUntilAutoRelease.toFixed(1)} hours unless you confirm delivery or open a dispute.
            </AlertDescription>
          </Alert>
        )}

        {/* Order Info */}
        <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Order Information</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
              {listing?.photos?.[0] && (
                <img 
                  src={listing.photos[0]} 
                  alt={order.listing_title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{order.listing_title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isBuyer ? 'Seller' : 'Buyer'}: {otherUser?.name || 'Loading...'}
                </p>
                {otherUser && otherUser.rating_count > 0 && (
                  <div className="mt-2">
                    <RatingStars 
                      rating={otherUser.average_rating || otherUser.rating_sum / otherUser.rating_count}
                      count={otherUser.rating_count}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Final Price</p>
                <p className="font-semibold text-lg text-gray-900">£{order.final_price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Platform Fee</p>
                <p className="font-semibold text-lg text-gray-900">£{order.app_fee_final.toFixed(2)}</p>
              </div>
              {order.credits_applied > 0 && (
                <div>
                  <p className="text-gray-600">Credits Used</p>
                  <p className="font-semibold text-green-600">-£{order.credits_applied.toFixed(2)}</p>
                </div>
              )}
              {!isBuyer && (
                <div>
                  <p className="text-gray-600">Your Payout</p>
                  <p className="font-semibold text-lg text-green-600">£{order.seller_payout.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dispute Button */}
        {order.status === 'Pending' && isBuyer && (
          <div className="mb-6">
            <Button
              onClick={() => setShowDispute(true)}
              variant="outline"
              className="w-full border-red-500 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Flag className="w-5 h-5 mr-2" />
              Open Dispute
            </Button>
          </div>
        )}

        {/* Dispute Form */}
        {showDispute && (
          <div className="bg-white border-2 border-red-500 rounded-xl mb-6 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-red-500">Open Dispute</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-900">Reason for Dispute</Label>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="bg-gray-50 border-gray-300 text-gray-900 focus:border-red-500 rounded-lg"
                />
              </div>

              <div>
                <Label className="text-gray-900">Evidence (Photos, Documents)</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="bg-gray-50 border-gray-300 text-gray-900 focus:border-red-500 rounded-lg"
                />
                {disputeEvidence.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {disputeEvidence.length} file(s) uploaded
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => openDisputeMutation.mutate()}
                  disabled={!disputeReason || openDisputeMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md"
                >
                  Submit Dispute
                </Button>
                <Button
                  onClick={() => setShowDispute(false)}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rating Section */}
        {order.status === 'Completed' && !myRating && (
          <div className="mb-6">
            {showRating ? (
              <RatingForm
                onSubmit={(data) => submitRatingMutation.mutate(data)}
                targetName={otherUser?.name || (isBuyer ? 'Seller' : 'Buyer')}
                loading={submitRatingMutation.isPending}
              />
            ) : (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-gray-900">
                    Rate your experience with {otherUser?.name || (isBuyer ? 'the seller' : 'the buyer')}
                  </span>
                  <Button
                    onClick={() => setShowRating(true)}
                    size="sm"
                    className="bg-[#B08968] hover:bg-[#9A7456] text-white rounded-lg shadow-md"
                  >
                    Leave Rating
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {myRating && (
          <Alert className="bg-green-50 border-green-200 mb-6">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-gray-900">
              You rated this transaction {myRating.stars} stars
              {myRating.comment && `: "${myRating.comment}"`}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
