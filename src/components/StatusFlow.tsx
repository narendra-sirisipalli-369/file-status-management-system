import React from 'react';
import { STAGES, getStageIndex } from '@/lib/qrService';

interface StatusFlowProps {
  currentStatus: string;
}

export default function StatusFlow({ currentStatus }: StatusFlowProps) {
  const currentIdx = getStageIndex(currentStatus);

  // SVG config
  const stageCount    = STAGES.length;
  const nodeRadius    = 18;
  const stageWidth    = 120;
  const svgWidth      = stageCount * stageWidth;
  const svgHeight     = 120;
  const cy            = 40;  // center Y for circles
  const lineY         = cy;

  return (
    <div style={{ overflowX: 'auto', padding: '1rem 0' }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        style={{ minWidth: `${Math.min(svgWidth, 900)}px`, display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow for completed nodes */}
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-blue">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Active pulse animation */}
          <style>{`
            @keyframes svgPulse {
              0%,100% { r: ${nodeRadius}px; opacity: 0.6; }
              50%      { r: ${nodeRadius + 4}px; opacity: 0.1; }
            }
            .pulse-ring { animation: svgPulse 2s infinite ease-in-out; }
          `}</style>
          {/* Line gradient */}
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#39ff14" stopOpacity="0.8" />
            <stop offset="50%"  stopColor="#58a6ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#484f58" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* === CONNECTOR LINES === */}
        {STAGES.slice(0, -1).map((_, idx) => {
          const x1 = idx * stageWidth + nodeRadius + stageWidth / 2 - nodeRadius + stageWidth / 2 - stageWidth / 2 + stageWidth / 2;
          // Simplified: center of each node
          const cx1 = idx * stageWidth + stageWidth / 2;
          const cx2 = (idx + 1) * stageWidth + stageWidth / 2;
          const isDone = idx < currentIdx;
          return (
            <line
              key={`line-${idx}`}
              x1={cx1 + nodeRadius}
              y1={lineY}
              x2={cx2 - nodeRadius}
              y2={lineY}
              stroke={isDone ? '#39ff14' : '#242a34'}
              strokeWidth={isDone ? 2 : 1}
              strokeDasharray={isDone ? 'none' : '4,4'}
              opacity={isDone ? 0.7 : 0.4}
            />
          );
        })}

        {/* === STAGE NODES === */}
        {STAGES.map((stage, idx) => {
          const cx    = idx * stageWidth + stageWidth / 2;
          const isDone   = idx < currentIdx;
          const isActive = idx === currentIdx;
          const color    = isActive ? stage.color : isDone ? '#39ff14' : '#242a34';
          const textColor = (isDone || isActive) ? '#fff' : '#484f58';
          const strokeColor = isActive ? stage.color : isDone ? '#39ff14' : '#484f58';
          const labelY  = cy + nodeRadius + 18;

          return (
            <g key={stage.key}>
              {/* Pulse ring for active node */}
              {isActive && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={nodeRadius + 6}
                  fill="none"
                  stroke={stage.color}
                  strokeWidth={1.5}
                  opacity={0.35}
                  className="pulse-ring"
                />
              )}

              {/* Main circle */}
              <circle
                cx={cx}
                cy={cy}
                r={nodeRadius}
                fill={isDone ? 'rgba(57,255,20,0.12)' : isActive ? `${stage.color}22` : 'rgba(36,42,52,0.8)'}
                stroke={strokeColor}
                strokeWidth={isActive ? 2 : 1.5}
                filter={isDone ? 'url(#glow-green)' : isActive ? 'url(#glow-blue)' : 'none'}
              />

              {/* Checkmark or label inside circle */}
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="700"
                fill={isDone ? '#39ff14' : textColor}
                fontFamily="sans-serif"
              >
                {stage.short}
              </text>

              {/* Stage label below */}
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fontSize={8}
                fill={isActive ? stage.color : isDone ? '#39ff14' : '#484f58'}
                fontFamily="sans-serif"
                fontWeight={isActive ? '700' : '400'}
              >
                {stage.label.length > 10 ? stage.label.slice(0, 10) + '...' : stage.label}
              </text>

              {/* Active indicator arrow */}
              {isActive && (
                <polygon
                  points={`${cx - 5},${cy + nodeRadius + 4} ${cx + 5},${cy + nodeRadius + 4} ${cx},${cy + nodeRadius + 8}`}
                  fill={stage.color}
                  opacity={0.9}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
