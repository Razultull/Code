import { useRef, useEffect, useState } from 'react';
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

function getName(cp) {
  if (cp.address?.arkhamEntity?.name) return cp.address.arkhamEntity.name;
  if (cp.address?.arkhamLabel?.name) return cp.address.arkhamLabel.name;
  const addr = cp.address?.address || '';
  if (addr.length > 12) return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  return addr || 'Unknown';
}

function getEntityType(cp) {
  return cp.address?.arkhamEntity?.type || cp.address?.arkhamLabel?.type || 'misc';
}

export default function FlowChart({ counterparties }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 350 });

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({ width, height: Math.max(280, Math.min(350, width * 0.45)) });
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const entries = counterparties?.ethereum || [];
    if (entries.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 30, bottom: 20, left: 30 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Categorize counterparties
    const inflows = entries.filter((e) => e.flow === 'in').sort((a, b) => b.usd - a.usd);
    const outflows = entries.filter((e) => e.flow === 'out').sort((a, b) => b.usd - a.usd);
    const biflows = entries.filter((e) => e.flow === 'all' || (!e.flow && e.flow !== 'in' && e.flow !== 'out')).sort((a, b) => b.usd - a.usd);

    // Layout parameters
    const centerX = innerW / 2;
    const nodeWidth = 100;
    const nodeHeight = 22;
    const centerNodeW = 66;
    const centerNodeH = 28;
    const colLeftX = 20;
    const colRightX = innerW - nodeWidth - 20;
    // Bidirectional nodes go slightly left/right of center
    const colBiLeftX = centerX - nodeWidth - 50;
    const colBiRightX = centerX + 50;

    const maxUsd = Math.max(1, ...entries.map((e) => e.usd || 0));

    // Draw Ripple center node
    const rippleGroup = g.append('g').attr('transform', `translate(${centerX - centerNodeW / 2},${innerH / 2 - centerNodeH / 2})`);
    rippleGroup.append('rect')
      .attr('width', centerNodeW)
      .attr('height', centerNodeH)
      .attr('rx', 8)
      .attr('fill', getColor('fund'))
      .attr('fill-opacity', 0.85)
      .attr('stroke', getColor('fund'))
      .attr('stroke-width', 1.5);
    rippleGroup.append('text')
      .attr('x', centerNodeW / 2)
      .attr('y', centerNodeH / 2 + 1)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text('Ripple');

    const tooltip = d3.select(tooltipRef.current);

    // Helper: draw a set of entity nodes on one side
    function drawColumn(items, x, startY, spacingY, isLeft) {
      const groups = [];
      items.forEach((cp, i) => {
        const name = getName(cp);
        const entityType = getEntityType(cp);
        const color = getColor(entityType);
        const y = startY + i * spacingY;

        const nodeG = g.append('g').attr('transform', `translate(${x},${y})`);

        nodeG.append('rect')
          .attr('width', nodeWidth)
          .attr('height', nodeHeight)
          .attr('rx', 6)
          .attr('fill', color)
          .attr('fill-opacity', 0.2)
          .attr('stroke', color)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.6);

        nodeG.append('text')
          .attr('x', nodeWidth / 2)
          .attr('y', nodeHeight / 2 + 1)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#d4d4d8')
          .attr('font-size', '10px')
          .text(name.length > 16 ? name.slice(0, 14) + '\u2026' : name);

        groups.push({ cp, x, y, name, entityType, color });
      });
      return groups;
    }

    // Position columns
    const maxLeftItems = inflows.length || 1;
    const maxRightItems = outflows.length || 1;
    const maxBiItems = biflows.length || 1;

    const leftSpacing = Math.min(28, (innerH - 40) / Math.max(maxLeftItems, 1));
    const rightSpacing = Math.min(28, (innerH - 40) / Math.max(maxRightItems, 1));
    const biSpacing = Math.min(28, (innerH - 40) / Math.max(maxBiItems, 1));

    const leftStartY = Math.max(10, (innerH - maxLeftItems * leftSpacing) / 2);
    const rightStartY = Math.max(10, (innerH - maxRightItems * rightSpacing) / 2);
    const biStartY = Math.max(10, (innerH - maxBiItems * biSpacing) / 2);

    const leftNodes = drawColumn(inflows, colLeftX, leftStartY, leftSpacing, true);
    const rightNodes = drawColumn(outflows, colRightX, rightStartY, rightSpacing, false);

    // Bidirectional: place on both sides near center
    const biNodesData = biflows.map((cp, i) => {
      const name = getName(cp);
      const entityType = getEntityType(cp);
      const color = getColor(entityType);
      const y = biStartY + i * biSpacing;
      // alternate sides or place above/below
      const side = i % 2 === 0 ? 'left' : 'right';
      const x = side === 'left' ? colBiLeftX : colBiRightX;

      const nodeG = g.append('g').attr('transform', `translate(${x},${y})`);

      nodeG.append('rect')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 6)
        .attr('fill', color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-dasharray', '4,2');

      nodeG.append('text')
        .attr('x', nodeWidth / 2)
        .attr('y', nodeHeight / 2 + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#a1a1aa')
        .attr('font-size', '10px')
        .text(name.length > 16 ? name.slice(0, 14) + '\u2026' : name);

      return { cp, x, y, name, entityType, color, side };
    });

    // Draw flow paths (curved)
    function drawFlowPath(sourceX, sourceY, targetX, targetY, usd, cp, flowDir) {
      const thickness = Math.max(1.5, (usd / maxUsd) * 8);
      const midX = (sourceX + targetX) / 2;
      const curvature = 0.5;

      const path = d3.path();
      path.moveTo(sourceX, sourceY);
      const cp1x = sourceX + (targetX - sourceX) * curvature;
      const cp2x = targetX - (targetX - sourceX) * curvature;
      path.bezierCurveTo(cp1x, sourceY, cp2x, targetY, targetX, targetY);

      const entityType = getEntityType(cp);
      const color = getColor(entityType);

      const flowPath = g.append('path')
        .attr('d', path.toString())
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', thickness)
        .attr('stroke-opacity', 0.3)
        .style('cursor', 'pointer');

      // Animate in
      const totalLength = flowPath.node().getTotalLength();
      flowPath
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

      // Hover
      flowPath
        .on('mouseenter', function (event) {
          d3.select(this)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', thickness + 2);

          tooltip
            .style('opacity', '1')
            .html(`
              <div style="font-weight:600;margin-bottom:4px;color:#f4f4f5">${getName(cp)}</div>
              <div style="color:#a1a1aa;font-size:11px">Volume: <span style="color:#e4e4e7">${fmtUsd(usd)}</span></div>
              <div style="color:#a1a1aa;font-size:11px">Direction: <span style="color:#e4e4e7">${flowDir}</span></div>
              <div style="color:#a1a1aa;font-size:11px">Txns: <span style="color:#e4e4e7">${cp.transactionCount || 0}</span></div>
            `);
        })
        .on('mousemove', function (event) {
          const containerRect = containerRef.current.getBoundingClientRect();
          tooltip
            .style('left', `${event.clientX - containerRect.left + 14}px`)
            .style('top', `${event.clientY - containerRect.top - 10}px`);
        })
        .on('mouseleave', function () {
          d3.select(this)
            .attr('stroke-opacity', 0.3)
            .attr('stroke-width', thickness);
          tooltip.style('opacity', '0');
        });
    }

    // Inflows: left -> center
    leftNodes.forEach(({ cp, x, y }) => {
      drawFlowPath(
        x + nodeWidth,
        y + nodeHeight / 2,
        centerX - centerNodeW / 2,
        innerH / 2,
        cp.usd || 0,
        cp,
        'Inflow to Ripple'
      );
    });

    // Outflows: center -> right
    rightNodes.forEach(({ cp, x, y }) => {
      drawFlowPath(
        centerX + centerNodeW / 2,
        innerH / 2,
        x,
        y + nodeHeight / 2,
        cp.usd || 0,
        cp,
        'Outflow from Ripple'
      );
    });

    // Bidirectional flows
    biNodesData.forEach(({ cp, x, y, side }) => {
      if (side === 'left') {
        // Draw path from node to center
        drawFlowPath(
          x + nodeWidth,
          y + nodeHeight / 2,
          centerX - centerNodeW / 2,
          innerH / 2,
          cp.usd || 0,
          cp,
          'Bidirectional'
        );
      } else {
        drawFlowPath(
          centerX + centerNodeW / 2,
          innerH / 2,
          x,
          y + nodeHeight / 2,
          cp.usd || 0,
          cp,
          'Bidirectional'
        );
      }
    });

    // Column labels
    if (inflows.length > 0) {
      g.append('text')
        .attr('x', colLeftX + nodeWidth / 2)
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#52525b')
        .attr('font-size', '9px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('letter-spacing', '0.05em')
        .text('INFLOWS');
    }
    if (outflows.length > 0) {
      g.append('text')
        .attr('x', colRightX + nodeWidth / 2)
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#52525b')
        .attr('font-size', '9px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('letter-spacing', '0.05em')
        .text('OUTFLOWS');
    }
    if (biflows.length > 0) {
      g.append('text')
        .attr('x', centerX)
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#52525b')
        .attr('font-size', '9px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('letter-spacing', '0.05em')
        .text('BIDIRECTIONAL');
    }
  }, [counterparties, dimensions]);

  const entries = counterparties?.ethereum || [];

  if (entries.length === 0) {
    return (
      <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md p-6">
        <div className="text-zinc-400 text-center py-12">No counterparty flow data available</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1d25]">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Flow Diagram</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5">Counterparty flows to and from Ripple</p>
        </div>
        <div className="flex gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-zinc-500 rounded" />
            solid = directional
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 border-t border-dashed border-zinc-500" />
            dashed = bidirectional
          </span>
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
          className="absolute z-50 bg-[#0f1117] border border-[#1a1d25] rounded-md px-3 py-2 shadow-xl font-mono"
          style={{
            opacity: 0,
            transition: 'opacity 0.15s',
            pointerEvents: 'none',
            fontSize: '11px',
            maxWidth: 220,
          }}
        />
      </div>
    </div>
  );
}
