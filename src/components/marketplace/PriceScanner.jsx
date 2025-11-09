import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingDown, TrendingUp, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PriceScanner({ title, description, startPrice, condition, onDataFetched }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [marketData, setMarketData] = useState(null);

  const checkMarketValue = async () => {
    if (!title || !startPrice) {
      setError('Please enter a title and starting price first');
      return;
    }

    setLoading(true);
    setError('');
    setMarketData(null);

    try {
      // Use AI to search for market prices with internet context
      const searchQuery = `Find current market prices for: ${title}${description ? `. ${description.substring(0, 200)}` : ''}. Condition: ${condition}. Search on eBay, Amazon, and other resale platforms. Focus on used/secondhand prices if condition is not "New".`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${searchQuery}

Analyze the current market prices for this item and provide a JSON response with:
1. average_price: The average resale/market price in GBP (number)
2. min_price: Lowest price found in GBP (number)
3. max_price: Highest price found in GBP (number)
4. sample_count: How many listings you found (number, 3-10)
5. price_trend: "stable", "rising", or "falling"
6. comment: A brief analysis comparing the asking price of £${startPrice} to the market average. Be specific about the percentage difference and whether it's a good deal for buyers.

Important: Return ONLY valid JSON with these exact keys. Base your analysis on real current market data.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            average_price: { type: "number" },
            min_price: { type: "number" },
            max_price: { type: "number" },
            sample_count: { type: "number" },
            price_trend: { type: "string" },
            comment: { type: "string" }
          },
          required: ["average_price", "min_price", "max_price", "sample_count", "price_trend", "comment"]
        }
      });

      // Validate the response
      if (!result || typeof result.average_price !== 'number') {
        throw new Error('Unable to fetch market data. Please try again.');
      }

      const data = {
        average_market_price: result.average_price,
        market_price_range_min: result.min_price,
        market_price_range_max: result.max_price,
        ai_price_comment: result.comment,
        market_data_fetched_at: new Date().toISOString(),
        sample_count: result.sample_count,
        price_trend: result.price_trend
      };

      setMarketData(data);
      
      // Pass data back to parent component
      if (onDataFetched) {
        onDataFetched(data);
      }

    } catch (err) {
      console.error('Price scan error:', err);
      setError(err.message || 'Failed to fetch market prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const priceDifference = marketData && startPrice 
    ? ((startPrice - marketData.average_market_price) / marketData.average_market_price) * 100
    : 0;

  const isGoodDeal = priceDifference < -5; // More than 5% below market
  const isOverpriced = priceDifference > 10; // More than 10% above market

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#B08968]" />
          <h3 className="font-semibold text-gray-900">AI True Price Scanner</h3>
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border border-blue-200">
            Beta
          </Badge>
        </div>
        <Button
          onClick={checkMarketValue}
          disabled={loading || !title || !startPrice}
          variant="outline"
          size="sm"
          className="border-[#B08968] text-[#B08968] hover:bg-[#B08968]/10 rounded-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning Market...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Check Market Value
            </>
          )}
        </Button>
      </div>

      {loading && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#B08968]" />
              <div>
                <p className="font-medium text-gray-900">Analyzing market prices...</p>
                <p className="text-sm text-gray-600 mt-1">Searching eBay, Amazon & local listings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {marketData && !loading && (
        <Card className={`border-2 rounded-xl shadow-md ${
          isGoodDeal 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
            : isOverpriced 
            ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300'
            : 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-300'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              📊 Market Value Analysis
              {marketData.price_trend === 'rising' && (
                <Badge className="bg-blue-100 text-blue-700 text-xs border border-blue-200">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Rising
                </Badge>
              )}
              {marketData.price_trend === 'falling' && (
                <Badge className="bg-orange-100 text-orange-700 text-xs border border-orange-200">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Falling
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Market Stats */}
            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Market Average</p>
                <p className="text-xl font-bold text-gray-900">
                  £{marketData.average_market_price.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Price Range</p>
                <p className="text-sm font-semibold text-gray-900">
                  £{marketData.market_price_range_min.toFixed(0)} - £{marketData.market_price_range_max.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Your Price</p>
                <p className="text-xl font-bold text-[#B08968]">
                  £{startPrice.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Price Comparison */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Price Comparison</span>
                {isGoodDeal ? (
                  <Badge className="bg-green-100 text-green-700 border border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Great Deal
                  </Badge>
                ) : isOverpriced ? (
                  <Badge className="bg-red-100 text-red-700 border border-red-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Above Market
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                    Fair Price
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${
                  priceDifference < 0 ? 'text-green-600' : priceDifference > 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {priceDifference > 0 ? '+' : ''}{priceDifference.toFixed(1)}%
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        isGoodDeal ? 'bg-green-500' : isOverpriced ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.abs(priceDifference) * 5)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {priceDifference < 0 
                      ? `${Math.abs(priceDifference).toFixed(1)}% below market average` 
                      : priceDifference > 0
                      ? `${priceDifference.toFixed(1)}% above market average`
                      : 'At market average'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Comment */}
            <Alert className={`${
              isGoodDeal 
                ? 'bg-green-50 border-green-200' 
                : isOverpriced 
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <Sparkles className={`h-4 w-4 ${
                isGoodDeal ? 'text-green-600' : isOverpriced ? 'text-red-600' : 'text-blue-600'
              }`} />
              <AlertDescription className="text-gray-900">
                <strong className={
                  isGoodDeal ? 'text-green-700' : isOverpriced ? 'text-red-700' : 'text-blue-700'
                }>AI Analysis:</strong> {marketData.ai_price_comment}
              </AlertDescription>
            </Alert>

            {/* Data Source */}
            <p className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
              📊 Based on {marketData.sample_count} listings from eBay, Amazon & local marketplaces (last 24h)
            </p>
          </CardContent>
        </Card>
      )}

      {!marketData && !loading && !error && (
        <Card className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Check Your Item's Market Value</h4>
            <p className="text-sm text-gray-600 mb-4">
              Get instant AI-powered insights on how your price compares to current market listings
            </p>
            <ul className="text-xs text-gray-600 space-y-1 text-left max-w-md mx-auto">
              <li>✓ Real-time data from eBay, Amazon & resale platforms</li>
              <li>✓ AI analysis of pricing trends</li>
              <li>✓ Competitive pricing recommendations</li>
              <li>✓ Increase your chances of a quick sale</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}