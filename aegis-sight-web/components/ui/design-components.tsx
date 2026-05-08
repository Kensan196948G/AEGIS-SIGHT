'use client';

import React, { useState } from 'react';

/* ─── Badge ─── */
export function Badge({
  children,
  variant = 'default',
  dot = false,
  size = 'md',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  dot?: boolean;
  size?: 'md' | 'sm';
}) {
  const variants = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    purple: 'badge-purple',
  };
  return (
    <span className={`badge ${variants[variant] || variants.default} ${size === 'sm' ? 'badge-sm' : ''}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

/* ─── StatCard ─── */
export function StatCard({
  title,
  value,
  trend,
  icon,
  iconBg,
  accentColor,
}: {
  title: string;
  value: string | number;
  trend?: number;
  icon?: React.ReactNode;
  iconBg?: string;
  accentColor?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-content">
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
        {trend !== undefined && (
          <div className="stat-trend">
            <span className={`stat-trend-value ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
            <span className="stat-trend-label">前月比</span>
          </div>
        )}
      </div>
      {icon && (
        <div className="stat-icon" style={{ background: iconBg || '#eff6ff', color: accentColor || '#2563eb' }}>
          {icon}
        </div>
      )}
    </div>
  );
}

/* ─── DonutChart ─── */
export function DonutChart({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  color = '#2563eb',
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <span style={{ fontSize: size * 0.18, fontWeight: 700, color: '#111827' }}>
          {label || `${Math.round(pct)}%`}
        </span>
      </div>
    </div>
  );
}

/* ─── MiniBarChart ─── */
export function MiniBarChart({
  data,
  maxValue,
  height = 160,
  showValues = true,
}: {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
}) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
      {data.map((item, i) => {
        const barH = (item.value / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {showValues && <span className="chart-bar-value">{item.value.toLocaleString()}</span>}
            <div style={{ position: 'relative', width: '100%', height: height - 44 }}>
              <div
                className="chart-bar"
                style={{
                  position: 'absolute', bottom: 0, width: '100%', borderRadius: '6px 6px 0 0',
                  height: `${barH}%`, minHeight: item.value > 0 ? 4 : 0,
                  background: item.color || '#3b82f6',
                }}
              />
            </div>
            <span className="chart-bar-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── ProgressBar ─── */
export function ProgressBar({
  value,
  max = 100,
  color,
  label,
  size = 'sm',
}: {
  value: number;
  max?: number;
  color?: string;
  label?: false | string;
  size?: 'sm' | 'md';
}) {
  const pct = Math.round((value / max) * 100);
  let barColor = color;
  if (!barColor) {
    barColor = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981';
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className={`progress-track ${size === 'md' ? 'progress-md' : ''}`}>
        <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
      {label !== false && <span className="progress-label">{pct}%</span>}
    </div>
  );
}

/* ─── SearchInput ─── */
export function SearchInput({
  placeholder,
  value,
  onChange,
  style,
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="search-input-wrap" style={style}>
      <svg className="search-input-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
      </svg>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder || '検索...'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L7 5.586l1.293-1.293a1 1 0 111.414 1.414L8.414 7l1.293 1.293a1 1 0 01-1.414 1.414L7 8.414l-1.293 1.293a1 1 0 01-1.414-1.414L5.586 7 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ─── Select ─── */
export function Select({
  value,
  onChange,
  options,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}) {
  return (
    <select className="aegis-select" value={value} onChange={e => onChange(e.target.value)} style={style}>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ─── Modal ─── */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${wide ? 'modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ─── Tabs ─── */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs-row">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${active === t.id ? 'tab-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── Tooltip ─── */
export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

/* ─── Sparkline ─── */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#3b82f6',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

/* ─── AlertItem ─── */
export function AlertItem({
  severity,
  title,
  message,
  source,
  time,
}: {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  time: string;
}) {
  const config = {
    critical: { border: '#ef4444', bg: '#fef2f2', badge: 'danger' as const, label: '重大' },
    warning: { border: '#f59e0b', bg: '#fffbeb', badge: 'warning' as const, label: '警告' },
    info: { border: '#3b82f6', bg: '#eff6ff', badge: 'info' as const, label: '情報' },
  };
  const c = config[severity] || config.info;
  return (
    <div className="alert-item" style={{ borderLeftColor: c.border, background: c.bg }}>
      <div className="alert-item-top">
        <Badge variant={c.badge} dot size="sm">{c.label}</Badge>
        <span className="alert-title">{title}</span>
      </div>
      <p className="alert-message">{message}</p>
      <div className="alert-meta">
        <span>{source}</span>
        <span>·</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
