import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { 
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  DollarSign, 
  Search, 
  Sparkles, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Download,
  Calendar,
  Activity
} from 'lucide-react';

interface UsageData {
  date: string;
  serpapi_calls: number;
  openai_calls: number;
  moderation_calls: number;
  anonymous_searches: number;
  authenticated_searches: number;
  daily_cost: number;
}

interface UserPlanData {
  plan: string;
  user_count: number;
  searches: number;
  creations: number;
}

interface CostMetrics {
  total_daily_cost: number;
  monthly_projection: number;
  serpapi_cost: number;
  openai_cost: number;
  moderation_cost: number;
  cost_per_user: number;
}

export const UsageAnalytics = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('7d');
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [userPlanData, setUserPlanData] = useState<UserPlanData[]>([]);
  const [costMetrics, setCostMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const COST_RATES = {
    SERPAPI: 0.004, // $0.004 per search
    OPENAI_GPT: 0.01, // ~$0.01 per generation (average)
    OPENAI_MODERATION: 0.0002 // $0.0002 per moderation
  };

  const CHART_COLORS = {
    serpapi: 'hsl(var(--chart-1))',
    openai: 'hsl(var(--chart-2))',
    moderation: 'hsl(var(--chart-3))',
    cost: 'hsl(var(--chart-4))',
    users: 'hsl(var(--chart-5))'
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsageData(),
        loadUserPlanData(),
        loadCostMetrics()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error loading analytics",
        description: "Failed to fetch usage data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsageData = async () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: lookups } = await supabase
      .from('lookups')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    const { data: anonymous } = await supabase
      .from('anonymous_searches')
      .select('created_at, search_count')
      .gte('created_at', startDate.toISOString());

    const { data: creations } = await supabase
      .from('creations')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    // Group by date and calculate costs
    const dateMap = new Map<string, UsageData>();
    
    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        serpapi_calls: 0,
        openai_calls: 0,
        moderation_calls: 0,
        anonymous_searches: 0,
        authenticated_searches: 0,
        daily_cost: 0
      });
    }

    // Process authenticated lookups (SerpAPI calls)
    lookups?.forEach(lookup => {
      const date = lookup.created_at.split('T')[0];
      const existing = dateMap.get(date);
      if (existing) {
        existing.serpapi_calls++;
        existing.authenticated_searches++;
      }
    });

    // Process anonymous searches (SerpAPI calls)
    anonymous?.forEach(search => {
      const date = search.created_at.split('T')[0];
      const existing = dateMap.get(date);
      if (existing) {
        existing.serpapi_calls += search.search_count;
        existing.anonymous_searches += search.search_count;
      }
    });

    // Process OpenAI creations
    creations?.forEach(creation => {
      const date = creation.created_at.split('T')[0];
      const existing = dateMap.get(date);
      if (existing) {
        existing.openai_calls++;
        existing.moderation_calls++; // Each creation gets moderated
      }
    });

    // Calculate daily costs
    Array.from(dateMap.values()).forEach(data => {
      data.daily_cost = 
        (data.serpapi_calls * COST_RATES.SERPAPI) +
        (data.openai_calls * COST_RATES.OPENAI_GPT) +
        (data.moderation_calls * COST_RATES.OPENAI_MODERATION);
    });

    setUsageData(Array.from(dateMap.values()).reverse());
  };

  const loadUserPlanData = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('plan, user_id');

    const { data: lookups } = await supabase
      .from('lookups')
      .select('user_id')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: creations } = await supabase
      .from('creations')
      .select('user_id')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const planMap = new Map<string, UserPlanData>();
    
    profiles?.forEach(profile => {
      const plan = profile.plan || 'free';
      if (!planMap.has(plan)) {
        planMap.set(plan, { plan, user_count: 0, searches: 0, creations: 0 });
      }
      planMap.get(plan)!.user_count++;
    });

    // Count searches by plan
    lookups?.forEach(lookup => {
      const profile = profiles?.find(p => p.user_id === lookup.user_id);
      const plan = profile?.plan || 'free';
      const data = planMap.get(plan);
      if (data) data.searches++;
    });

    // Count creations by plan
    creations?.forEach(creation => {
      const profile = profiles?.find(p => p.user_id === creation.user_id);
      const plan = profile?.plan || 'free';
      const data = planMap.get(plan);
      if (data) data.creations++;
    });

    setUserPlanData(Array.from(planMap.values()));
  };

  const loadCostMetrics = async () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Today's usage
    const { data: todayLookups } = await supabase
      .from('lookups')
      .select('created_at')
      .gte('created_at', startOfDay.toISOString());

    const { data: todayAnonymous } = await supabase
      .from('anonymous_searches')
      .select('search_count')
      .gte('created_at', startOfDay.toISOString());

    const { data: todayCreations } = await supabase
      .from('creations')
      .select('created_at')
      .gte('created_at', startOfDay.toISOString());

    const { count: totalUsersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const serpapi_calls = (todayLookups?.length || 0) + 
      (todayAnonymous?.reduce((sum, item) => sum + item.search_count, 0) || 0);
    const openai_calls = todayCreations?.length || 0;
    const moderation_calls = openai_calls; // Each creation gets moderated

    const serpapi_cost = serpapi_calls * COST_RATES.SERPAPI;
    const openai_cost = openai_calls * COST_RATES.OPENAI_GPT;
    const moderation_cost = moderation_calls * COST_RATES.OPENAI_MODERATION;
    const total_daily_cost = serpapi_cost + openai_cost + moderation_cost;

    setCostMetrics({
      total_daily_cost,
      monthly_projection: total_daily_cost * 30,
      serpapi_cost,
      openai_cost,
      moderation_cost,
      cost_per_user: totalUsersCount ? total_daily_cost / totalUsersCount : 0
    });
  };

  const exportData = async () => {
    try {
      const csvData = usageData.map(row => ({
        Date: row.date,
        'SerpAPI Calls': row.serpapi_calls,
        'OpenAI Calls': row.openai_calls,
        'Moderation Calls': row.moderation_calls,
        'Anonymous Searches': row.anonymous_searches,
        'Authenticated Searches': row.authenticated_searches,
        'Daily Cost ($)': row.daily_cost.toFixed(4)
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-analytics-${timeRange}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Usage data exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Usage Analytics & Cost Monitoring</h2>
          <p className="text-muted-foreground">Track API costs, usage patterns, and system performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Cost Overview Cards */}
      {costMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Daily Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costMetrics.total_daily_cost.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">
                Monthly projection: ${costMetrics.monthly_projection.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                SerpAPI Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costMetrics.serpapi_cost.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">
                Search operations
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                OpenAI Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costMetrics.openai_cost.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">
                Content generation
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Cost per User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costMetrics.cost_per_user.toFixed(6)}</div>
              <div className="text-xs text-muted-foreground">
                Daily average
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
        </TabsList>

        {/* Usage Trends Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  serpapi: { label: "SerpAPI Calls", color: CHART_COLORS.serpapi },
                  openai: { label: "OpenAI Calls", color: CHART_COLORS.openai },
                  moderation: { label: "Moderation Calls", color: CHART_COLORS.moderation }
                }}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="serpapi_calls" 
                      stroke={CHART_COLORS.serpapi}
                      strokeWidth={2}
                      name="SerpAPI Calls"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="openai_calls" 
                      stroke={CHART_COLORS.openai}
                      strokeWidth={2}
                      name="OpenAI Calls"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="moderation_calls" 
                      stroke={CHART_COLORS.moderation}
                      strokeWidth={2}
                      name="Moderation Calls"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    authenticated: { label: "Authenticated", color: CHART_COLORS.serpapi },
                    anonymous: { label: "Anonymous", color: CHART_COLORS.openai }
                  }}
                  className="h-60"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="authenticated_searches" 
                        fill={CHART_COLORS.serpapi}
                        name="Authenticated Searches"
                      />
                      <Bar 
                        dataKey="anonymous_searches" 
                        fill={CHART_COLORS.openai}
                        name="Anonymous Searches"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total API Calls</span>
                    <Badge variant="outline">
                      {usageData.reduce((sum, day) => sum + day.serpapi_calls + day.openai_calls, 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Searches</span>
                    <Badge variant="outline">
                      {usageData.reduce((sum, day) => sum + day.serpapi_calls, 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Creations</span>
                    <Badge variant="outline">
                      {usageData.reduce((sum, day) => sum + day.openai_calls, 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Daily Cost</span>
                    <Badge variant="outline">
                      ${(usageData.reduce((sum, day) => sum + day.daily_cost, 0) / usageData.length).toFixed(4)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  cost: { label: "Daily Cost ($)", color: CHART_COLORS.cost }
                }}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toFixed(3)}`}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value) => [`$${Number(value).toFixed(4)}`, "Daily Cost"]}
                      />} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="daily_cost" 
                      stroke={CHART_COLORS.cost}
                      strokeWidth={3}
                      name="Daily Cost"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {costMetrics && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">SerpAPI (Search)</span>
                        <span className="font-mono">${costMetrics.serpapi_cost.toFixed(4)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${(costMetrics.serpapi_cost / costMetrics.total_daily_cost) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">OpenAI (Generation)</span>
                        <span className="font-mono">${costMetrics.openai_cost.toFixed(4)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-chart-2 h-2 rounded-full" 
                          style={{ 
                            width: `${(costMetrics.openai_cost / costMetrics.total_daily_cost) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">OpenAI (Moderation)</span>
                        <span className="font-mono">${costMetrics.moderation_cost.toFixed(4)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-chart-3 h-2 rounded-full" 
                          style={{ 
                            width: `${(costMetrics.moderation_cost / costMetrics.total_daily_cost) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costMetrics && costMetrics.monthly_projection > 50 && (
                    <div className="flex items-start gap-3 p-3 border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">High Monthly Projection</p>
                        <p className="text-xs text-muted-foreground">
                          Current trajectory: ${costMetrics.monthly_projection.toFixed(2)}/month
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Cost rate limits:</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>• SerpAPI: ${COST_RATES.SERPAPI}/search</li>
                      <li>• OpenAI GPT: ~${COST_RATES.OPENAI_GPT}/generation</li>
                      <li>• OpenAI Moderation: ${COST_RATES.OPENAI_MODERATION}/check</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Analytics Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Users by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    users: { label: "Users", color: CHART_COLORS.users }
                  }}
                  className="h-60"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userPlanData}
                        dataKey="user_count"
                        nameKey="plan"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ plan, user_count }) => `${plan}: ${user_count}`}
                      >
                        {userPlanData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} 
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage by Plan (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userPlanData.map((plan, index) => (
                    <div key={plan.plan} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">{plan.plan}</span>
                        <div className="text-right">
                          <div className="text-sm">{plan.searches} searches</div>
                          <div className="text-xs text-muted-foreground">{plan.creations} creations</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((plan.searches / Math.max(...userPlanData.map(p => p.searches))) * 100, 100)}%` 
                            }}
                          />
                        </div>
                        <div className="w-full bg-muted rounded-full h-1">
                          <div 
                            className="bg-chart-2 h-1 rounded-full" 
                            style={{ 
                              width: `${Math.min((plan.creations / Math.max(...userPlanData.map(p => p.creations))) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plan Utilization Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {userPlanData.map((plan) => (
                  <div key={plan.plan} className="p-4 border rounded-lg">
                    <div className="text-lg font-semibold capitalize mb-2">{plan.plan}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Users:</span>
                        <span className="font-mono">{plan.user_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Searches per user:</span>
                        <span className="font-mono">
                          {plan.user_count > 0 ? (plan.searches / plan.user_count).toFixed(1) : '0'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Creations per user:</span>
                        <span className="font-mono">
                          {plan.user_count > 0 ? (plan.creations / plan.user_count).toFixed(1) : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};