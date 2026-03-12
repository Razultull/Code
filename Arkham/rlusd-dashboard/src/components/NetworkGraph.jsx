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

export default function NetworkGraph({ holders, counterparties }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const simulationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 350 });

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
    if (entries.length === 0 && (!holders || holders.length === 0)) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Build nodes: Ripple center + counterparties + top holders
    const nodeMap = new Map();
    const links = [];

    // Add Ripple as central node
    nodeMap.set('ripple', {
      id: 'ripple',
      name: 'Ripple',
      type: 'fund',
      radius: 24,
      isCenter: true,
    });

    // Add counterparty nodes and links
    const maxUsd = Math.max(1, ...entries.map((e) => e.usd || 0));
    entries.forEach((cp) => {
      const name = getName(cp);
      const id = cp.address?.address || name;
      const entityType = getEntityType(cp);

      if (!nodeMap.has(id)) {
        nodeMap.set(id, {
          id,
          name,
          type: entityType,
          radius: 6 + ((cp.usd || 0) / maxUsd) * 16,
          usd: cp.usd,
          txCount: cp.transactionCount,
          flow: cp.flow,
        });
      }

      links.push({
        source: cp.flow === 'in' ? id : 'ripple',
        target: cp.flow === 'in' ? 'ripple' : id,
        usd: cp.usd || 0,
        txCount: cp.transactionCount || 0,
        flow: cp.flow || 'all',
        thickness: 1 + ((cp.usd || 0) / maxUsd) * 6,
      });
    });

    // Add top holder nodes (that aren't already present)
    if (holders && holders.length > 0) {
      const maxBal = Math.max(1, ...holders.map((h) => h.balanceUsd));
      holders.slice(0, 10).forEach((h) => {
        if (!nodeMap.has(h.entityId)) {
          nodeMap.set(h.entityId, {
            id: h.entityId,
            name: h.entityName,
            type: h.entityType,
            radius: 6 + (h.balanceUsd / maxBal) * 14,
            usd: h.balanceUsd,
            isHolder: true,
          });
        }
      });
    }

    const nodes = Array.from(nodeMap.values());

    // Ensure link source/target exist
    const validLinks = links.filter(
      (l) => nodeMap.has(typeof l.source === 'string' ? l.source : l.source.id)
        && nodeMap.has(typeof l.target === 'string' ? l.target : l.target.id)
    );

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(-70))
      .force('link', d3.forceLink(validLinks).id((d) => d.id).distance(60))
      .force('collision', d3.forceCollide().radius((d) => d.radius + 8))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04));

    simulationRef.current = simulation;

    // Container group with zoom
    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Arrow marker
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#52525b');

    // Links
    const linkGroup = g.append('g').attr('class', 'links');
    const linkElements = linkGroup
      .selectAll('line')
      .data(validLinks)
      .enter()
      .append('line')
      .attr('stroke', '#3f3f46')
      .attr('stroke-width', (d) => d.thickness)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Node groups
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'grab')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    nodeElements.append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => getColor(d.type))
      .attr('fill-opacity', (d) => d.isCenter ? 0.9 : 0.7)
      .attr('stroke', (d) => getColor(d.type))
      .attr('stroke-width', (d) => d.isCenter ? 2 : 1)
      .attr('stroke-opacity', 1);

    nodeElements.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 12)
      .attr('fill', '#a1a1aa')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text((d) => {
        if (d.name.length > 14) return d.name.slice(0, 12) + '\u2026';
        return d.name;
      });

    // Tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Node hover
    nodeElements
      .on('mouseenter', function (event, d) {
        // Highlight connected links
        linkElements
          .attr('stroke-opacity', (l) => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return sourceId === d.id || targetId === d.id ? 1 : 0.1;
          })
          .attr('stroke', (l) => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return sourceId === d.id || targetId === d.id ? '#71717a' : '#3f3f46';
          });

        // Dim other nodes
        nodeElements.select('circle')
          .attr('fill-opacity', (n) => {
            if (n.id === d.id) return 1;
            const connected = validLinks.some((l) => {
              const sid = typeof l.source === 'object' ? l.source.id : l.source;
              const tid = typeof l.target === 'object' ? l.target.id : l.target;
              return (sid === d.id && tid === n.id) || (tid === d.id && sid === n.id);
            });
            return connected ? 0.7 : 0.15;
          });

        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', d.radius * 1.15);

        let html = `<div style="font-weight:600;margin-bottom:4px;color:#f4f4f5">${d.name}</div>`;
        html += `<div style="color:#a1a1aa;font-size:11px">Type: <span style="color:#e4e4e7">${(d.type || 'unknown').replace(/-/g, ' ')}</span></div>`;
        if (d.usd) html += `<div style="color:#a1a1aa;font-size:11px">Volume: <span style="color:#e4e4e7">${fmtUsd(d.usd)}</span></div>`;
        if (d.txCount) html += `<div style="color:#a1a1aa;font-size:11px">Txns: <span style="color:#e4e4e7">${d.txCount}</span></div>`;
        if (d.flow) html += `<div style="color:#a1a1aa;font-size:11px">Flow: <span style="color:#e4e4e7">${d.flow}</span></div>`;

        tooltip.style('opacity', '1').html(html);
      })
      .on('mousemove', function (event) {
        const containerRect = containerRef.current.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - containerRect.left + 14}px`)
          .style('top', `${event.clientY - containerRect.top - 10}px`);
      })
      .on('mouseleave', function (event, d) {
        linkElements
          .attr('stroke-opacity', 0.6)
          .attr('stroke', '#3f3f46');
        nodeElements.select('circle')
          .attr('fill-opacity', (n) => n.isCenter ? 0.9 : 0.7);

        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', d.radius);

        tooltip.style('opacity', '0');
      });

    // Link hover
    linkElements
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .attr('stroke', '#a1a1aa')
          .attr('stroke-opacity', 1);

        tooltip
          .style('opacity', '1')
          .html(`
            <div style="font-weight:600;margin-bottom:4px;color:#f4f4f5">Flow</div>
            <div style="color:#a1a1aa;font-size:11px">Volume: <span style="color:#e4e4e7">${fmtUsd(d.usd)}</span></div>
            <div style="color:#a1a1aa;font-size:11px">Transactions: <span style="color:#e4e4e7">${d.txCount}</span></div>
            <div style="color:#a1a1aa;font-size:11px">Direction: <span style="color:#e4e4e7">${d.flow}</span></div>
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
          .attr('stroke', '#3f3f46')
          .attr('stroke-opacity', 0.6);
        tooltip.style('opacity', '0');
      });

    // Tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [holders, counterparties, dimensions]);

  const entries = counterparties?.ethereum || [];
  const isEmpty = entries.length === 0 && (!holders || holders.length === 0);

  if (isEmpty) {
    return (
      <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md p-6">
        <div className="text-zinc-400 text-center py-12">No data available for network graph</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-[#1a1d25] rounded-md">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1d25]">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Entity Network</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5">Force-directed relationship graph</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-zinc-500">{type.replace(/-/g, ' ')}</span>
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
