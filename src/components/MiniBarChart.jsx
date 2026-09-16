import React from 'react';

// Lightweight dependency-free SVG bar chart for small financial summaries.
export default function MiniBarChart({ data, height = 180, formatValue }) {
  const max = Math.max(1, ...data.map(d => Math.abs(d.value)));
  const barWidth = 100 / data.length;

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height,
        borderBottom: '1px solid var(--border-color)', padding: '0.5rem 0.25rem 0'
      }}>
        {data.map((d) => {
          const barHeight = Math.max(4, (Math.abs(d.value) / max) * (height - 40));
          return (
            <div key={d.label} style={{
              flex: `0 0 ${barWidth}%`, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'flex-end', height: '100%'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: d.color, marginBottom: '0.25rem' }}>
                {formatValue ? formatValue(d.value) : d.value}
              </div>
              <div style={{
                width: '65%', minWidth: 18, height: barHeight, borderRadius: '6px 6px 0 0',
                backgroundColor: d.color, transition: 'height 0.3s ease'
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem' }}>
        {data.map(d => (
          <div key={d.label} style={{ flex: `0 0 ${barWidth}%`, textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
