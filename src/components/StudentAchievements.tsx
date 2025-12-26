import { useMemo } from 'react';
import { 
  Trophy, Star, Target, Flame, Award, Medal, 
  GraduationCap, Zap, Crown, Heart, TrendingUp, CheckCircle2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExaminationAttempts } from '@/hooks/useExamination';
import { useAuth } from '@/contexts/AuthContext';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  category: 'milestone' | 'performance' | 'streak';
}

export function StudentAchievements() {
  const { user } = useAuth();
  const { data: allAttempts } = useExaminationAttempts();

  const achievements = useMemo(() => {
    if (!allAttempts || !user) return [];

    // Filter to only this student's attempts
    const studentAttempts = allAttempts.filter(a => a.student_id === user.id);
    const completedAttempts = studentAttempts.filter(
      a => a.completed_at && a.total_score !== null && a.max_score !== null
    );

    const totalExams = completedAttempts.length;
    const passedExams = completedAttempts.filter(
      a => (a.total_score! / a.max_score!) >= 0.7
    ).length;
    const perfectExams = completedAttempts.filter(
      a => a.total_score === a.max_score
    ).length;
    
    const averageScore = totalExams > 0
      ? completedAttempts.reduce((sum, a) => sum + ((a.total_score! / a.max_score!) * 100), 0) / totalExams
      : 0;

    // Calculate streak (consecutive passed exams)
    let currentStreak = 0;
    let maxStreak = 0;
    const sortedAttempts = [...completedAttempts].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    
    for (const attempt of sortedAttempts) {
      if ((attempt.total_score! / attempt.max_score!) >= 0.7) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    const achievementsList: Achievement[] = [
      // Milestone achievements
      {
        id: 'first-exam',
        name: 'First Steps',
        description: 'Complete your first exam',
        icon: <Star className="h-5 w-5" />,
        unlocked: totalExams >= 1,
        progress: Math.min(totalExams, 1),
        maxProgress: 1,
        category: 'milestone',
      },
      {
        id: '5-exams',
        name: 'Getting Started',
        description: 'Complete 5 exams',
        icon: <Target className="h-5 w-5" />,
        unlocked: totalExams >= 5,
        progress: Math.min(totalExams, 5),
        maxProgress: 5,
        category: 'milestone',
      },
      {
        id: '10-exams',
        name: 'Dedicated Learner',
        description: 'Complete 10 exams',
        icon: <GraduationCap className="h-5 w-5" />,
        unlocked: totalExams >= 10,
        progress: Math.min(totalExams, 10),
        maxProgress: 10,
        category: 'milestone',
      },
      {
        id: '25-exams',
        name: 'Practice Makes Perfect',
        description: 'Complete 25 exams',
        icon: <Medal className="h-5 w-5" />,
        unlocked: totalExams >= 25,
        progress: Math.min(totalExams, 25),
        maxProgress: 25,
        category: 'milestone',
      },
      {
        id: '50-exams',
        name: 'Expert in Training',
        description: 'Complete 50 exams',
        icon: <Crown className="h-5 w-5" />,
        unlocked: totalExams >= 50,
        progress: Math.min(totalExams, 50),
        maxProgress: 50,
        category: 'milestone',
      },

      // Performance achievements
      {
        id: 'first-pass',
        name: 'Passing Grade',
        description: 'Pass your first exam (70%+)',
        icon: <CheckCircle2 className="h-5 w-5" />,
        unlocked: passedExams >= 1,
        progress: Math.min(passedExams, 1),
        maxProgress: 1,
        category: 'performance',
      },
      {
        id: 'perfect-score',
        name: 'Perfectionist',
        description: 'Get a perfect score on an exam',
        icon: <Trophy className="h-5 w-5" />,
        unlocked: perfectExams >= 1,
        progress: Math.min(perfectExams, 1),
        maxProgress: 1,
        category: 'performance',
      },
      {
        id: 'five-perfect',
        name: 'Flawless',
        description: 'Get 5 perfect scores',
        icon: <Award className="h-5 w-5" />,
        unlocked: perfectExams >= 5,
        progress: Math.min(perfectExams, 5),
        maxProgress: 5,
        category: 'performance',
      },
      {
        id: 'avg-80',
        name: 'Consistent Performer',
        description: 'Maintain 80% average score',
        icon: <TrendingUp className="h-5 w-5" />,
        unlocked: averageScore >= 80 && totalExams >= 3,
        progress: Math.min(Math.round(averageScore), 80),
        maxProgress: 80,
        category: 'performance',
      },
      {
        id: 'avg-90',
        name: 'Excellence',
        description: 'Maintain 90% average score',
        icon: <Zap className="h-5 w-5" />,
        unlocked: averageScore >= 90 && totalExams >= 5,
        progress: Math.min(Math.round(averageScore), 90),
        maxProgress: 90,
        category: 'performance',
      },

      // Streak achievements
      {
        id: 'streak-3',
        name: 'On a Roll',
        description: 'Pass 3 exams in a row',
        icon: <Flame className="h-5 w-5" />,
        unlocked: maxStreak >= 3,
        progress: Math.min(maxStreak, 3),
        maxProgress: 3,
        category: 'streak',
      },
      {
        id: 'streak-5',
        name: 'Hot Streak',
        description: 'Pass 5 exams in a row',
        icon: <Heart className="h-5 w-5" />,
        unlocked: maxStreak >= 5,
        progress: Math.min(maxStreak, 5),
        maxProgress: 5,
        category: 'streak',
      },
      {
        id: 'streak-10',
        name: 'Unstoppable',
        description: 'Pass 10 exams in a row',
        icon: <Crown className="h-5 w-5" />,
        unlocked: maxStreak >= 10,
        progress: Math.min(maxStreak, 10),
        maxProgress: 10,
        category: 'streak',
      },
    ];

    return achievementsList;
  }, [allAttempts, user]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  const getCategoryColor = (category: Achievement['category']) => {
    switch (category) {
      case 'milestone':
        return 'text-primary';
      case 'performance':
        return 'text-yellow-500';
      case 'streak':
        return 'text-orange-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Achievements
          </div>
          <Badge variant="secondary">
            {unlockedCount} / {totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  achievement.unlocked
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-muted/50 border-border opacity-60'
                }`}
              >
                <div
                  className={`flex-shrink-0 p-2 rounded-full ${
                    achievement.unlocked
                      ? `bg-primary/20 ${getCategoryColor(achievement.category)}`
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {achievement.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {achievement.name}
                    </span>
                    {achievement.unlocked && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {achievement.description}
                  </p>
                  {!achievement.unlocked && (
                    <div className="mt-1">
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="h-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {achievement.progress} / {achievement.maxProgress}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
