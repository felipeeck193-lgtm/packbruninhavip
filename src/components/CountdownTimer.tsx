import { useState, useEffect } from "react";

interface CountdownTimerProps {
  initialMinutes?: number;
}

const CountdownTimer = ({ initialMinutes = 5 }: CountdownTimerProps) => {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    const timer = setInterval(() => {
      setTotalSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [totalSeconds]);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="bg-countdown text-countdown-foreground py-3 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide mb-1">
        ⏰ Tempo restante da oferta
      </p>
      <div className="flex items-center justify-center gap-2 text-3xl font-extrabold tabular-nums">
        <span className="bg-black/20 rounded-md px-3 py-1">
          {String(minutes).padStart(2, "0")}
        </span>
        <span className="animate-pulse">:</span>
        <span className="bg-black/20 rounded-md px-3 py-1">
          {String(seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
};

export default CountdownTimer;
