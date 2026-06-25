'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { api } from '../lib/matrix_api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AgentState {
  id: string;
  label: string;
  short: string;
  color: string;
  status: 'idle' | 'active' | 'complete' | 'error';
  findings: number;
  // Layout (set after canvas sizes)
  x: number;
  y: number;
  tx: number; // target x
  ty: number; // target y
  pulse: number; // animation phase
}

interface Packet {
  id: string;
  agentId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number; // 0→1
  speed: number;
  color: string;
  dir: 'attack' | 'response';
  alpha: number;
}

interface FloatLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  severity: string;
  alpha: number;
  dy: number;
  life: number;
}

interface AttackEvent {
  type: string;
  agent: string;
  scan_id?: number;
  timestamp?: string;
  vulnerabilities_found?: number;
  title?: string;
  severity?: string;
  url?: string;
  vulnerability_type?: string;
  error?: string;
  endpoints?: number;
  status?: string;
}

interface LiveAttackMapProps {
  scanId: number | null;
  isScanning: boolean;
  targetUrl: string;
  findings?: { vulnerability_type: string; severity: string }[];
  onEventReceived?: (event: AttackEvent) => void;
  agentStatuses?: { name: string; status: 'pending' | 'active' | 'completed'; findings: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_DEFS: { id: string; label: string; short: string; color: string }[] = [
  { id: 'sql_injection',     label: 'SQL Injection',   short: 'SQLi', color: '#dc2626' },
  { id: 'xss',               label: 'XSS Detection',   short: 'XSS',  color: '#ea580c' },
  { id: 'csrf',              label: 'CSRF Analysis',   short: 'CSRF', color: '#ca8a04' },
  { id: 'ssrf',              label: 'SSRF Scanner',    short: 'SSRF', color: '#7c3aed' },
  { id: 'authentication',    label: 'Auth Testing',    short: 'Auth', color: '#1d4ed8' },
  { id: 'api_security',      label: 'API Security',    short: 'API',  color: '#0891b2' },
  { id: 'command_injection', label: 'Cmd Injection',   short: 'CMDi', color: '#be185d' },
  { id: 'security_headers',  label: 'Sec Headers',     short: 'HDR',  color: '#15803d' },
];

const SEV_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#ca8a04',
  low:      '#6b7280',
  info:     '#3b82f6',
};

function uid() { return Math.random().toString(36).slice(2, 8); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function LiveAttackMap({
  scanId,
  isScanning,
  targetUrl,
  findings = [],
  onEventReceived,
  agentStatuses,
}: LiveAttackMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const esRef     = useRef<EventSource | null>(null);
  const scanIdRef = useRef<number | null>(null); // prevents stale closure reconnects

  // All animation state lives in refs — no re-renders during animation
  const agentsRef  = useRef<AgentState[]>([]);
  const packetsRef = useRef<Packet[]>([]);
  const floatsRef  = useRef<FloatLabel[]>([]);
  const cxRef      = useRef(0);
  const cyRef      = useRef(0);
  const activeRef  = useRef(false);
  const lastPktRef = useRef<Record<string, number>>({});

  // React state only for the sidebar log + stats badge
  const [log, setLog] = useState<{ color: string; text: string }[]>([]);
  const [totalVulns, setTotalVulns] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  // Sync findings count to totalVulns when it changes
  useEffect(() => {
    if (findings) {
      setTotalVulns(findings.length);
    }
  }, [findings]);

  // Helper function to sync agent statuses from prop to the ref
  const syncAgentStatuses = useCallback(() => {
    if (agentStatuses && agentStatuses.length > 0 && agentsRef.current.length > 0) {
      agentsRef.current.forEach(a => {
        const match = agentStatuses.find(as => 
          as.name.toLowerCase().replace(/[^a-z]/g, '') === a.label.toLowerCase().replace(/[^a-z]/g, '') ||
          as.name.toLowerCase().includes(a.short.toLowerCase())
        );
        if (match) {
          if (match.status === 'pending') {
            a.status = 'idle';
          } else if (match.status === 'active') {
            a.status = 'active';
          } else if (match.status === 'completed') {
            a.status = 'complete';
          }
          a.findings = match.findings;
        }
      });
      setActiveCount(agentsRef.current.filter(a => a.status === 'active').length);
    }
  }, [agentStatuses]);

  // Sync agent statuses from prop if provided
  useEffect(() => {
    syncAgentStatuses();
  }, [agentStatuses, syncAgentStatuses]);


  // ── Build layout once the canvas has real dimensions ──────────────────────
  const buildLayout = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    cxRef.current = cx;
    cyRef.current = cy;

    const count = AGENT_DEFS.length;
    const r = Math.min(w, h) * 0.36;

    agentsRef.current = AGENT_DEFS.map((def, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const tx = cx + Math.cos(angle) * r;
      const ty = cy + Math.sin(angle) * r;
      // start agents near their target (already laid out), don't start at center
      return {
        id: def.id,
        label: def.label,
        short: def.short,
        color: def.color,
        status: 'idle',
        findings: 0,
        x: tx,
        y: ty,
        tx,
        ty,
        pulse: Math.random() * Math.PI * 2,
      };
    });

    // Make sure we immediately sync any existing statuses
    syncAgentStatuses();
  }, [syncAgentStatuses]);

  // ── Spawn a packet between agent and target ────────────────────────────────
  const spawnPacket = useCallback((agentId: string, dir: 'attack' | 'response') => {
    const agent = agentsRef.current.find(a => a.id === agentId);
    if (!agent) return;
    const cx = cxRef.current;
    const cy = cyRef.current;
    const now = Date.now();
    const key = agentId + dir;
    const minInterval = dir === 'attack' ? 350 : 600;
    if (now - (lastPktRef.current[key] || 0) < minInterval) return;
    lastPktRef.current[key] = now;

    packetsRef.current.push({
      id: uid(),
      agentId,
      fromX: dir === 'attack' ? agent.x : cx,
      fromY: dir === 'attack' ? agent.y : cy,
      toX:   dir === 'attack' ? cx : agent.x,
      toY:   dir === 'attack' ? cy : agent.y,
      t: 0,
      speed: 0.014 + Math.random() * 0.008,
      color: dir === 'attack' ? agent.color : '#22c55e',
      dir,
      alpha: 1,
    });
  }, []);

  // ── Push to log (stable ref version) ──────────────────────────────────────
  const pushLog = useCallback((text: string, color: string) => {
    setLog(prev => [{ color, text }, ...prev].slice(0, 20));
  }, []);

  // ── Handle SSE event ───────────────────────────────────────────────────────
  const handleEvent = useCallback((ev: AttackEvent) => {
    if (onEventReceived) onEventReceived(ev);
    const agent = agentsRef.current.find(a => a.id === ev.agent);

    switch (ev.type) {
      case 'connected':
        pushLog('🔗 Connected to scanner', '#22c55e');
        break;

      case 'agent_start':
        if (agent) {
          agent.status = 'active';
          setActiveCount(agentsRef.current.filter(a => a.status === 'active').length);
          pushLog(`⚡ ${agent.label} — scanning`, agent.color);
          for (let i = 0; i < 4; i++) setTimeout(() => spawnPacket(agent.id, 'attack'), i * 80);
        }
        break;

      case 'agent_complete':
        if (agent) {
          agent.status = 'complete';
          setActiveCount(agentsRef.current.filter(a => a.status === 'active').length);
          const n = ev.vulnerabilities_found ?? 0;
          pushLog(`✓ ${agent.label} — ${n > 0 ? `${n} finding${n > 1 ? 's' : ''}` : 'no findings'}`, '#22c55e');
          for (let i = 0; i < 2; i++) setTimeout(() => spawnPacket(agent.id, 'response'), i * 100);
        }
        break;

      case 'agent_error':
        if (agent) {
          agent.status = 'error';
          pushLog(`✗ ${agent.label} — error`, '#ef4444');
        }
        break;

      case 'vulnerability_found':
        if (agent) {
          agent.findings++;
          setTotalVulns(v => v + 1);
          // Floating alert near target
          const sev = ev.severity?.toLowerCase() ?? 'medium';
          floatsRef.current.push({
            id: uid(),
            x: cxRef.current + (Math.random() - 0.5) * 50,
            y: cyRef.current - 30,
            text: ev.title?.slice(0, 24) ?? ev.vulnerability_type ?? 'Vulnerability',
            severity: sev,
            alpha: 1,
            dy: -0.8,
            life: 200,
          });
          // Burst packets
          for (let i = 0; i < 6; i++) setTimeout(() => spawnPacket(agent.id, 'attack'), i * 50);
          pushLog(`🔴 ${ev.title ?? ev.vulnerability_type} [${sev.toUpperCase()}]`, SEV_COLORS[sev] ?? '#dc2626');
        }
        break;

      case 'scan_complete':
        activeRef.current = false;
        setActiveCount(0);
        pushLog(`🏁 Scan complete`, '#6366f1');
        esRef.current?.close();
        break;
    }
  }, [pushLog, spawnPacket, onEventReceived]);

  // ── SSE connection ─────────────────────────────────────────────────────────
  const connectSSE = useCallback((sid: number) => {
    if (scanIdRef.current === sid && esRef.current && (esRef.current.readyState === EventSource.OPEN || esRef.current.readyState === EventSource.CONNECTING)) return;
    esRef.current?.close();
    scanIdRef.current = sid;

    let errorCount = 0;
    const MAX_SSE_ERRORS = 10; // tolerate uvicorn --reload restarts

    const token = api.getAccessToken();
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const baseUrl = isLocalhost ? 'http://localhost:8000' : '';
    const url = token 
      ? `${baseUrl}/api/scans/${sid}/live-events/?token=${encodeURIComponent(token)}` 
      : `${baseUrl}/api/scans/${sid}/live-events/`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (e) => {
      errorCount = 0; // reset on success
      try { handleEvent(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    es.onerror = () => {
      errorCount++;
      if (errorCount >= MAX_SSE_ERRORS) {
        // Backend is down or scan ended — stop reconnecting
        es.close();
        esRef.current = null;
        pushLog('⚠ Live events disconnected (backend unavailable)', '#f59e0b');
      }
    };
  }, [handleEvent, pushLog]);

  // ── Canvas draw loop ───────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(draw); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }

    const W = canvas.width;
    const H = canvas.height;
    const cx = cxRef.current || W / 2;
    const cy = cyRef.current || H / 2;
    const agents = agentsRef.current;

    // ─ Background (light) ─
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid
    ctx.fillStyle = 'rgba(148,163,184,0.35)'; // slate-400
    for (let x = 0; x < W; x += 24) {
      for (let y = 0; y < H; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ─ Animate agent pulses ─
    agents.forEach(a => { a.pulse += 0.03; });

    // ─ Connection lines ─
    agents.forEach(a => {
      if (a.status === 'idle') return;
      ctx.save();
      ctx.setLineDash(a.status === 'active' ? [6, 4] : [2, 8]);
      ctx.lineWidth = a.status === 'active' ? 1.5 : 1;
      ctx.strokeStyle = a.status === 'active'
        ? `${a.color}70`
        : a.status === 'complete' ? `${a.color}40` : '#ef444440';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.restore();
    });

    // ─ Packets ─
    packetsRef.current = packetsRef.current.filter(p => {
      p.t = Math.min(1, p.t + p.speed);
      if (p.t > 0.85) p.alpha = Math.max(0, p.alpha - 0.07);

      const x = lerp(p.fromX, p.toX, p.t);
      const y = lerp(p.fromY, p.toY, p.t);

      // Glow
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 8);
      grd.addColorStop(0, p.color + Math.round(p.alpha * 0xff).toString(16).padStart(2, '0'));
      grd.addColorStop(1, p.color + '00');
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      return p.t < 1 && p.alpha > 0.02;
    });

    // ─ Target node ─
    const tR = 30;
    // Danger ring when active
    if (activeRef.current) {
      const ringA = 0.15 + Math.sin(agents[0]?.pulse ?? 0) * 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, tR + 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239,68,68,${ringA})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }
    // Target fill
    ctx.beginPath();
    ctx.arc(cx, cy, tR, 0, Math.PI * 2);
    const tGrd = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, tR);
    tGrd.addColorStop(0, activeRef.current ? '#fca5a5' : '#e2e8f0');
    tGrd.addColorStop(1, activeRef.current ? '#ef4444' : '#94a3b8');
    ctx.fillStyle = tGrd;
    ctx.fill();
    ctx.strokeStyle = activeRef.current ? '#dc2626' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Target text
    ctx.font = 'bold 9px system-ui';
    ctx.fillStyle = activeRef.current ? '#fff' : '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TARGET', cx, cy - 5);
    ctx.font = '8px monospace';
    ctx.fillStyle = activeRef.current ? 'rgba(255,255,255,0.8)' : '#64748b';
    const short = (targetUrl || '').replace(/^https?:\/\//, '').slice(0, 16);
    ctx.fillText(short, cx, cy + 6);

    // ─ Agent nodes ─
    agents.forEach(a => {
      const nodeR = 22;
      const isActive = a.status === 'active';
      const isDone   = a.status === 'complete';
      const isError  = a.status === 'error';
      const isIdle   = a.status === 'idle';

      // Pulsing ring for active agents
      if (isActive) {
        const pr = nodeR + 6 + Math.sin(a.pulse) * 3;
        ctx.beginPath();
        ctx.arc(a.x, a.y, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `${a.color}80`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(a.x, a.y, nodeR, 0, Math.PI * 2);
      if (isIdle) {
        ctx.fillStyle = '#f1f5f9';
        ctx.strokeStyle = '#cbd5e1';
      } else if (isActive) {
        const ng = ctx.createRadialGradient(a.x - 4, a.y - 4, 2, a.x, a.y, nodeR);
        ng.addColorStop(0, `${a.color}25`);
        ng.addColorStop(1, `${a.color}10`);
        ctx.fillStyle = ng;
        ctx.strokeStyle = a.color;
      } else if (isDone) {
        ctx.fillStyle = '#f0fdf4';
        ctx.strokeStyle = a.findings > 0 ? a.color : '#86efac';
      } else {
        ctx.fillStyle = '#fef2f2';
        ctx.strokeStyle = '#fca5a5';
      }
      ctx.lineWidth = isActive ? 2 : 1.5;
      ctx.fill();
      ctx.stroke();

      // Short label inside
      ctx.font = `bold 9px system-ui`;
      ctx.fillStyle = isIdle ? '#94a3b8' : isActive ? a.color : isDone ? '#16a34a' : '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.short, a.x, a.y - 4);

      // Status indicator
      const icon = isActive ? '⚡' : isDone ? '✓' : isError ? '✗' : '·';
      ctx.font = '9px system-ui';
      ctx.fillStyle = isActive ? a.color : isDone ? '#16a34a' : isError ? '#ef4444' : '#cbd5e1';
      ctx.fillText(icon, a.x, a.y + 7);

      // Findings badge
      if (a.findings > 0) {
        ctx.beginPath();
        ctx.arc(a.x + nodeR * 0.7, a.y - nodeR * 0.7, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.font = 'bold 8px system-ui';
        ctx.fillStyle = '#fff';
        ctx.fillText(String(a.findings), a.x + nodeR * 0.7, a.y - nodeR * 0.7);
      }

      // Name below node
      ctx.font = '10px system-ui';
      ctx.fillStyle = isIdle ? '#94a3b8' : '#374151';
      ctx.fillText(a.label, a.x, a.y + nodeR + 13);
    });

    // ─ Floating vulnerability labels ─
    floatsRef.current = floatsRef.current.filter(f => {
      f.y += f.dy;
      f.alpha = Math.max(0, f.alpha - 0.005);
      f.life--;

      ctx.globalAlpha = f.alpha;
      const sevColor = SEV_COLORS[f.severity] ?? '#f59e0b';

      // Pill
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect?.(f.x - 75, f.y - 12, 150, 24, 6) ?? ctx.rect(f.x - 75, f.y - 12, 150, 24);
      ctx.fill();
      ctx.strokeStyle = sevColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dot + text
      ctx.beginPath();
      ctx.arc(f.x - 58, f.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = sevColor;
      ctx.fill();

      ctx.font = 'bold 9px system-ui';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text.slice(0, 20), f.x - 50, f.y);

      ctx.globalAlpha = 1;
      return f.life > 0 && f.alpha > 0.01;
    });

    // Auto-spawn packets for active agents
    if (activeRef.current) {
      agents.forEach(a => {
        if (a.status === 'active') {
          spawnPacket(a.id, 'attack');
          if (Math.random() < 0.25) spawnPacket(a.id, 'response');
        }
      });
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [spawnPacket, targetUrl]);

  // ── Resize handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const W = Math.max(rect.width, 300);
      const H = 380;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
        buildLayout(W, H);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [draw, buildLayout]);

  // ── Scan lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isScanning && scanId) {
      // Reset state for new scan
      activeRef.current = true;
      packetsRef.current = [];
      floatsRef.current = [];
      setTotalVulns(0);
      setActiveCount(0);
      setLog([]);
      // Reset agent statuses
      agentsRef.current.forEach(a => {
        a.status = 'idle';
        a.findings = 0;
        a.pulse = Math.random() * Math.PI * 2;
      });
      // Re-build layout in case canvas resized
      const c = canvasRef.current;
      if (c && c.width > 0) buildLayout(c.width, c.height);

      connectSSE(scanId);
    } else if (!isScanning) {
      activeRef.current = false;
      // Mark straggling active agents as complete
      agentsRef.current.forEach(a => {
        if (a.status === 'active') a.status = 'complete';
      });
      // If scan just completed and we have findings data, annotate agents
      if (findings.length > 0 && agentsRef.current.length > 0) {
        // Count findings per agent type by matching vulnerability_type to agent id
        const typeMap: Record<string, string> = {
          sql_injection: 'sql_injection',
          xss: 'xss',
          csrf: 'csrf',
          ssrf: 'ssrf',
          broken_authentication: 'authentication',
          authentication: 'authentication',
          api_security: 'api_security',
          command_injection: 'command_injection',
          security_headers: 'security_headers',
          missing_headers: 'security_headers',
        };
        findings.forEach(f => {
          const agentId = typeMap[f.vulnerability_type?.toLowerCase()] ??
            agentsRef.current.find(a => f.vulnerability_type?.toLowerCase().includes(a.id.replace('_', '')))?.id;
          if (agentId) {
            const ag = agentsRef.current.find(a => a.id === agentId);
            if (ag) {
              ag.status = 'complete';
              ag.findings++;
            }
          }
        });
        // Mark agents without findings as complete too
        agentsRef.current.forEach(a => {
          if (a.status === 'idle') a.status = 'complete';
        });
      }
    }
  }, [isScanning, scanId, findings, buildLayout, connectSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      esRef.current?.close();
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const doneAgents   = agentsRef.current.filter(a => a.status === 'complete');
  const activeAgents = agentsRef.current.filter(a => a.status === 'active');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-red-500 animate-pulse' : findings.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-xs font-semibold text-gray-700 tracking-wide uppercase">
            Agent Attack Map
            {isScanning && <span className="ml-2 text-red-500 font-normal normal-case">● Live</span>}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {isScanning ? (
            <>
              <span>Active: <b className="text-red-600">{activeCount}</b>/{agentsRef.current.length}</span>
              <span>Vulns: <b className={totalVulns > 0 ? 'text-red-600' : 'text-gray-700'}>{totalVulns}</b></span>
            </>
          ) : findings.length > 0 ? (
            <span className="text-gray-600">{findings.length} vulnerabilities discovered across {doneAgents.filter(a => a.findings > 0).length} agents</span>
          ) : (
            <span className="text-gray-400 italic">Start a scan to visualize agent activity</span>
          )}
        </div>
      </div>

      {/* What is this? — visible when idle */}
      {!isScanning && findings.length === 0 && agentsRef.current.every(a => a.status === 'idle') && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-start gap-2">
          <span className="text-blue-400 shrink-0 mt-0.5">ℹ</span>
          <span><b>What is this?</b> — During a scan, each ring of colored circles represents a security testing agent (SQLi, XSS, CSRF…). Animated dots show live attack packets being sent to the target. Red badges count vulnerabilities found. After scanning, the map shows a permanent record of which agents discovered findings.</span>
        </div>
      )}

      {/* Canvas area */}
      <div className="relative w-full" style={{ height: '380px' }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Footer: event log during scan, summary after */}
      {isScanning ? (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5" style={{ maxHeight: '110px', overflowY: 'auto' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Live Event Stream</p>
          {log.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Awaiting scanner events…</p>
          ) : (
            <div className="space-y-1">
              {log.slice(0, 12).map((l, i) => (
                <div key={i} className="text-xs font-mono flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: l.color }} />
                  <span className="text-gray-700">{l.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : findings.length > 0 ? (
        // Post-scan summary bar
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 flex flex-wrap gap-3">
          {AGENT_DEFS.map(def => {
            const ag = agentsRef.current.find(a => a.id === def.id);
            const count = ag?.findings ?? 0;
            return (
              <div key={def.id} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: def.color }} />
                <span className="text-gray-600">{def.label.split(' ')[0]}:</span>
                <span className={`font-semibold ${count > 0 ? 'text-red-600' : 'text-gray-400'}`}>{count}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
