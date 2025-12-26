import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Target, Users, Download, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useExaminationAttempts } from '@/hooks/useExamination';
import { usePatientScenarios } from '@/hooks/usePatientScenarios';
import { exportToCSV, exportAnalyticsSummary, exportToPDF } from '@/utils/exportUtils';

export function PerformanceAnalytics() {
  const { data: attempts } = useExaminationAttempts();
  const { data: scenarios } = usePatientScenarios();

  const analytics = useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return {
        averageScore: 0,
        passRate: 0,
        totalExams: 0,
        completedExams: 0,
        scoresByScenario: [],
        improvementData: [],
        passFailData: [],
      };
    }

    const completedAttempts = attempts.filter(a => a.completed_at && a.total_score !== null && a.max_score !== null);
    const totalExams = attempts.length;
    const completedExams = completedAttempts.length;

    // Average score
    const averageScore = completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((sum, a) => sum + ((a.total_score! / a.max_score!) * 100), 0) / completedAttempts.length)
      : 0;

    // Pass rate (>= 70%)
    const passedExams = completedAttempts.filter(a => (a.total_score! / a.max_score!) >= 0.7).length;
    const passRate = completedExams > 0 ? Math.round((passedExams / completedExams) * 100) : 0;

    // Scores by scenario
    const scenarioScores: Record<string, { total: number; count: number; name: string }> = {};
    completedAttempts.forEach(a => {
      const scenario = scenarios?.find(s => s.id === a.scenario_id);
      const name = scenario?.name || 'Unknown';
      if (!scenarioScores[a.scenario_id]) {
        scenarioScores[a.scenario_id] = { total: 0, count: 0, name };
      }
      scenarioScores[a.scenario_id].total += (a.total_score! / a.max_score!) * 100;
      scenarioScores[a.scenario_id].count++;
    });

    const scoresByScenario = Object.entries(scenarioScores).map(([id, data]) => ({
      name: data.name.length > 15 ? data.name.slice(0, 15) + '...' : data.name,
      avgScore: Math.round(data.total / data.count),
      exams: data.count,
    }));

    // Improvement over time (last 10 exams)
    const sortedAttempts = [...completedAttempts]
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .slice(-10);

    const improvementData = sortedAttempts.map((a, i) => ({
      exam: `#${i + 1}`,
      score: Math.round((a.total_score! / a.max_score!) * 100),
      date: new Date(a.started_at).toLocaleDateString(),
    }));

    // Pass/Fail distribution
    const passFailData = [
      { name: 'Passed', value: passedExams, fill: 'hsl(var(--primary))' },
      { name: 'Failed', value: completedExams - passedExams, fill: 'hsl(var(--destructive))' },
    ];

    return {
      averageScore,
      passRate,
      totalExams,
      completedExams,
      scoresByScenario,
      improvementData,
      passFailData,
    };
  }, [attempts, scenarios]);

  const chartConfig = {
    avgScore: { label: 'Average Score', color: 'hsl(var(--primary))' },
    score: { label: 'Score', color: 'hsl(var(--primary))' },
  };

  const handleExportCSV = () => {
    if (attempts && scenarios) {
      exportToCSV(attempts, scenarios);
    }
  };

  const handleExportSummary = () => {
    exportAnalyticsSummary(analytics);
  };

  const handleExportPDF = () => {
    if (attempts) {
      exportToPDF(analytics, attempts);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!attempts?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export Results (CSV)
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportSummary} disabled={!analytics.completedExams}>
          <Download className="h-4 w-4 mr-2" />
          Export Summary (CSV)
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!analytics.completedExams}>
          <FileText className="h-4 w-4 mr-2" />
          Print Report (PDF)
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Score</span>
            </div>
            <p className="text-2xl font-bold mt-1">{analytics.averageScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pass Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{analytics.passRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Exams</span>
            </div>
            <p className="text-2xl font-bold mt-1">{analytics.totalExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{analytics.completedExams}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Scores by Scenario */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Score by Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.scoresByScenario.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.scoresByScenario}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Improvement Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Trend (Last 10 Exams)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.improvementData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.improvementData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="exam" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Pass/Fail Distribution */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pass/Fail Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.completedExams > 0 ? (
              <div className="flex items-center justify-center gap-8">
                <ChartContainer config={chartConfig} className="h-[150px] w-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.passFailData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {analytics.passFailData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="flex flex-col gap-2">
                  {analytics.passFailData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No completed exams yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
