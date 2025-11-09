
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User as UserIcon, Gavel, ShoppingCart, AlertCircle, Loader2, CheckCircle, TrendingDown } from 'lucide-react';
import CountdownTimer from '../components/marketplace/CountdownTimer';
import RatingStars from '../components/marketplace/RatingStars';

export default function ListingDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId,
  });

  const { data: seller } = useQuery({
    queryKey: ['user', listing?.seller_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: listing.seller_id });
      return users[0];
    },
    enabled: !!listing?.seller_id,
  });

  const { data: auction, isLoading: auctionLoading } = useQuery({
    queryKey: ['auction', listing?.active_auction_id],
    queryFn: async () => {
      const auctions = await base44.entities.Auction.filter({ id: listing.active_auction_id });
      return auctions[0];
    },
    enabled: !!listing?.active_auction_id,
    refetchInterval: 5000,
  });

  const { data: bids } = useQuery({
    queryKey: ['bids', auction?.id],
    queryFn: async () => {
      const allBids = await base44.entities.Bid.filter({ auction_id: auction.id }, '-created_date');
      return allBids;
    },
    enabled: !!auction?.id,
    refetchInterval: 5000,
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in to purchase');
      if (user.id === listing.seller_id) throw new Error('You cannot buy your own listing');
      
      const finalPrice = listing.buy_now_price || auction?.current_price || listing.start_price;
      const startPrice = auction?.start_price || listing.start_price;
      
      const appFeeRaw = Math.max(0, Math.round((finalPrice - startPrice) * 0.10 * 100) / 100);
      const creditsApplied = Math.min(appFeeRaw, user.credits_balance || 0);
      const appFeeFinal = Math.max(0, appFeeRaw - creditsApplied);
      const sellerPayout = finalPrice - appFeeFinal;

      const order = await base44.entities.Order.create({
        listing_id: listing.id,
        auction_id: auction?.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        start_price: startPrice,
        final_price: finalPrice,
        app_fee_raw: appFeeRaw,
        credits_applied: creditsApplied,
        app_fee_final: appFeeFinal,
        seller_payout: sellerPayout,
        status: 'Pending',
        listing_title: listing.title,
      });

      return order;
    },
    onSuccess: (order) => {
      navigate(createPageUrl(`Checkout?id=${order.id}`));
    },
    onError: (err) => {
      setError(err.message || 'Failed to create order');
    },
  });

  const placeBidMutation = useMutation({
    mutationFn: async (amount) => {
      if (!user) throw new Error('Please sign in to place a bid');
      if (user.id === listing.seller_id) throw new Error('You cannot bid on your own listing');
      
      const now = new Date();
      const endTime = new Date(auction.end_time);
      if (now >= endTime) throw new Error('Auction has ended');
      
      if (amount <= auction.current_price) {
        throw new Error(`Bid must be higher than current price of £${auction.current_price.toFixed(2)}`);
      }

      const bid = await base44.entities.Bid.create({
        auction_id: auction.id,
        bidder_id: user.id,
        bidder_name: user.name,
        amount: amount,
      });

      await base44.entities.Auction.update(auction.id, {
        current_price: amount,
        bid_count: (auction.bid_count || 0) + 1,
      });

      await base44.entities.PricePoint.create({
        auction_id: auction.id,
        price: amount,
        at: new Date().toISOString(),
      });

      return bid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction'] });
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      setBidAmount('');
      setSuccess('Bid placed successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const handleBuyNow = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    if (!user.verified) {
      setError('Please verify your email before making a purchase. Check your Profile for the verification link.');
      return;
    }
    createOrderMutation.mutate();
  };

  const handlePlaceBid = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    if (!user.verified) {
      setError('Please verify your email before placing bids. Check your Profile for the verification link.');
      return;
    }
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }
    placeBidMutation.mutate(amount);
  };

  const isAuctionEnded = auction && new Date() >= new Date(auction.end_time);
  const isSeller = user && listing && user.id === listing.seller_id;

  if (listingLoading || auctionLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6 bg-gray-200" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square bg-gray-200" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 bg-gray-200" />
              <Skeleton className="h-24 w-full bg-gray-200" />
              <Skeleton className="h-32 w-full bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing not found</h2>
          <Button 
            onClick={() => navigate(createPageUrl('Home'))}
            className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold rounded-lg"
          >
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const savingsPercent = listing.retail_price && auction 
    ? Math.round(((listing.retail_price - auction.current_price) / listing.retail_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Home'))}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Photos */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
              {listing.photos?.[selectedPhoto] ? (
                <img
                  src={listing.photos[selectedPhoto]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Gavel className="w-24 h-24 text-gray-300" />
                </div>
              )}
            </div>
            
            {listing.photos?.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {listing.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhoto(index)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedPhoto === index 
                        ? 'border-[#B08968] shadow-md' 
                        : 'border-gray-200 hover:border-[#B08968]/50'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
                  {listing.category}
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                  {listing.condition}
                </Badge>
                {isAuctionEnded && (
                  <Badge className="bg-red-50 text-red-600 border border-red-200">
                    Ended
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{listing.title}</h1>
              
              {listing.description && (
                <p className="text-gray-600 leading-relaxed">{listing.description}</p>
              )}
            </div>

            {seller && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#B08968] rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Seller</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      {seller.name}
                      {seller.verified && (
                        <Badge className="bg-green-100 text-green-700 text-xs border border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </p>
                    {seller.rating_count > 0 && (
                      <div className="mt-1">
                        <RatingStars 
                          rating={seller.average_rating || seller.rating_sum / seller.rating_count} 
                          count={seller.rating_count}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {auction && <CountdownTimer endTime={auction.end_time} />}

            {listing.retail_price && auction && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">You Save {savingsPercent}%</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Retail Price</span>
                    <span className="line-through text-gray-400">£{listing.retail_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Price</span>
                    <span className="text-2xl font-bold text-green-600">£{auction.current_price.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${savingsPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-600">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            {/* Bidding Section */}
            {!isAuctionEnded && !isSeller && auction && (
              <div className="bg-white border-2 border-[#2D3648] rounded-xl p-6 space-y-4 shadow-md">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Bid</p>
                  <p className="text-5xl font-bold text-[#2D3648]">
                    £{auction.current_price.toFixed(2)}
                  </p>
                  {auction.bid_count > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {auction.bid_count} {auction.bid_count === 1 ? 'bid' : 'bids'}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={`Min £${(auction.current_price + 0.50).toFixed(2)}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="flex-1 h-12 text-lg bg-gray-50 border-gray-300 text-gray-900 focus:border-[#2D3648] rounded-lg"
                    />
                    <Button
                      onClick={handlePlaceBid}
                      disabled={placeBidMutation.isPending || !bidAmount}
                      className="bg-[#2D3648] hover:bg-[#1F2937] text-white font-semibold h-12 px-8 rounded-lg shadow-md"
                    >
                      {placeBidMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Gavel className="w-5 h-5 mr-2" />
                          Place Bid
                        </>
                      )}
                    </Button>
                  </div>

                  {listing.buy_now_price && (
                    <Button
                      onClick={handleBuyNow}
                      disabled={createOrderMutation.isPending}
                      variant="outline"
                      className="w-full h-12 border-2 border-[#B08968] text-[#B08968] hover:bg-[#B08968]/10 rounded-lg"
                    >
                      {createOrderMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Buy Now for £{listing.buy_now_price.toFixed(2)}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isSeller && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-600">
                  This is your listing. You cannot bid on your own items.
                </AlertDescription>
              </Alert>
            )}

            {/* Bid History */}
            {bids && bids.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-[#B08968]" />
                  Bid History
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {bids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-[#2D3648] border border-gray-200">
                          #{bids.length - index}
                        </Badge>
                        <div>
                          <p className="font-medium text-gray-900">{bid.bidder_name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(bid.created_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-[#B08968]">
                        £{bid.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
