import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function PriceHistoryChart({ pricePoints }) {
  if (!pricePoints || pricePoints.length === 0) {
    return null;
  }

  const chartData = pricePoints.map(point => ({
    time: new Date(point.at).getTime(),
    price: point.price,
    displayTime: format(new Date(point.at), 'HH:mm')
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-slate-900">
            £{payload[0].value.toFixed(2)}
          </p>
          <p className="text-xs text-slate-600">
            {format(new Date(payload[0].payload.time), 'MMM d, HH:mm')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Price History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="displayTime" 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `£${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#6366f1" 
              strokeWidth={3}
              dot={{ fill: '#6366f1', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>{pricePoints.length} price points</span>
          <span>Last update: {format(new Date(pricePoints[pricePoints.length - 1].at), 'HH:mm')}</span>
        </div>
      </CardContent>
    </Card>
  );
}