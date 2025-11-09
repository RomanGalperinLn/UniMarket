import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, ExternalLink, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PriceComparison({ retailPrice, currentPrice, retailSourceUrl }) {
  if (!retailPrice || !currentPrice) return null;

  const savings = retailPrice - currentPrice;
  const savingsPercent = Math.round((savings / retailPrice) * 100);

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-900">Price Comparison</h3>
          </div>
          {savings > 0 && (
            <Badge className="bg-green-600 text-white">
              <TrendingDown className="w-3 h-3 mr-1" />
              {savingsPercent}% off
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Retail Price:</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-500 line-through">
                £{retailPrice.toFixed(2)}
              </span>
              {retailSourceUrl && (
                <a
                  href={retailSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Current Bid:</span>
            <span className="text-2xl font-bold text-indigo-600">
              £{currentPrice.toFixed(2)}
            </span>
          </div>

          {savings > 0 && (
            <div className="pt-3 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">You Save:</span>
                <span className="text-xl font-bold text-green-600">
                  £{savings.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}