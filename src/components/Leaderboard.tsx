import { useMemo } from 'react';
import { Trophy, Medal, Award, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExaminationAttempts } from '@/hooks/useExamination';
import { usePatientScenarios } from '@/hooks/usePatientScenarios';

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  averageScore: number;
  totalExams: number;
  passRate: number;
  bestScore: number;
}

export function Leaderboard() {
  const { data: attempts } = useExaminationAttempts();
  const { data: scenarios } = usePatientScenarios();

  const leaderboard = useMemo(() => {
    if (!attempts || attempts.length === 0) return [];

    // Group by student
    const studentStats: Record<string, {
      scores: number[];
      passed: number;
      bestScore: number;
    }> = {};

    attempts.forEach(a => {
      if (!a.completed_at || a.total_score === null || a.max_score === null) return;
      
      const percentage = Math.round((a.total_score / a.max_score) * 100);
      
      if (!studentStats[a.student_id]) {
        studentStats[a.student_id] = { scores: [], passed: 0, bestScore: 0 };
      }
      
      studentStats[a.student_id].scores.push(percentage);
      if (percentage >= 70) {
        studentStats[a.student_id].passed++;
      }
      if (percentage > studentStats[a.student_id].bestScore) {
        studentStats[a.student_id].bestScore = percentage;
      }
    });

    // Calculate rankings
    const entries: LeaderboardEntry[] = Object.entries(studentStats)
      .map(([studentId, stats]) => ({
        rank: 0,
        studentId,
        averageScore: Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length),
        totalExams: stats.scores.length,
        passRate: Math.round((stats.passed / stats.scores.length) * 100),
        bestScore: stats.bestScore,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return entries;
  }, [attempts]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-500/10 border-gray-500/30';
      case 3:
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Student Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No completed exams yet. Be the first to compete!
          </p>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.studentId}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${getRankBg(entry.rank)}`}
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">
                        {entry.studentId.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{entry.totalExams} exams</span>
                      <span>•</span>
                      <span>{entry.passRate}% pass rate</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="default" className="text-lg px-3">
                      {entry.averageScore}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Best: {entry.bestScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-1">How rankings work</h4>
          <p className="text-xs text-muted-foreground">
            Students are ranked by their average score across all completed exams. 
            A passing score is 70% or higher.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
