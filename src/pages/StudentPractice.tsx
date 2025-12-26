import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ManikinDiagram, locations, type AuscultationLocation } from '@/components/ManikinDiagram';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Leaderboard } from '@/components/Leaderboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientScenarios, useScenarioSounds } from '@/hooks/usePatientScenarios';
import { useCreateAttempt, useUpdateAttempt, useCreateGrade } from '@/hooks/useExamination';
import { Play, CheckCircle, XCircle, Clock, Award, RotateCcw, ArrowLeft, Timer, AlertTriangle } from 'lucide-react';

interface Answer {
  location: AuscultationLocation;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

const EXAM_TIME_LIMIT = 5 * 60; // 5 minutes in seconds

export default function StudentPractice() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { data: scenarios, isLoading: scenariosLoading } = usePatientScenarios();
  
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [timedMode, setTimedMode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(EXAM_TIME_LIMIT);
  const [examStarted, setExamStarted] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<AuscultationLocation | null>(null);
  const [playingLocation, setPlayingLocation] = useState<AuscultationLocation | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [userGuess, setUserGuess] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: sounds } = useScenarioSounds(selectedScenarioId);
  const createAttempt = useCreateAttempt();
  const updateAttempt = useUpdateAttempt();
  const createGrade = useCreateGrade();

  const currentLocation = locations[currentLocationIndex];
  const currentSound = sounds?.find(s => s.location === selectedLocation);
  const progress = (currentLocationIndex / locations.length) * 100;

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Timer effect
  useEffect(() => {
    if (examStarted && timedMode && timeRemaining > 0 && !showResults) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto submit
            setTimeExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [examStarted, timedMode, showResults]);

  // Handle time expiration
  useEffect(() => {
    if (timeExpired && examStarted && !showResults) {
      handleTimeExpired();
    }
  }, [timeExpired]);

  const handleTimeExpired = async () => {
    if (!currentAttemptId) return;

    toast({ 
      title: "Time's up!", 
      description: "Your exam has been automatically submitted.",
      variant: "destructive"
    });

    // Calculate score based on answers given
    const totalScore = answers.filter(a => a.isCorrect).length * 10;
    const maxScore = locations.length * 10;

    await updateAttempt.mutateAsync({
      id: currentAttemptId,
      completed_at: new Date().toISOString(),
      total_score: totalScore,
      max_score: maxScore,
      notes: 'Self-practice exam (Timed - Auto-submitted)',
    });

    setShowResults(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = async () => {
    if (!selectedScenarioId || !user) return;

    try {
      const result = await createAttempt.mutateAsync({
        student_id: user.id,
        scenario_id: selectedScenarioId,
        session_id: null,
        notes: timedMode ? 'Self-practice exam (Timed)' : 'Self-practice exam',
      });
      
      setCurrentAttemptId(result.id);
      setExamStarted(true);
      setStartTime(new Date());
      setTimeRemaining(EXAM_TIME_LIMIT);
      setTimeExpired(false);
      setSelectedLocation(locations[0].id);
      toast({ title: timedMode ? 'Timed exam started! Good luck!' : 'Exam started! Good luck!' });
    } catch (error) {
      toast({ title: 'Failed to start exam', variant: 'destructive' });
    }
  };

  const handlePlayingChange = useCallback((isPlaying: boolean) => {
    setPlayingLocation(isPlaying ? selectedLocation : null);
  }, [selectedLocation]);

  const soundTypeOptions = ['normal', 'murmur', 'arrhythmia', 'crackles', 'wheezes', 'rhonchi'];

  const handleSubmitAnswer = async () => {
    if (!userGuess || !selectedLocation || !currentAttemptId) return;

    const correctAnswer = currentSound?.sound_type || 'normal';
    const isCorrect = userGuess.toLowerCase() === correctAnswer.toLowerCase();
    const score = isCorrect ? 10 : 0;

    // Save grade to database
    await createGrade.mutateAsync({
      attempt_id: currentAttemptId,
      location: selectedLocation,
      correct_identification: isCorrect,
      score,
      feedback: isCorrect ? 'Correct identification' : `Expected: ${correctAnswer}`,
    });

    const answer: Answer = {
      location: selectedLocation,
      userAnswer: userGuess,
      correctAnswer,
      isCorrect,
    };

    setAnswers(prev => [...prev, answer]);
    setUserGuess('');

    // Move to next location or finish
    if (currentLocationIndex < locations.length - 1) {
      const nextIndex = currentLocationIndex + 1;
      setCurrentLocationIndex(nextIndex);
      setSelectedLocation(locations[nextIndex].id);
    } else {
      // Exam complete
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      const totalScore = [...answers, answer].filter(a => a.isCorrect).length * 10;
      const maxScore = locations.length * 10;
      
      await updateAttempt.mutateAsync({
        id: currentAttemptId,
        completed_at: new Date().toISOString(),
        total_score: totalScore,
        max_score: maxScore,
      });
      
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setExamStarted(false);
    setCurrentAttemptId(null);
    setCurrentLocationIndex(0);
    setSelectedLocation(null);
    setAnswers([]);
    setShowResults(false);
    setUserGuess('');
    setStartTime(null);
    setTimeRemaining(EXAM_TIME_LIMIT);
    setTimeExpired(false);
  };

  const score = answers.filter(a => a.isCorrect).length;
  const totalQuestions = locations.length;
  const percentage = Math.round((score / totalQuestions) * 100);
  const passed = percentage >= 70;

  if (authLoading || scenariosLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {!examStarted ? (
          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Start Practice Exam
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Scenario</label>
                  <Select 
                    value={selectedScenarioId || ''} 
                    onValueChange={setSelectedScenarioId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient scenario" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenarios?.map((scenario) => (
                        <SelectItem key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timed Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <div>
                      <Label htmlFor="timed-mode" className="font-medium">Timed Exam</Label>
                      <p className="text-xs text-muted-foreground">
                        {EXAM_TIME_LIMIT / 60} minute time limit
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="timed-mode"
                    checked={timedMode}
                    onCheckedChange={setTimedMode}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Exam Instructions</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• You will listen to sounds at {locations.length} auscultation points</li>
                    <li>• For each location, identify the type of sound you hear</li>
                    <li>• A score of 70% or higher is required to pass</li>
                    {timedMode && (
                      <li className="text-destructive">• You have {EXAM_TIME_LIMIT / 60} minutes to complete the exam</li>
                    )}
                  </ul>
                </div>

                <Button 
                  onClick={handleStartExam}
                  disabled={!selectedScenarioId}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {timedMode ? 'Start Timed Exam' : 'Start Exam'}
                </Button>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Leaderboard />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Progress Panel */}
            <div className="space-y-4">
              {/* Timer */}
              {timedMode && (
                <Card className={timeRemaining <= 60 ? 'border-destructive' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className={`h-5 w-5 ${timeRemaining <= 60 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
                        <span className="text-sm font-medium">Time Remaining</span>
                      </div>
                      <span className={`text-2xl font-bold ${timeRemaining <= 60 ? 'text-destructive' : ''}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                    {timeRemaining <= 60 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        Less than 1 minute remaining!
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {currentLocationIndex + 1} / {locations.length}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Current Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="text-lg px-3 py-1">
                    {currentLocation?.label}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Your Answer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={userGuess} onValueChange={setUserGuess}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sound type" />
                    </SelectTrigger>
                    <SelectContent>
                      {soundTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={!userGuess}
                    className="w-full"
                  >
                    Submit Answer
                  </Button>
                </CardContent>
              </Card>

              {/* Previous Answers */}
              {answers.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Previous Answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-2">
                        {answers.map((answer, i) => (
                          <div 
                            key={i}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {answer.isCorrect ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                              <span>
                                {locations.find(l => l.id === answer.location)?.label}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Manikin */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h2 className="text-lg font-semibold mb-4 text-center">
                  Listen to the Sound
                </h2>
                <ManikinDiagram
                  selectedLocation={selectedLocation}
                  onLocationSelect={() => {}} // Disabled during exam
                  playingLocation={playingLocation}
                />
              </div>
            </div>

            {/* Audio Player */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audio Playback</CardTitle>
                </CardHeader>
                <CardContent>
                  <AudioPlayer
                    location={selectedLocation}
                    soundType={currentSound?.sound_type || 'normal'}
                    soundUrl={currentSound?.sound_url}
                    volume={currentSound?.volume || 1}
                    onVolumeChange={() => {}}
                    onPlayingChange={handlePlayingChange}
                    isExaminerView={false}
                  />
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Listen to the sound at the highlighted location, then select 
                    what type of sound you hear from the dropdown and submit your answer.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Results Dialog */}
        <Dialog open={showResults} onOpenChange={setShowResults}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Exam Complete!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {timeExpired && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                  <Timer className="h-4 w-4" />
                  Time expired - exam auto-submitted
                </div>
              )}

              <div className="text-center">
                <p className={`text-5xl font-bold ${passed ? 'text-green-500' : 'text-destructive'}`}>
                  {percentage}%
                </p>
                <Badge 
                  variant={passed ? 'default' : 'destructive'}
                  className="mt-2"
                >
                  {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{score}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-destructive">{totalQuestions - score}</p>
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                </div>
              </div>

              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {answers.map((answer, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {answer.isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span>{locations.find(l => l.id === answer.location)?.label}</span>
                      </div>
                      {!answer.isCorrect && (
                        <span className="text-xs text-muted-foreground">
                          Correct: {answer.correctAnswer}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
                <Button onClick={handleRestart} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
