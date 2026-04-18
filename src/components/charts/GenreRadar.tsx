import React from 'react';
import { motion } from 'framer-motion';

interface GenreRadarProps {
  data: { label: string; value: number }[];
}

export const GenreRadar: React.FC<GenreRadarProps> = ({ data }) => {
  const size = 320;
  const center = size / 2;
  const radius = size * 0.35; // Slightly larger radius
  const angles = data.map((_, i) => (i * 2 * Math.PI) / data.length - Math.PI / 2);

  const getPoint = (angle: number, r: number) => ({
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle)
  });

  // Background Circles (Sonar Style)
  const backgroundLevels = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => (
    <circle
      key={level}
      cx={center}
      cy={center}
      r={radius * level}
      fill="none"
      stroke="white"
      strokeOpacity="0.03"
      strokeWidth="1"
      strokeDasharray="4 4"
    />
  ));

  // Axis lines
  const axes = angles.map((angle, i) => {
    const p = getPoint(angle, radius);
    return (
      <line
        key={i}
        x1={center}
        y1={center}
        x2={p.x}
        y2={p.y}
        stroke="white"
        strokeOpacity="0.05"
        strokeWidth="1"
      />
    );
  });

  // Data path
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const dataPoints = data.map((d, i) => {
    const p = getPoint(angles[i], (d.value / maxValue) * radius);
    return `${p.x},${p.y}`;
  }).join(' ');

  // Chiyo Red Hex: #ff4d4d
  const accentColor = "#ff4d4d";

  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Background Decorative Glow */}
      <div className="absolute inset-0 bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
      
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible relative z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.3" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {backgroundLevels}
        {axes}
        
        {/* Main Polygon */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          points={dataPoints}
          fill="url(#radarGradient)"
          stroke={accentColor}
          strokeOpacity="0.6"
          strokeWidth="1.5"
          style={{ transformOrigin: 'center' }}
        />

        {/* Bloom / Glow Polygon (Duplicate) */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          points={dataPoints}
          stroke={accentColor}
          fill="none"
          strokeWidth="4"
          filter="url(#glow)"
          style={{ transformOrigin: 'center' }}
        />
        
        {/* Data points (Glowing Orbs) */}
        {data.map((d, i) => {
          const p = getPoint(angles[i], (d.value / maxValue) * radius);
          return (
            <g key={i}>
              <motion.circle
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + (i * 0.1) }}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill={accentColor}
                filter="url(#glow)"
              />
              <motion.circle
                animate={{ 
                  scale: [1, 1.8, 1],
                  opacity: [0.3, 0, 0.3] 
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  delay: i * 0.5
                }}
                cx={p.x}
                cy={p.y}
                r="4"
                fill={accentColor}
              />
            </g>
          );
        })}

        {/* Labels - Redesigned with Native SVG text for Snapshots compatibility */}
        {data.map((d, i) => {
          const p = getPoint(angles[i], radius * 1.25);
          const valPercent = Math.round((d.value / maxValue) * 100);
          
          return (
            <g key={i}>
               <text
                 x={p.x}
                 y={p.y}
                 textAnchor="middle"
                 className="select-none"
                 style={{ fontStyle: 'italic' }}
               >
                 <tspan 
                   x={p.x} 
                   dy="-0.5em" 
                   fill="white" 
                   fillOpacity="0.4"
                   fontSize="8"
                   fontWeight="900"
                   style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
                 >
                   {d.label}
                 </tspan>
                 <tspan 
                   x={p.x} 
                   dy="1.2em" 
                   fill={accentColor}
                   fontSize="10"
                   fontWeight="bold"
                   style={{ fontFamily: 'Syncopate' }}
                 >
                   {valPercent}%
                 </tspan>
               </text>
            </g>
          );
        })}
      </svg>
      
      {/* Center Indicator */}
      <div 
        className="absolute w-2 h-2 rounded-full z-20 shadow-[0_0_10px_rgba(255,107,0,0.2)]" 
        style={{ backgroundColor: 'rgba(255, 77, 77, 0.2)', border: '1px solid rgba(255, 77, 77, 0.4)', backdropFilter: 'blur(4px)' }}
      />
    </div>
  );
};
