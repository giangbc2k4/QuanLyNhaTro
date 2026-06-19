"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 500, suffix: "+", label: "Chủ nhà trọ", description: "đang sử dụng" },
  { value: 5000, suffix: "+", label: "Phòng trọ", description: "được quản lý" },
  { value: 90, suffix: "%", label: "Tiết kiệm", description: "thời gian mỗi tháng" },
  { value: 99.9, suffix: "%", label: "Uptime", description: "hệ thống ổn định" },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current * 10) / 10);
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-4xl sm:text-5xl font-extrabold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
      {Number.isInteger(value) ? Math.floor(count).toLocaleString() : count.toFixed(1)}
      <span className="text-gradient-accent">{suffix}</span>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="relative py-20 border-y border-border">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/[0.02] via-purple/[0.03] to-teal/[0.02] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center group">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              <p className="text-sm font-semibold text-text-primary mt-2">
                {stat.label}
              </p>
              <p className="text-xs text-text-muted mt-1">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
