import { memo } from "react";

interface SparklineData {
  date: string;
  value: number;
}

interface SparklineChartProps {
  data: SparklineData[];
  period: string;
  width?: number;
  height?: number;
}

const SparklineChart = memo(({ data, period, width = 60, height = 24 }: SparklineChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">
        No data
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue || 1;

  // Generate SVG path
  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((d.value - minValue) / valueRange) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  const pathData = `M ${points}`;
  
  // Determine color based on trend
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const isUpward = lastValue > firstValue;
  const strokeColor = isUpward ? 'hsl(var(--confidence-high))' : 'hsl(var(--muted-foreground))';

  return (
    <div className="relative group">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id={`gradient-${period}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        {data.length > 1 && (
          <path
            d={`${pathData} L ${width - 2},${height - 2} L 2,${height - 2} Z`}
            fill={`url(#gradient-${period})`}
            className="opacity-50"
          />
        )}
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-200"
        />
        
        {/* Data points */}
        {data.map((d, index) => {
          const x = (index / (data.length - 1)) * (width - 4) + 2;
          const y = height - 2 - ((d.value - minValue) / valueRange) * (height - 4);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1"
              fill={strokeColor}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            />
          );
        })}
      </svg>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="text-center">
          <div className="font-medium">{period}</div>
          <div className="text-muted-foreground">
            {maxValue.toFixed(1)} TI peak
          </div>
        </div>
      </div>
    </div>
  );
});

SparklineChart.displayName = "SparklineChart";

export { SparklineChart };