import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Users, Clock, Activity, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useExaminationAttempts, type ExaminationAttempt } from '@/hooks/useExamination';
import { usePatientScenarios } from '@/hooks/usePatientScenarios';
import { locations } from '@/components/ManikinDiagram';

interface LiveAttempt extends ExaminationAttempt {
  gradedCount: number;
}

export function LiveExamMonitor() {
  const { data: allAttempts, refetch } = useExaminationAttempts();
  const { data: scenarios } = usePatientScenarios();
  const [liveAttempts, setLiveAttempts] = useState<LiveAttempt[]>([]);
  const [recentGrades, setRecentGrades] = useState<{ location: string; studentId: string; score: number; time: string }[]>([]);

  // Filter active (in-progress) attempts
  useEffect(() => {
    if (allAttempts) {
      const active = allAttempts
        .filter(a => !a.completed_at)
        .map(a => ({ ...a, gradedCount: 0 }));
      setLiveAttempts(active);
    }
  }, [allAttempts]);

  // Subscribe to realtime updates
  useEffect(() => {
    const attemptsChannel = supabase
      .channel('live-attempts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'examination_attempts'
        },
        (payload) => {
          console.log('Attempt update:', payload);
          refetch();
        }
      )
      .subscribe();

    const gradesChannel = supabase
      .channel('live-grades')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attempt_grades'
        },
        (payload) => {
          console.log('New grade:', payload);
          const newGrade = payload.new as { location: string; score: number; attempt_id: string };
          const attempt = allAttempts?.find(a => a.id === newGrade.attempt_id);
          
          setRecentGrades(prev => [
            {
              location: locations.find(l => l.id === newGrade.location)?.label || newGrade.location,
              studentId: attempt?.student_id.slice(0, 8) || 'Unknown',
              score: newGrade.score || 0,
              time: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 9),
          ]);

          // Update graded count
          setLiveAttempts(prev => prev.map(a => 
            a.id === newGrade.attempt_id 
              ? { ...a, gradedCount: a.gradedCount + 1 }
              : a
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attemptsChannel);
      supabase.removeChannel(gradesChannel);
    };
  }, [allAttempts, refetch]);

  const activeCount = liveAttempts.length;
  const totalLocations = locations.length;

  return (
    <div className="space-y-4">
      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Active Exams</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Live Updates</span>
            </div>
            <Badge variant="secondary" className="mt-2">Monitoring</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Active Students */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Students In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {activeCount === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No active examinations
              </p>
            ) : (
              <div className="space-y-3">
                {liveAttempts.map((attempt) => {
                  const scenario = scenarios?.find(s => s.id === attempt.scenario_id);
                  const progress = (attempt.gradedCount / totalLocations) * 100;
                  const startTime = new Date(attempt.started_at);
                  const duration = Math.round((Date.now() - startTime.getTime()) / 60000);

                  return (
                    <div 
                      key={attempt.id}
                      className="p-3 border border-border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="font-medium text-sm">
                            {attempt.student_id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {duration}m
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {scenario?.name || 'Unknown Scenario'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{attempt.gradedCount}/{totalLocations}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Grading Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[150px]">
            {recentGrades.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Waiting for activity...
              </p>
            ) : (
              <div className="space-y-2">
                {recentGrades.map((grade, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {grade.studentId}
                      </Badge>
                      <span>{grade.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={grade.score >= 7 ? 'default' : 'destructive'}>
                        {grade.score}/10
                      </Badge>
                      <span className="text-xs text-muted-foreground">{grade.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
