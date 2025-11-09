import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Gavel, Loader2, Users, TrendingUp } from 'lucide-react';
import CountdownTimer from '../components/marketplace/CountdownTimer';
import PriceHistoryChart from '../components/marketplace/PriceHistoryChart';
import RatingStars from '../components/marketplace/RatingStars';

export default function AuctionRoom() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const urlParams = new URLSearchParams(window.location.search);
  const auctionId = urlParams.get('id');

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

  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      const auctions = await base44.entities.Auction.filter({ id: auctionId });
      return auctions[0];
    },
    enabled: !!auctionId,
    refetchInterval: 3000,
  });

  const { data: listing } = useQuery({
    queryKey: ['listing', auction?.listing_id],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: auction.listing_id });
      return listings[0];
    },
    enabled: !!auction?.listing_id,
  });

  const { data: seller } = useQuery({
    queryKey: ['seller', listing?.seller_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: listing.seller_id });
      return users[0];
    },
    enabled: !!listing?.seller_id,
  });

  const { data: bids } = useQuery({
    queryKey: ['bids', auctionId],
    queryFn: async () => {
      return await base44.entities.Bid.filter({ auction_id: auctionId }, '-created_date');
    },
    enabled: !!auctionId,
    refetchInterval: 3000,
  });

  const { data: pricePoints } = useQuery({
    queryKey: ['price-points', auctionId],
    queryFn: async () => {
      return await base44.entities.PricePoint.filter({ auction_id: auctionId }, 'at');
    },
    enabled: !!auctionId,
    refetchInterval: 3000,
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
        bidder_name: user.name || user.email,
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
      queryClient.invalidateQueries({ queryKey: ['price-points'] });
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

  const handlePlaceBid = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
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
  const isWinning = user && bids?.[0]?.bidder_id === user.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Auction not found</h2>
          <Button onClick={() => navigate(createPageUrl('Home'))}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl(`ListingDetail?id=${listing?.id}`))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Listing
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Header */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{listing?.title}</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{listing?.category}</Badge>
                      <Badge variant="outline">{listing?.condition}</Badge>
                      {isAuctionEnded && (
                        <Badge className="bg-slate-700">Auction Ended</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {auction && <CountdownTimer endTime={auction.end_time} />}
              </CardContent>
            </Card>

            {/* Current Price */}
            <Card className="border-indigo-200">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-slate-600 mb-2">Current Bid</p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <p className="text-5xl font-bold text-indigo-600">
                    £{auction.current_price.toFixed(2)}
                  </p>
                  {isWinning && !isAuctionEnded && (
                    <Badge className="bg-green-600">You're Winning!</Badge>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{auction.bid_count} {auction.bid_count === 1 ? 'bid' : 'bids'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Starting: £{auction.start_price.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price History Chart */}
            {pricePoints && pricePoints.length > 0 && (
              <PriceHistoryChart pricePoints={pricePoints} />
            )}

            {/* Seller Info */}
            {seller && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Seller Information</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-indigo-600">
                        {seller.name?.charAt(0) || 'S'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{seller.name}</p>
                      {seller.rating_count > 0 && (
                        <RatingStars 
                          rating={seller.average_rating || seller.rating_sum / seller.rating_count} 
                          count={seller.rating_count}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Bidding & Bid History */}
          <div className="space-y-6">
            {/* Bidding Form */}
            {!isAuctionEnded && !isSeller && (
              <Card className="border-2 border-indigo-600">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-slate-900 text-lg">Place Your Bid</h3>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-green-500 bg-green-50">
                      <AlertDescription className="text-green-700">{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={`Min £${(auction.current_price + 0.50).toFixed(2)}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="h-14 text-lg"
                    />
                    <Button
                      onClick={handlePlaceBid}
                      disabled={placeBidMutation.isPending || !bidAmount}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg"
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

                  <p className="text-xs text-slate-500 text-center">
                    By placing a bid, you agree to purchase if you win
                  </p>
                </CardContent>
              </Card>
            )}

            {isSeller && (
              <Alert>
                <AlertDescription>
                  This is your listing. You cannot bid on your own items.
                </AlertDescription>
              </Alert>
            )}

            {isAuctionEnded && (
              <Alert className="bg-slate-100">
                <AlertDescription>
                  This auction has ended. {auction.winner_id ? 'Winner has been determined.' : 'No bids were placed.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Bid History */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Bid History</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bids && bids.length > 0 ? (
                    bids.map((bid, index) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={index === 0 ? "default" : "secondary"}
                            className={index === 0 ? "bg-green-600" : ""}
                          >
                            #{bids.length - index}
                          </Badge>
                          <div>
                            <p className="font-medium text-slate-900">
                              {bid.bidder_name}
                              {user && bid.bidder_id === user.id && (
                                <span className="text-xs text-indigo-600 ml-2">(You)</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(bid.created_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-indigo-600">
                          £{bid.amount.toFixed(2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No bids yet. Be the first to bid!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}