import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, ShieldAlert, Zap, Activity, BrainCircuit, CheckCircle2,
  Network, ServerCrash, TrendingUp, Target, AlertTriangle, Shield
} from "lucide-react";
import { useIDSDataStore } from "@/hooks/useIDSDataStore";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  BarChart, Bar, Legend, RadialBarChart, RadialBar
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AIAlert {
  id: string;
  timestamp: string;
  type: string;
  severity: "high" | "medium" | "low";
  sourceIP: string;
  targetIP: string;
  description: string;
  status: "active" | "investigating" | "resolved";
  metadata: {
    source: string;
    confidence: number;
    attackSubType: string;
    action: string;
  };
  isNew?: boolean;
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
}

// ---------------------------------------------------------------------------
// Demo data generators
// ---------------------------------------------------------------------------
const ATTACK_PATTERNS = [
  { type: "Behavioral Anomaly", desc: "Unusual outbound traffic pattern — high entropy data exfiltration suspected", severity: "high" as const, action: "Blocked" },
  { type: "Zero-Day Exploit", desc: "Previously unseen shellcode signature in HTTP payload targeting CVE-unknown", severity: "high" as const, action: "Blocked" },
  { type: "Lateral Movement", desc: "Sequential SMB authentication attempts across internal subnet 10.0.2.x", severity: "high" as const, action: "Rate Limited" },
  { type: "DNS Tunneling", desc: "Anomalous DNS query lengths & frequency indicating covert C2 channel", severity: "medium" as const, action: "Rate Limited" },
  { type: "Credential Stuffing", desc: "ML model flagged login velocity anomaly — 400+ attempts in 30s window", severity: "high" as const, action: "Blocked" },
  { type: "Encrypted C2 Beacon", desc: "Periodic TLS heartbeat to unclassified external IP with fixed intervals", severity: "medium" as const, action: "Logged" },
  { type: "Process Injection", desc: "Memory allocation pattern matches known reflective DLL injection technique", severity: "high" as const, action: "Blocked" },
  { type: "Data Exfiltration", desc: "Outbound transfer volume spike — 3.2 GB over non-standard port 8443", severity: "high" as const, action: "Blocked" },
  { type: "Anomalous Protocol", desc: "IRC protocol detected on port 443 — possible botnet command channel", severity: "medium" as const, action: "Rate Limited" },
  { type: "Privilege Escalation", desc: "Sudden SYSTEM-level API calls from user-context process on endpoint", severity: "high" as const, action: "Blocked" },
  { type: "Port Sweep", desc: "Rapid sequential port probing across 500+ ports on critical server", severity: "medium" as const, action: "Rate Limited" },
  { type: "Crypto Mining", desc: "CPU usage spike correlated with Stratum protocol traffic detected", severity: "medium" as const, action: "Blocked" },
];

const SOURCE_IPS = [
  "203.0.113.42", "198.51.100.17", "172.16.0.88", "10.0.3.201",
  "185.220.101.33", "91.219.237.10", "45.33.32.156", "192.168.5.12",
  "103.224.182.250", "77.247.181.163", "94.102.49.193", "185.56.83.100",
];

function createDemoAlert(index?: number): AIAlert {
  const pattern = ATTACK_PATTERNS[index ?? Math.floor(Math.random() * ATTACK_PATTERNS.length)];
  const ip = SOURCE_IPS[Math.floor(Math.random() * SOURCE_IPS.length)];
  return {
    id: `demo-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    type: "AI Anomaly",
    severity: pattern.severity,
    sourceIP: ip,
    targetIP: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
    description: pattern.desc,
    status: Math.random() > 0.6 ? "active" : Math.random() > 0.5 ? "investigating" : "resolved",
    metadata: {
      source: "AI",
      confidence: Math.floor(Math.random() * 15) + 83,
      attackSubType: pattern.type,
      action: pattern.action,
    },
    isNew: true,
  };
}

function generateDemoGraphData() {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => {
    const t = new Date(now - (19 - i) * 3000);
    const base = Math.floor(Math.random() * 3);
    return {
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      anomalies: base + (i > 14 ? Math.floor(Math.random() * 3) + 1 : 0),
      confidence: Math.floor(Math.random() * 10) + 85,
    };
  });
}

function generateTaxonomyData() {
  const categories = ["Behavioral", "Zero-Day", "Lateral Mov.", "DNS Tunnel", "Credential", "Exfiltration"];
  return categories.map(name => ({
    name,
    ai: Math.floor(Math.random() * 12) + 2,
    rules: Math.floor(Math.random() * 20) + 5,
  }));
}

const DEMO_METRICS: ModelMetrics = {
  accuracy: 94.7,
  precision: 92.3,
  recall: 96.1,
  f1Score: 94.2,
  falsePositiveRate: 2.8,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AIInsightsDashboard() {
  const { alerts, isDemoMode, trafficData } = useIDSDataStore();

  // ---- Demo flowing state ----
  const [demoAlerts, setDemoAlerts] = useState<AIAlert[]>([]);
  const [demoGraph, setDemoGraph] = useState(generateDemoGraphData);
  const [demoTaxonomy, setDemoTaxonomy] = useState(generateTaxonomyData);

  // Seed initial demo alerts
  useEffect(() => {
    if (!isDemoMode) { setDemoAlerts([]); return; }
    const initial = ATTACK_PATTERNS.map((_, i) => {
      const a = createDemoAlert(i);
      a.timestamp = new Date(Date.now() - i * 8000).toISOString();
      a.isNew = false;
      return a;
    });
    setDemoAlerts(initial.slice(0, 10));
  }, [isDemoMode]);

  // Push new demo alert every 3s
  useEffect(() => {
    if (!isDemoMode) return;
    const iv = setInterval(() => {
      setDemoAlerts(prev => {
        const next = [createDemoAlert(), ...prev.map(a => ({ ...a, isNew: false }))];
        return next.slice(0, 12);
      });
    }, 3000);
    return () => clearInterval(iv);
  }, [isDemoMode]);

  // Refresh demo graph every 4s
  useEffect(() => {
    if (!isDemoMode) return;
    const iv = setInterval(() => {
      setDemoGraph(generateDemoGraphData());
      setDemoTaxonomy(generateTaxonomyData());
    }, 4000);
    return () => clearInterval(iv);
  }, [isDemoMode]);

  // ---- Live Supabase state ----
  const [liveAlerts, setLiveAlerts] = useState<AIAlert[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<ModelMetrics | null>(null);
  const [livePredictionCount, setLivePredictionCount] = useState(0);

  // Fetch live alerts & metrics
  useEffect(() => {
    if (isDemoMode) return;
    const fetchLive = async () => {
      const { data: alertsData } = await supabase
        .from('live_alerts')
        .select('*')
        .or('detection_module.eq.ai_anomaly,alert_type.ilike.%anomaly%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsData) {
        setLiveAlerts(alertsData.map(a => ({
          id: a.id,
          timestamp: a.created_at || new Date().toISOString(),
          type: "AI Anomaly",
          severity: (a.severity as "high" | "medium" | "low") || "medium",
          sourceIP: a.source_ip,
          targetIP: a.destination_ip || "unknown",
          description: a.description,
          status: (a.status === 'active' ? 'active' : a.status === 'investigating' ? 'investigating' : 'resolved') as AIAlert['status'],
          metadata: {
            source: "AI",
            confidence: (a.metadata as any)?.confidence ?? 85,
            attackSubType: a.alert_type,
            action: (a.metadata as any)?.action ?? "Logged",
          },
        })));
      }

      const { data: evalData } = await supabase
        .from('model_evaluations')
        .select('accuracy, precision, recall, f1_score, false_positive_rate')
        .order('created_at', { ascending: false })
        .limit(1);

      if (evalData && evalData.length > 0) {
        const e = evalData[0];
        setLiveMetrics({
          accuracy: Number(e.accuracy) || 0,
          precision: Number(e.precision) || 0,
          recall: Number(e.recall) || 0,
          f1Score: Number(e.f1_score) || 0,
          falsePositiveRate: Number(e.false_positive_rate) || 0,
        });
      }

      const { count } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('is_anomaly', true);
      setLivePredictionCount(count || 0);
    };
    fetchLive();
  }, [isDemoMode]);

  // Realtime subscription for new live alerts
  const handleNewAlert = useCallback((payload: any) => {
    const a = payload.new;
    if (!a) return;
    const det = a.detection_module || '';
    const typ = a.alert_type || '';
    if (det === 'ai_anomaly' || typ.toLowerCase().includes('anomaly')) {
      const newAlert: AIAlert = {
        id: a.id,
        timestamp: a.created_at || new Date().toISOString(),
        type: "AI Anomaly",
        severity: (a.severity || "medium") as AIAlert['severity'],
        sourceIP: a.source_ip,
        targetIP: a.destination_ip || "unknown",
        description: a.description,
        status: "active" as const,
        metadata: {
          source: "AI",
          confidence: (a.metadata as any)?.confidence ?? 85,
          attackSubType: a.alert_type,
          action: (a.metadata as any)?.action ?? "Logged",
        },
        isNew: true,
      };
      setLiveAlerts(prev => [newAlert, ...prev.map(x => ({ ...x, isNew: false as const }))].slice(0, 50));
    }
  }, []);

  useRealtimeSubscription('live_alerts', ['INSERT'], handleNewAlert);

  // ---- Computed values ----
  const aiAlerts = isDemoMode ? demoAlerts : liveAlerts;
  const metrics = isDemoMode ? DEMO_METRICS : (liveMetrics || { accuracy: 0, precision: 0, recall: 0, f1Score: 0, falsePositiveRate: 0 });
  const anomaliesCount = isDemoMode ? demoAlerts.length : (liveAlerts.length || livePredictionCount);
  const highSevCount = aiAlerts.filter(a => a.severity === 'high').length;
  const graphData = isDemoMode ? demoGraph : (trafficData.length > 0 ? trafficData.map(t => ({ time: t.time, anomalies: 0, confidence: 90 })) : []);
  const taxonomyData = isDemoMode ? demoTaxonomy : generateTaxonomyData();

  // Latest alert for explainer
  const latestAlert = aiAlerts[0] || null;

  // Tick for "last detection" timer
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const lastDetection = useMemo(() => {
    if (!aiAlerts.length) return "—";
    const diff = Math.floor((Date.now() - new Date(aiAlerts[0].timestamp).getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  }, [aiAlerts, /* tick dependency is implicit via setTick re-render */]);

  // Radial bar data for model performance
  const radialData = [
    { name: 'F1', value: metrics.f1Score, fill: 'hsl(var(--primary))' },
    { name: 'Recall', value: metrics.recall, fill: 'hsl(262 83% 58%)' },
    { name: 'Precision', value: metrics.precision, fill: 'hsl(200 98% 39%)' },
  ];

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-purple-500/5 p-6">
        <div className="absolute top-3 right-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-500">AI Engine Active</span>
          {isDemoMode && <Badge variant="secondary" className="text-[10px] ml-2">DEMO</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <BrainCircuit className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Insights</h2>
            <p className="text-sm text-muted-foreground">Neural network telemetry &amp; behavioral anomaly analysis</p>
          </div>
        </div>
      </div>

      {/* ====== METRIC CARDS ====== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="AI Anomalies"
          value={anomaliesCount}
          subtitle="Behavioral detections"
          icon={<BrainCircuit className="h-4 w-4" />}
          color="purple"
          pulse={isDemoMode}
        />
        <MetricCard
          title="High Severity"
          value={highSevCount}
          subtitle="Zero-day threat isolation"
          icon={<ShieldAlert className="h-4 w-4" />}
          color="orange"
        />
        <MetricCard
          title="Detection Accuracy"
          value={`${metrics.accuracy.toFixed(1)}%`}
          subtitle="Model confidence rating"
          icon={<Activity className="h-4 w-4" />}
          color="emerald"
        />
        <MetricCard
          title="Last Detection"
          value={lastDetection}
          subtitle="Real-time monitoring"
          icon={<Zap className="h-4 w-4" />}
          color="blue"
        />
      </div>

      {/* ====== ANOMALY TIMELINE (AREA CHART) ====== */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Anomaly Detection Timeline
              </CardTitle>
              <CardDescription>Real-time anomaly frequency with confidence overlay</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs border-primary/30">
              <TrendingUp className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="anomalies" name="Anomalies" stroke="hsl(262 83% 58%)" fill="url(#anomalyGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'hsl(262 83% 58%)', stroke: 'hsl(var(--background))', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="confidence" name="Confidence %" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} yAxisId={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ====== MIDDLE ROW: Model Performance + Detection Taxonomy ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance */}
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Model Performance
            </CardTitle>
            <CardDescription>Current ML model evaluation metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-center">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                      <RadialBar background dataKey="value" cornerRadius={6} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-3 flex flex-col justify-center">
                <PerfMetric label="Accuracy" value={metrics.accuracy} color="text-emerald-500" />
                <PerfMetric label="Precision" value={metrics.precision} color="text-blue-500" />
                <PerfMetric label="Recall" value={metrics.recall} color="text-purple-500" />
                <PerfMetric label="F1 Score" value={metrics.f1Score} color="text-primary" />
                <PerfMetric label="FP Rate" value={metrics.falsePositiveRate} color="text-orange-500" suffix="%" low />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detection Taxonomy */}
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5" />
              Detection Taxonomy
            </CardTitle>
            <CardDescription>AI vs Rule-based engine comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxonomyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                  <Bar dataKey="rules" name="Rule-based" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="ai" name="AI Engine" fill="hsl(262 83% 58%)" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ====== BOTTOM ROW: Explainer + Alerts ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Decision Explainer */}
        <Card className="border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-blue-500" />
              AI Decision Explainer
            </CardTitle>
            <CardDescription>Why was this traffic flagged?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestAlert ? (
              <>
                <div className="rounded-lg border border-blue-500/20 bg-background/60 p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm">{latestAlert.metadata.attackSubType}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{latestAlert.description}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contributing Factors</h4>
                  <ExplainerRow icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} text="High request rate deviations" />
                  <ExplainerRow icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} text="Unusual payload entropy pattern" />
                  <ExplainerRow icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} text="Sequential port access behavior" />
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${latestAlert.metadata.confidence}%` }} />
                    </div>
                    <span className="font-semibold text-primary">{latestAlert.metadata.confidence}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No detections to analyze</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent AI Alerts Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent AI Alerts</CardTitle>
                <CardDescription>Real-time ML threat recognition log</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">{aiAlerts.length} alerts</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              {aiAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Brain className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No AI detections yet</p>
                  <p className="text-xs mt-1">Enable demo mode or wait for live traffic</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {aiAlerts.map(alert => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MetricCard({ title, value, subtitle, icon, color, pulse }: {
  title: string; value: string | number; subtitle: string;
  icon: React.ReactNode; color: string; pulse?: boolean;
}) {
  const colorMap: Record<string, string> = {
    purple: "border-purple-500/20 from-purple-500/10 text-purple-500",
    orange: "border-orange-500/20 from-orange-500/10 text-orange-500",
    emerald: "border-emerald-500/20 from-emerald-500/10 text-emerald-500",
    blue: "border-blue-500/20 from-blue-500/10 text-blue-500",
  };
  const c = colorMap[color] || colorMap.blue;
  const [borderC, fromC, textC] = c.split(' ');

  return (
    <Card className={`${borderC} bg-gradient-to-br ${fromC} to-transparent transition-all duration-300 hover:shadow-md`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`${textC} ${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${textC} tabular-nums`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function PerfMetric({ label, value, color, suffix = "%", low }: {
  label: string; value: number; color: string; suffix?: string; low?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${color} tabular-nums`}>
        {value.toFixed(1)}{suffix}
      </span>
    </div>
  );
}

function ExplainerRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
      {icon}
      <span className="text-xs">{text}</span>
    </div>
  );
}

function AlertRow({ alert }: { alert: AIAlert }) {
  const conf = alert.metadata.confidence;
  const severityColor = alert.severity === 'high'
    ? 'bg-destructive/10 border-destructive/20'
    : alert.severity === 'medium'
      ? 'bg-orange-500/5 border-orange-500/15'
      : 'bg-muted/30 border-border';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${severityColor} transition-all duration-300 ${alert.isNew ? 'animate-fade-in ring-1 ring-primary/30' : ''}`}>
      {/* Status dot */}
      <div className="shrink-0">
        <span className={`block h-2 w-2 rounded-full ${alert.status === 'active' ? 'bg-destructive animate-pulse' :
          alert.status === 'investigating' ? 'bg-orange-500' : 'bg-emerald-500'
          }`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-purple-600/90 hover:bg-purple-700 text-white text-[10px] px-1.5 py-0">
            {alert.metadata.attackSubType}
          </Badge>
          {alert.isNew && (
            <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0 animate-pulse">NEW</Badge>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">{alert.sourceIP}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</p>
      </div>

      {/* Right side */}
      <div className="shrink-0 text-right space-y-0.5">
        <div className="text-xs font-semibold text-primary tabular-nums">{conf}%</div>
        <div className="text-[10px] text-muted-foreground">
          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
