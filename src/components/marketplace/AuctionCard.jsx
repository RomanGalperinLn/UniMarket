import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Gavel, TrendingDown } from 'lucide-react';

export default function AuctionCard({ listing, auction }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!auction) return;

    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(auction.end_time);
      const diff = endTime - now;

      if (diff <= 0) {
        setEnded(true);
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  const savingsPercent = listing.retail_price && auction 
    ? Math.round(((listing.retail_price - auction.current_price) / listing.retail_price) * 100)
    : 0;

  return (
    <Link to={createPageUrl(`ListingDetail?id=${listing.id}`)}>
      <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {listing.photos?.[0] ? (
            <img 
              src={listing.photos[0]} 
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gavel className="w-16 h-16 text-gray-300" />
            </div>
          )}
          
          {savingsPercent > 0 && (
            <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-md">
              <TrendingDown className="w-4 h-4" />
              {savingsPercent}% off
            </div>
          )}
          
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Badge className="bg-white/95 text-gray-900 border border-gray-200 shadow-sm">
              {listing.category}
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
              {listing.condition}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-[#B08968] transition-colors">
            {listing.title}
          </h3>

          {auction && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Bid</span>
                <span className="font-semibold text-[#B08968] text-lg">
                  £{auction.current_price.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className={ended ? 'text-red-600 font-medium' : 'text-gray-600'}>
                  {timeLeft}
                </span>
                {auction.bid_count > 0 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">
                      {auction.bid_count} {auction.bid_count === 1 ? 'bid' : 'bids'}
                    </span>
                  </>
                )}
              </div>

              <Button 
                className="w-full bg-[#2D3648] hover:bg-[#1F2937] text-white rounded-lg"
                disabled={ended}
              >
                <Gavel className="w-4 h-4 mr-2" />
                {ended ? 'Auction Ended' : 'Place Bid'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}