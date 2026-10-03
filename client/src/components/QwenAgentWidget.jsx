import React, { useState } from 'react';

export default function QwenAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            cursor: 'pointer',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 10px 28px rgba(59, 130, 246, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
          }}
          title="Chat with Qwen3.8 Vision Reasoning Agent"
        >
          🧠
        </button>
      )}

      {/* Slide-out Agent Window */}
      {isOpen && (
        <div style={{
          width: '420px',
          height: '620px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: '#0B0F19',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🧠</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#F9FAFB' }}>Qwen3.8 Copilot</div>
                <div style={{ fontSize: '0.68rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                  Vision & Reasoning Agent Online
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a 
                href="https://hardcore2099-qwen3-8-27b-demo.static.hf.space" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}
                title="Open in new tab"
              >
                ↗ Fullscreen
              </a>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Embedded Qwen3.8 Space */}
          <iframe
            src="https://hardcore2099-qwen3-8-27b-demo.static.hf.space"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Qwen3.8 Agent Playground"
          />
        </div>
      )}
    </div>
  );
}
