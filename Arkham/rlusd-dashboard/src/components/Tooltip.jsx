import { useState, useRef, useCallback } from 'react';

export default function Tooltip({ content, children, className = '' }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);

  const show = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <span
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span
            className={[
              'block mb-1 bg-[#0f1117] text-zinc-200 text-[11px] font-mono rounded-md',
              'px-2 py-1.5 shadow-lg border border-[#1a1d25] whitespace-nowrap',
              'animate-[fadeIn_150ms_ease-out]',
            ].join(' ')}
          >
            {content}
          </span>
          {/* Arrow */}
          <span
            className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 w-0 h-0"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #1a1d25',
            }}
          />
        </span>
      )}
    </span>
  );
}
