import React from 'react';
import { motion } from 'framer-motion';

interface HeatmapProps {
  data: { date: string; count: number }[];
}

export const ActivityHeatmap: React.FC<HeatmapProps> = ({ data }) => {
  // Config
  const weeksCount = 30; // Optimized for standard HD width
  const daysInWeek = 7;
  const today = new Date();
  
  const gridEndDate = new Date(today);
  const currentDay = today.getDay();
  gridEndDate.setDate(today.getDate() + (6 - currentDay));
  
  // Hexagon sizing
  const hexSize = 10;
  const width = hexSize * 2;
  const height = Math.sqrt(3) * hexSize;
  const hGap = width * 0.75;
  const vGap = height;

  // Red Theme Scale (#ff4d4d)
  const colorScale = (count: number) => {
    if (count === 0) return 'rgba(255, 255, 255, 0.02)';
    if (count === 1) return 'rgba(255, 77, 77, 0.15)';
    if (count === 2) return 'rgba(255, 77, 77, 0.35)';
    if (count === 3) return 'rgba(255, 77, 77, 0.65)';
    return 'rgba(255, 77, 77, 0.9)';
  };

  const dataMap = new Map(data.map(d => [d.date, d.count]));
  
  // Calculate month labels
  const monthLabels: { label: string; x: number }[] = [];
  let prevMonth = -1;

  const hexes = [];
  for (let w = 0; w < weeksCount; w++) {
    const weekStartDate = new Date(gridEndDate);
    weekStartDate.setDate(gridEndDate.getDate() - ((weeksCount - 1 - w) * 7 + 6));
    
    const currentMonth = weekStartDate.getMonth();
    if (currentMonth !== prevMonth) {
      monthLabels.push({
        label: weekStartDate.toLocaleString('default', { month: 'short' }),
        x: w * hGap
      });
      prevMonth = currentMonth;
    }

    for (let d = 0; d < daysInWeek; d++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + d);
      
      const dateStr = date.toISOString().split('T')[0];
      const count = dataMap.get(dateStr) || 0;
      const isFuture = date > today;
      
      const x = w * hGap;
      const y = d * vGap + (w % 2 === 0 ? 0 : vGap / 2);

      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        points.push(`${x + hexSize * Math.cos(angle)},${y + hexSize * Math.sin(angle)}`);
      }
      
      hexes.push(
        <motion.g 
          key={dateStr}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: isFuture ? 0.05 : 1, scale: 1 }}
        >
          <polygon
            points={points.join(' ')}
            fill={isFuture ? 'rgba(255,255,255,0.05)' : colorScale(count)}
            stroke="rgba(255, 77, 77, 0.1)"
            strokeWidth="0.5"
            className={`${isFuture ? '' : 'cursor-help'} transition-all duration-300 hover:stroke-accent hover:stroke-[2px]`}
          >
            {!isFuture && <title>{`${dateStr}: ${count} updates`}</title>}
          </polygon>
          {count > 2 && !isFuture && (
            <circle 
              cx={x} cy={y} r={hexSize * 0.4} 
              fill="#ff4d4d"
              fillOpacity="0.4"
              className="pointer-events-none"
              style={{ filter: 'blur(4px)' }}
            />
          )}
        </motion.g>
      );
    }
  }

  const svgWidth = (weeksCount - 1) * hGap + width;
  const svgHeight = (daysInWeek) * vGap;

  return (
    <div className="flex flex-col gap-6 select-none w-full max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 overflow-hidden">
        {/* Month Labels */}
        <div className="relative h-4">
          {monthLabels.map((m, i) => (
            <span 
              key={i} 
              className="absolute text-[8px] font-black uppercase tracking-[0.2em] text-text-muted/40 italic whitespace-nowrap -translate-x-1/2"
              style={{ left: `${(m.x / svgWidth) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Hex Grid */}
        <div className="flex justify-center w-full px-4 overflow-hidden">
          <svg 
            viewBox={`-10 -10 ${svgWidth + 20} ${svgHeight + 20}`}
            className="w-full h-auto max-w-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            {hexes}
          </svg>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="flex justify-between items-center px-2 border-t border-white/[0.03] pt-6">
        <div className="flex flex-col gap-1">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-text-muted/30">Hexagonal Growth Matrix</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-red-500 rotate-45 shadow-[0_0_10px_rgba(255,77,77,0.6)]" />
            <span className="text-[10px] font-syncopate font-bold text-white italic uppercase tracking-tighter">
               Neural Reading Density
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 py-2 px-5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">
          <span className="text-[7px] font-black uppercase tracking-widest text-text-muted/40">Basal</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((v) => (
              <div 
                key={v} 
                className="w-3 h-3 rounded-[2px]" 
                style={{ backgroundColor: colorScale(v) }} 
              />
            ))}
          </div>
          <span className="text-[7px] font-black uppercase tracking-widest text-text-muted/40">Peak</span>
        </div>
      </div>
    </div>
  );
};
