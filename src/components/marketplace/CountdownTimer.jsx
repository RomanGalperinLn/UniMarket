import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ endTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (timeLeft.expired) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
        <p className="text-gray-600 text-lg font-medium">⏰ Auction Ended</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-[#B08968]" />
        <h3 className="font-semibold text-gray-900">Time Remaining</h3>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Days', value: timeLeft.days },
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Mins', value: timeLeft.minutes },
          { label: 'Secs', value: timeLeft.seconds }
        ].map((item, index) => (
          <div key={index} className="text-center">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 mb-2 border border-gray-200 shadow-sm">
              <div className="text-3xl font-bold text-[#2D3648]">
                {String(item.value).padStart(2, '0')}
              </div>
            </div>
            <div className="text-xs text-gray-500 uppercase">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}