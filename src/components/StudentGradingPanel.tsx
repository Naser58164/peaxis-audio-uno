import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock, Award, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  useExaminationAttempts, 
  useAttemptGrades,
  useCreateAttempt,
  useUpdateAttempt,
  useCreateGrade,
  type ExaminationAttempt 
} from '@/hooks/useExamination';
import { usePatientScenarios } from '@/hooks/usePatientScenarios';
import { locations, type AuscultationLocation } from '@/components/ManikinDiagram';

interface StudentGradingPanelProps {
  scenarioId: string | null;
}

export function StudentGradingPanel({ scenarioId }: StudentGradingPanelProps) {
  const [showNewExamDialog, setShowNewExamDialog] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<ExaminationAttempt | null>(null);
  const [newStudentId, setNewStudentId] = useState('');
  
  const { data: attempts, isLoading } = useExaminationAttempts(scenarioId || undefined);
  const { data: scenarios } = usePatientScenarios();
  const createAttempt = useCreateAttempt();
  const updateAttempt = useUpdateAttempt();
  const { toast } = useToast();

  const handleCreateExam = async () => {
    if (!scenarioId || !newStudentId) return;
    
    try {
      const result = await createAttempt.mutateAsync({
        student_id: newStudentId,
        scenario_id: scenarioId,
        session_id: null,
        notes: null,
      });
      setShowNewExamDialog(false);
      setNewStudentId('');
      setSelectedAttempt(result);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCompleteExam = async (attempt: ExaminationAttempt, totalScore: number, maxScore: number) => {
    await updateAttempt.mutateAsync({
      id: attempt.id,
      completed_at: new Date().toISOString(),
      total_score: totalScore,
      max_score: maxScore,
    });
    toast({ title: 'Examination completed and saved' });
  };

  if (!scenarioId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Select a scenario to manage student examinations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" />
            Student Grading
          </CardTitle>
          <Dialog open={showNewExamDialog} onOpenChange={setShowNewExamDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                New Exam
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Examination</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input
                    placeholder="Enter student ID"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateExam} disabled={!newStudentId} className="w-full">
                  Start Examination
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {selectedAttempt ? (
          <GradingDetail 
            attempt={selectedAttempt} 
            onBack={() => setSelectedAttempt(null)}
            onComplete={handleCompleteExam}
          />
        ) : (
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : attempts?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No examinations yet</p>
            ) : (
              <div className="space-y-2">
                {attempts?.map((attempt) => (
                  <AttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    onClick={() => setSelectedAttempt(attempt)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AttemptCard({ attempt, onClick }: { attempt: ExaminationAttempt; onClick: () => void }) {
  const isCompleted = !!attempt.completed_at;
  const scorePercent = attempt.total_score && attempt.max_score 
    ? Math.round((attempt.total_score / attempt.max_score) * 100)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {attempt.student_id.slice(0, 8)}...
          </span>
        </div>
        {isCompleted ? (
          <Badge variant={scorePercent && scorePercent >= 70 ? 'default' : 'destructive'}>
            {scorePercent}%
          </Badge>
        ) : (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {new Date(attempt.started_at).toLocaleDateString()}
      </p>
    </button>
  );
}

function GradingDetail({ 
  attempt, 
  onBack,
  onComplete 
}: { 
  attempt: ExaminationAttempt; 
  onBack: () => void;
  onComplete: (attempt: ExaminationAttempt, totalScore: number, maxScore: number) => void;
}) {
  const { data: grades } = useAttemptGrades(attempt.id);
  const createGrade = useCreateGrade();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  const isCompleted = !!attempt.completed_at;
  const gradedLocations = grades?.map(g => g.location) || [];
  const ungradedLocations = locations.filter(l => !gradedLocations.includes(l.id));

  const handleAddGrade = async () => {
    if (!selectedLocation) return;
    
    await createGrade.mutateAsync({
      attempt_id: attempt.id,
      location: selectedLocation,
      correct_identification: isCorrect,
      score,
      feedback: feedback || null,
    });
    
    setSelectedLocation(null);
    setIsCorrect(null);
    setScore(0);
    setFeedback('');
  };

  const totalScore = grades?.reduce((sum, g) => sum + g.score, 0) || 0;
  const maxPossible = locations.length * 10; // Assuming max 10 points per location

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        {!isCompleted && grades && grades.length > 0 && (
          <Button 
            size="sm" 
            onClick={() => onComplete(attempt, totalScore, maxPossible)}
          >
            Complete Exam
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <span className="text-sm font-medium">Current Score</span>
        <span className="text-lg font-bold">{totalScore} / {maxPossible}</span>
      </div>

      {!isCompleted && ungradedLocations.length > 0 && (
        <div className="space-y-3 p-3 border rounded-lg">
          <Label>Grade Location</Label>
          <Select value={selectedLocation || ''} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {ungradedLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedLocation && (
            <>
              <div className="flex gap-2">
                <Button
                  variant={isCorrect === true ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setIsCorrect(true); setScore(10); }}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Correct
                </Button>
                <Button
                  variant={isCorrect === false ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => { setIsCorrect(false); setScore(0); }}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Incorrect
                </Button>
              </div>

              <div className="space-y-1">
                <Label>Score (0-10)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label>Feedback (optional)</Label>
                <Textarea
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                />
              </div>

              <Button onClick={handleAddGrade} className="w-full" disabled={isCorrect === null}>
                Add Grade
              </Button>
            </>
          )}
        </div>
      )}

      <ScrollArea className="h-[150px]">
        <div className="space-y-2">
          {grades?.map((grade) => (
            <div key={grade.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
              <div className="flex items-center gap-2">
                {grade.correct_identification ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span>{locations.find(l => l.id === grade.location)?.label || grade.location}</span>
              </div>
              <Badge variant="outline">{grade.score}/10</Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
