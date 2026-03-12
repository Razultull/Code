import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { TYPE_COLORS, getColor, fmtUsd, fmtNum, shortenAddr, truncateLabel } from './utils';

const CHANGE_POS = '#22c55e';
const CHANGE_NEG = '#ef4444';
const CHANGE_NEUTRAL = '#52525b';
const BG_COLOR = '#0f1117';
const TRANSITION_MS = 600;

function changeColor(pct) {
  if (pct == null || isNaN(pct) || pct === 0) return CHANGE_NEUTRAL;
  const clamped = Math.max(-100, Math.min(100, pct));
  if (clamped > 0) {
    const t = Math.min(clamped / 50, 1);
    return d3.interpolateRgb(CHANGE_NEUTRAL, CHANGE_POS)(t);
  }
  const t = Math.min(Math.abs(clamped) / 50, 1);
  return d3.interpolateRgb(CHANGE_NEUTRAL, CHANGE_NEG)(t);
}

function metricValue(entity, sortBy) {
  if (sortBy === 'change') return Math.abs(entity.changePct || 0) + 0.01;
  if (sortBy === 'share') return (entity.share || 0) + 0.01;
  return (entity.balanceUsd || 0) + 0.01;
}

function matchesSearch(entity, term) {
  if (!term) return false;
  const lower = term.toLowerCase();
  return (
    (entity.name && entity.name.toLowerCase().includes(lower)) ||
    (entity.address && entity.address.toLowerCase().includes(lower)) ||
    (entity.id && String(entity.id).toLowerCase().includes(lower))
  );
}

function buildTooltipHtml(d) {
  const e = d.data;
  const typeColor = getColor(e.type);
  const typeLabel = (e.type || 'misc').replace(/-/g, ' ');
  const changePctStr =
    e.changePct != null && !isNaN(e.changePct)
      ? `${e.changePct >= 0 ? '+' : ''}${e.changePct.toFixed(1)}%`
      : '--';
  const changeClr = e.changePct > 0 ? CHANGE_POS : e.changePct < 0 ? CHANGE_NEG : '#94a3b8';

  let rows = `
    <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#f1f5f9">${e.name || 'Unknown'}</div>
    <div style="font-size:11px;margin-bottom:6px">
      <span style="color:${typeColor};font-weight:500;text-transform:capitalize">${typeLabel}</span>
      <span style="color:#64748b;margin-left:6px">${shortenAddr(e.address)}</span>
    </div>
    <table style="font-size:11px;border-collapse:collapse;width:100%">
      <tr><td style="color:#94a3b8;padding:1px 8px 1px 0">Balance</td><td style="color:#e2e8f0;text-align:right">${fmtUsd(e.balanceUsd)}</td></tr>
      <tr><td style="color:#94a3b8;padding:1px 8px 1px 0">Token Amt</td><td style="color:#e2e8f0;text-align:right">${fmtNum(e.balanceUnit)}</td></tr>
      <tr><td style="color:#94a3b8;padding:1px 8px 1px 0">Share</td><td style="color:#e2e8f0;text-align:right">${e.share != null ? e.share.toFixed(2) + '%' : '--'}</td></tr>
      <tr><td style="color:#94a3b8;padding:1px 8px 1px 0">Change</td><td style="color:${changeClr};text-align:right">${changePctStr}</td></tr>
      <tr><td style="color:#94a3b8;padding:1px 8px 1px 0">Rank</td><td style="color:#e2e8f0;text-align:right">${e.rank != null ? '#' + e.rank : '--'}</td></tr>`;

  if (e.volume) {
    rows += `<tr><td style="color:#94a3b8;padding:1px 8px 1px 0">Volume</td><td style="color:#e2e8f0;text-align:right">${fmtUsd(e.volume)}</td></tr>`;
  }
  if (e.txCount) {
    rows += `<tr><td style="color:#94a3b8;padding:1px 8px 1px 0">Txns</td><td style="color:#e2e8f0;text-align:right">${fmtNum(e.txCount)}</td></tr>`;
  }

  rows += '</table>';
  return rows;
}

export default function DistributionView({
  entities,
  dimensions,
  totalHeld,
  filters,
  colorMode,
  sortBy,
  onEntitySelect,
}) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const filtered = useMemo(() => {
    if (!entities || entities.length === 0) return [];
    return entities.filter((e) => {
      if (e.balanceUsd <= 0 && sortBy === 'balance') return false;
      if (filters.types && filters.types.size > 0 && !filters.types.has(e.type)) return false;
      if (filters.minBalance != null && e.balanceUsd < filters.minBalance) return false;
      if (
        filters.flowDirection &&
        filters.flowDirection !== 'all' &&
        e.flow &&
        e.flow !== filters.flowDirection
      )
        return false;
      if (filters.searchTerm) {
        // Keep all, but search-matched ones get highlighted — don't filter out
      }
      return true;
    });
  }, [entities, filters, sortBy]);

  const searchMatched = useMemo(() => {
    if (!filters.searchTerm) return new Set();
    return new Set(
      filtered.filter((e) => matchesSearch(e, filters.searchTerm)).map((e) => e.id)
    );
  }, [filtered, filters.searchTerm]);

  useEffect(() => {
    if (!svgRef.current || !dimensions.width || !dimensions.height) return;
    if (filtered.length === 0) {
      d3.select(svgRef.current).selectAll('*').remove();
      d3.select(svgRef.current)
        .append('text')
        .attr('x', dimensions.width / 2)
        .attr('y', dimensions.height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', 14)
        .text('No entities match current filters');
      return;
    }

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    // Build hierarchy
    const hierarchy = d3
      .hierarchy({ children: filtered })
      .sum((d) => (d.children ? 0 : metricValue(d, sortBy)))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const pack = d3
      .pack()
      .size([width, height])
      .padding(3);

    const root = pack(hierarchy);
    const leaves = root.leaves();

    // Node groups
    const groups = svg
      .selectAll('g.bubble')
      .data(leaves, (d) => d.data.id);

    // EXIT
    groups
      .exit()
      .transition()
      .duration(TRANSITION_MS)
      .attr('transform', (d) => `translate(${width / 2},${height / 2})`)
      .style('opacity', 0)
      .remove();

    // ENTER
    const enter = groups
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    enter.append('circle').attr('class', 'bubble-circle');
    enter.append('text').attr('class', 'bubble-label');
    enter.append('text').attr('class', 'bubble-amount');

    // MERGE (enter + update)
    const merged = enter.merge(groups);

    merged
      .transition()
      .duration(TRANSITION_MS)
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('opacity', 1);

    // Circles
    merged
      .select('circle.bubble-circle')
      .transition()
      .duration(TRANSITION_MS)
      .attr('r', (d) => d.r)
      .attr('fill', (d) =>
        colorMode === 'change' ? changeColor(d.data.changePct) : getColor(d.data.type)
      )
      .attr('fill-opacity', 0.75)
      .attr('stroke', (d) =>
        searchMatched.has(d.data.id) ? '#fbbf24' : 'rgba(255,255,255,0.08)'
      )
      .attr('stroke-width', (d) => (searchMatched.has(d.data.id) ? 2.5 : 1));

    // Glow filter for search matches
    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');
    if (defs.select('#glow').empty()) {
      const filter = defs.append('filter').attr('id', 'glow');
      filter
        .append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'blur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'blur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    merged
      .select('circle.bubble-circle')
      .attr('filter', (d) => (searchMatched.has(d.data.id) ? 'url(#glow)' : null));

    // Labels (name) — only when radius > 20
    merged
      .select('text.bubble-label')
      .transition()
      .duration(TRANSITION_MS)
      .attr('y', (d) => (d.r > 30 ? -4 : 0))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#e2e8f0')
      .attr('font-size', (d) => Math.max(9, Math.min(13, d.r / 3.5)))
      .attr('pointer-events', 'none')
      .style('opacity', (d) => (d.r > 20 ? 1 : 0))
      .text((d) => {
        if (d.r <= 20) return '';
        const maxChars = Math.max(3, Math.floor(d.r / 5));
        return truncateLabel(d.data.name, maxChars);
      });

    // Amount labels — only when radius > 30
    merged
      .select('text.bubble-amount')
      .transition()
      .duration(TRANSITION_MS)
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#94a3b8')
      .attr('font-size', (d) => Math.max(8, Math.min(11, d.r / 4)))
      .attr('pointer-events', 'none')
      .style('opacity', (d) => (d.r > 30 ? 1 : 0))
      .text((d) => (d.r > 30 ? fmtUsd(d.data.balanceUsd) : ''));

    // Interactions (re-bindmouse events on merged selection, not transition)
    merged
      .on('mouseover', function (event, d) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(150)
          .attr('fill-opacity', 0.95)
          .attr('stroke', '#fbbf24')
          .attr('stroke-width', 2);

        tooltip
          .style('opacity', 1)
          .html(buildTooltipHtml(d));
      })
      .on('mousemove', function (event) {
        const svgRect = svgRef.current.getBoundingClientRect();
        let left = event.clientX - svgRect.left + 14;
        let top = event.clientY - svgRect.top - 10;
        // Keep tooltip in bounds
        if (left + 200 > width) left = left - 220;
        if (top + 160 > height) top = top - 170;
        tooltip.style('left', left + 'px').style('top', top + 'px');
      })
      .on('mouseout', function (event, d) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('fill-opacity', 0.75)
          .attr('stroke', searchMatched.has(d.data.id) ? '#fbbf24' : 'rgba(255,255,255,0.08)')
          .attr('stroke-width', searchMatched.has(d.data.id) ? 2.5 : 1);

        tooltip.style('opacity', 0);
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        if (onEntitySelect) onEntitySelect(d.data);
      });
  }, [filtered, dimensions, colorMode, sortBy, searchMatched, onEntitySelect]);

  return (
    <div style={{ position: 'relative', width: '100%', height: dimensions.height }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ background: 'transparent', display: 'block' }}
      />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: 'none',
          background: '#1e2030',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '10px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: 180,
          maxWidth: 240,
          zIndex: 50,
          transition: 'opacity 0.15s ease',
        }}
      />
    </div>
  );
}
