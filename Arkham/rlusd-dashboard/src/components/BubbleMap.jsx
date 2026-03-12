import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

const TYPE_COLORS = {
  cex: '#06b6d4',
  dex: '#a855f7',
  'lending-decentralized': '#f59e0b',
  misc: '#3b82f6',
  fund: '#22c55e',
};
const DEFAULT_COLOR = '#6366f1';

function getColor(type) {
  return TYPE_COLORS[type] || DEFAULT_COLOR;
}

function fmtUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function truncateLabel(name, radius) {
  if (!name) return '';
  const maxChars = Math.max(3, Math.floor(radius / 5));
  if (name.length <= maxChars) return name;
  return name.slice(0, maxChars - 1) + '\u2026';
}

export default function BubbleMap({ holders, totalHeld }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // ResizeObserver for responsiveness
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({ width, height: Math.max(280, Math.min(400, width * 0.55)) });
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!holders || holders.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Build hierarchy data for d3 pack layout
    const root = d3.hierarchy({
      children: holders.map((h) => ({
        ...h,
        value: Math.max(h.balanceUsd, 1),
      })),
    })
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);

    const pack = d3.pack()
      .size([width, height])
      .padding(4);

    pack(root);

    const leaves = root.leaves();

    // --- Circles ---
    const circles = svg
      .selectAll('g.bubble-node')
      .data(leaves, (d) => d.data.entityId);

    // EXIT
    circles.exit()
      .transition()
      .duration(400)
      .attr('opacity', 0)
      .remove();

    // ENTER
    const entered = circles.enter()
      .append('g')
      .attr('class', 'bubble-node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer');

    entered.append('circle')
      .attr('r', 0)
      .attr('fill', (d) => getColor(d.data.entityType))
      .attr('fill-opacity', 0.7)
      .attr('stroke', (d) => getColor(d.data.entityType))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 1);

    entered.append('text')
      .attr('class', 'bubble-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', '#e4e4e7')
      .attr('font-size', '11px')
      .attr('pointer-events', 'none');

    entered.append('text')
      .attr('class', 'bubble-amount')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('fill', '#a1a1aa')
      .attr('font-size', '9px')
      .attr('pointer-events', 'none');

    // MERGE (enter + update)
    const merged = entered.merge(circles);

    merged
      .transition()
      .duration(600)
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('opacity', 1);

    merged.select('circle')
      .transition()
      .duration(600)
      .attr('r', (d) => d.r);

    merged.select('.bubble-label')
      .text((d) => d.r > 20 ? truncateLabel(d.data.entityName, d.r) : '')
      .transition()
      .duration(600)
      .attr('font-size', (d) => `${Math.max(8, Math.min(12, d.r / 4.5))}px`);

    merged.select('.bubble-amount')
      .text((d) => d.r > 30 ? fmtUsd(d.data.balanceUsd) : '')
      .transition()
      .duration(600)
      .attr('font-size', (d) => `${Math.max(7, Math.min(10, d.r / 5.5))}px`);

    // Hover interactions
    const tooltip = d3.select(tooltipRef.current);

    merged
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', d.r * 1.05)
          .attr('fill-opacity', 1);

        const change = d.data.balanceUsd - d.data.prevBalanceUsd;
        const changePct = d.data.prevBalanceUsd > 0
          ? ((change / d.data.prevBalanceUsd) * 100).toFixed(1) + '%'
          : 'New';
        const share = totalHeld > 0
          ? ((d.data.balanceUsd / totalHeld) * 100).toFixed(1) + '%'
          : '0%';

        tooltip
          .style('opacity', '1')
          .style('pointer-events', 'none')
          .html(`
            <div style="font-weight:600;margin-bottom:4px;color:#f4f4f5">${d.data.entityName}</div>
            <div style="color:#a1a1aa;font-size:11px;margin-bottom:2px">Type: <span style="color:#e4e4e7">${(d.data.entityType || 'unknown').replace(/-/g, ' ')}</span></div>
            <div style="color:#a1a1aa;font-size:11px;margin-bottom:2px">Balance: <span style="color:#e4e4e7">${fmtUsd(d.data.balanceUsd)}</span></div>
            <div style="color:#a1a1aa;font-size:11px;margin-bottom:2px">Share: <span style="color:#e4e4e7">${share}</span></div>
            <div style="color:#a1a1aa;font-size:11px">Change: <span style="color:${change >= 0 ? '#22c55e' : '#ef4444'}">${changePct}</span></div>
          `);
      })
      .on('mousemove', function (event) {
        const containerRect = containerRef.current.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - containerRect.left + 14}px`)
          .style('top', `${event.clientY - containerRect.top - 10}px`);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', d.r)
          .attr('fill-opacity', 0.7);

        tooltip.style('opacity', '0');
      });
  }, [holders, totalHeld, dimensions]);

  if (!holders || holders.length === 0) {
    return (
      <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md p-6">
        <div className="text-zinc-400 text-center py-12">No holder data available</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1d25]">
        <div>
          <h3 className="text-xs font-semibold text-zinc-100">Entity Distribution</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5">Bubble size represents holdings</p>
        </div>
        <div className="flex gap-2">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-zinc-600">{type.replace(/-/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="relative px-2 py-2" style={{ minHeight: 300 }}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        <div
          ref={tooltipRef}
          className="absolute z-50 bg-[#0f1117] border border-[#1a1d25] rounded-md px-3 py-2 shadow-xl text-[11px] font-mono"
          style={{
            opacity: 0,
            transition: 'opacity 0.15s',
            pointerEvents: 'none',
            maxWidth: 220,
          }}
        />
      </div>
    </div>
  );
}
