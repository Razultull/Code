import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TYPE_COLORS,
  DEFAULT_COLOR,
  getColor,
  fmtUsd,
  fmtNum,
  shortenAddr,
  truncateLabel,
  FLOW_STYLES,
} from './utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RIPPLE_ID = 'ripple';
const MIN_RADIUS = 6;
const MAX_RADIUS = 32;
const RIPPLE_RADIUS = 28;

function nodeRadius(entity, sizeBy, maxVal) {
  if (entity.id === RIPPLE_ID) return RIPPLE_RADIUS;
  const raw =
    sizeBy === 'volume' ? entity.volume :
    sizeBy === 'txCount' ? entity.txCount :
    entity.balanceUsd;
  if (!raw || !maxVal) return MIN_RADIUS;
  return MIN_RADIUS + (Math.sqrt(raw) / Math.sqrt(maxVal)) * (MAX_RADIUS - MIN_RADIUS);
}

function linkId(l) {
  const s = typeof l.source === 'object' ? l.source.id : l.source;
  const t = typeof l.target === 'object' ? l.target.id : l.target;
  return `${s}->${t}`;
}

function isConnected(link, nodeId) {
  const s = typeof link.source === 'object' ? link.source.id : link.source;
  const t = typeof link.target === 'object' ? link.target.id : link.target;
  return s === nodeId || t === nodeId;
}

function buildNodeTooltip(d) {
  const badge = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${getColor(d.type)};margin-right:4px;vertical-align:middle"></span>`;
  const typeName = (d.type || 'unknown').replace(/-/g, ' ');
  const addr = d.address ? `<div style="color:#71717a;font-size:10px;margin-bottom:4px;font-family:monospace">${shortenAddr(d.address)}</div>` : '';

  const rows = [];
  if (d.balanceUsd != null) rows.push(['Balance', fmtUsd(d.balanceUsd)]);
  if (d.share != null) rows.push(['Share', `${d.share.toFixed(2)}%`]);
  if (d.changePct != null) {
    const color = d.changePct >= 0 ? '#22c55e' : '#ef4444';
    const sign = d.changePct >= 0 ? '+' : '';
    rows.push(['Change', `<span style="color:${color}">${sign}${d.changePct.toFixed(1)}%</span>`]);
  }
  if (d.volume != null) rows.push(['Volume', fmtUsd(d.volume)]);
  if (d.txCount != null) rows.push(['Txns', fmtNum(d.txCount)]);
  if (d.flow) rows.push(['Flow', `<span style="color:${FLOW_STYLES[d.flow]?.color || '#a1a1aa'}">${d.flow}</span>`]);

  const rowsHtml = rows.map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#71717a">${k}</span><span style="color:#e4e4e7">${v}</span></div>`
  ).join('');

  return `
    <div style="font-weight:600;color:#f4f4f5;margin-bottom:2px">${d.name}</div>
    <div style="margin-bottom:4px">${badge}<span style="color:#a1a1aa;font-size:11px">${typeName}</span></div>
    ${addr}
    ${rowsHtml}
  `;
}

function buildLinkTooltip(d) {
  const rows = [];
  if (d.usd != null) rows.push(['Volume', fmtUsd(d.usd)]);
  if (d.txCount != null) rows.push(['Txns', fmtNum(d.txCount)]);
  if (d.flow) rows.push(['Flow', `<span style="color:${FLOW_STYLES[d.flow]?.color || '#a1a1aa'}">${d.flow}</span>`]);

  return `
    <div style="font-weight:600;color:#f4f4f5;margin-bottom:4px">Transfer</div>
    ${rows.map(([k, v]) =>
      `<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#71717a">${k}</span><span style="color:#e4e4e7">${v}</span></div>`
    ).join('')}
  `;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NetworkView({ entities, links, dimensions, filters, onEntitySelect }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const simulationRef = useRef(null);

  // -- Derived data --------------------------------------------------------

  const { filteredNodes, filteredLinks, searchSet, maxMetric } = useMemo(() => {
    if (!entities?.length) return { filteredNodes: [], filteredLinks: [], searchSet: new Set(), maxMetric: 1 };

    const types = filters?.types;
    const flowDir = filters?.flowDirection || 'all';
    const minBal = filters?.minBalance ?? 0;
    const search = (filters?.searchTerm || '').toLowerCase().trim();
    const sizeBy = filters?.sizeBy || 'balance';

    // Filter entities
    const kept = entities.filter((e) => {
      if (e.id === RIPPLE_ID) return true; // always keep Ripple
      if (types && types.size > 0 && !types.has(e.type)) return false;
      if ((e.balanceUsd ?? 0) < minBal) return false;
      if (flowDir !== 'all' && e.flow && e.flow !== flowDir) return false;
      return true;
    });

    const keptIds = new Set(kept.map((e) => e.id));

    // Filter links
    const keptLinks = (links || []).filter((l) => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      if (!keptIds.has(sid) || !keptIds.has(tid)) return false;
      if (flowDir !== 'all' && l.flow && l.flow !== flowDir) return false;
      return true;
    });

    // Search highlights
    const sSet = new Set();
    if (search) {
      kept.forEach((e) => {
        const haystack = `${e.name} ${e.address || ''} ${e.type || ''}`.toLowerCase();
        if (haystack.includes(search)) sSet.add(e.id);
      });
    }

    // Max metric for sizing
    const metricVals = kept.map((e) => {
      if (sizeBy === 'volume') return e.volume || 0;
      if (sizeBy === 'txCount') return e.txCount || 0;
      return e.balanceUsd || 0;
    });
    const mx = Math.max(1, ...metricVals);

    return { filteredNodes: kept, filteredLinks: keptLinks, searchSet: sSet, maxMetric: mx };
  }, [entities, links, filters]);

  // -- D3 rendering --------------------------------------------------------

  useEffect(() => {
    if (!filteredNodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const sizeBy = filters?.sizeBy || 'balance';

    // Deep-copy nodes so D3 can mutate x/y
    const nodes = filteredNodes.map((e) => ({
      ...e,
      radius: nodeRadius(e, sizeBy, maxMetric),
    }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Deep-copy links (D3 replaces source/target with object refs)
    const simLinks = filteredLinks
      .filter((l) => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source;
        const tid = typeof l.target === 'object' ? l.target.id : l.target;
        return nodeMap.has(sid) && nodeMap.has(tid);
      })
      .map((l) => ({ ...l }));

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength((d) => d.id === RIPPLE_ID ? -300 : -80))
      .force('link', d3.forceLink(simLinks).id((d) => d.id).distance(70))
      .force('collision', d3.forceCollide().radius((d) => d.radius + 6))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03));

    simulationRef.current = simulation;

    // Container group with zoom
    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Defs -- arrow markers per flow
    const defs = svg.append('defs');
    ['in', 'out', 'all'].forEach((flow) => {
      const style = FLOW_STYLES[flow] || FLOW_STYLES.all || {};
      defs.append('marker')
        .attr('id', `arrow-${flow}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', style.color || '#52525b');
    });

    // Search-glow filter
    const glowFilter = defs.append('filter').attr('id', 'search-glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    glowFilter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // Links
    const linkGroup = g.append('g').attr('class', 'links');
    const linkEls = linkGroup.selectAll('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const style = FLOW_STYLES[d.flow] || {};
        return style.color || '#3f3f46';
      })
      .attr('stroke-width', (d) => d.thickness || 1.5)
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', (d) => `url(#arrow-${d.flow || 'all'})`);

    // Node groups
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeEls = nodeGroup.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
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

    // Search pulse ring (behind main circle)
    nodeEls.filter((d) => searchSet.has(d.id))
      .append('circle')
      .attr('class', 'pulse-ring')
      .attr('r', (d) => d.radius + 4)
      .attr('fill', 'none')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8)
      .attr('filter', 'url(#search-glow)');

    // Main circle
    nodeEls.append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => getColor(d.type))
      .attr('fill-opacity', (d) => d.id === RIPPLE_ID ? 0.95 : 0.7)
      .attr('stroke', (d) => getColor(d.type))
      .attr('stroke-width', (d) => d.id === RIPPLE_ID ? 2.5 : 1.2)
      .attr('stroke-opacity', 0.9);

    // Labels
    nodeEls.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 13)
      .attr('fill', '#a1a1aa')
      .attr('font-size', (d) => d.id === RIPPLE_ID ? '11px' : '9.5px')
      .attr('font-weight', (d) => d.id === RIPPLE_ID ? '600' : '400')
      .attr('pointer-events', 'none')
      .text((d) => truncateLabel(d.name, 14));

    // Animate pulse rings
    function animatePulse() {
      svg.selectAll('.pulse-ring')
        .transition()
        .duration(1200)
        .attr('stroke-opacity', 0.15)
        .attr('r', (d) => d.radius + 10)
        .transition()
        .duration(1200)
        .attr('stroke-opacity', 0.8)
        .attr('r', (d) => d.radius + 4)
        .on('end', animatePulse);
    }
    if (searchSet.size > 0) animatePulse();

    // Tooltip ref
    const tooltip = d3.select(tooltipRef.current);

    // -- Hover interactions ------------------------------------------------

    nodeEls
      .on('mouseenter', function (_event, d) {
        // Highlight connected links, dim others
        linkEls
          .attr('stroke-opacity', (l) => isConnected(l, d.id) ? 0.9 : 0.08)
          .attr('stroke-width', (l) => isConnected(l, d.id) ? (l.thickness || 1.5) * 1.4 : (l.thickness || 1.5));

        // Dim unconnected nodes
        const connectedIds = new Set([d.id]);
        simLinks.forEach((l) => {
          if (isConnected(l, d.id)) {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            connectedIds.add(s);
            connectedIds.add(t);
          }
        });

        nodeEls.select('circle:not(.pulse-ring)')
          .attr('fill-opacity', (n) => connectedIds.has(n.id) ? 0.9 : 0.12);
        nodeEls.select('text')
          .attr('fill-opacity', (n) => connectedIds.has(n.id) ? 1 : 0.2);

        d3.select(this).select('circle:not(.pulse-ring)')
          .transition().duration(120)
          .attr('r', d.radius * 1.18);

        tooltip.style('opacity', '1').html(buildNodeTooltip(d));
      })
      .on('mousemove', function (event) {
        const rect = containerRef.current.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 14}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function (_event, d) {
        linkEls
          .attr('stroke-opacity', 0.5)
          .attr('stroke-width', (l) => l.thickness || 1.5);

        nodeEls.select('circle:not(.pulse-ring)')
          .attr('fill-opacity', (n) => n.id === RIPPLE_ID ? 0.95 : 0.7);
        nodeEls.select('text').attr('fill-opacity', 1);

        d3.select(this).select('circle:not(.pulse-ring)')
          .transition().duration(120)
          .attr('r', d.radius);

        tooltip.style('opacity', '0');
      })
      .on('click', function (_event, d) {
        if (onEntitySelect) onEntitySelect(d);
      });

    // Link hover
    linkEls
      .on('mouseenter', function (_event, d) {
        d3.select(this).attr('stroke-opacity', 1).attr('stroke', '#a1a1aa');
        tooltip.style('opacity', '1').html(buildLinkTooltip(d));
      })
      .on('mousemove', function (event) {
        const rect = containerRef.current.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 14}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function (_event, d) {
        const style = FLOW_STYLES[d.flow] || {};
        d3.select(this)
          .attr('stroke', style.color || '#3f3f46')
          .attr('stroke-opacity', 0.5);
        tooltip.style('opacity', '0');
      });

    // Tick
    simulation.on('tick', () => {
      linkEls
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      nodeEls.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [filteredNodes, filteredLinks, searchSet, maxMetric, dimensions, filters?.sizeBy]);

  // -- Render --------------------------------------------------------------

  if (!filteredNodes.length) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center"
        style={{ width: dimensions.width, height: dimensions.height, background: '#0f1117' }}
      >
        <span className="text-zinc-600 text-sm">No entities match current filters</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ width: '100%', height: dimensions.height }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{ display: 'block', width: '100%', height: '100%', background: 'transparent' }}
      />
      <div
        ref={tooltipRef}
        className="absolute z-50"
        style={{
          opacity: 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none',
          background: '#0f1117',
          border: '1px solid #1a1d25',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          maxWidth: 260,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}
