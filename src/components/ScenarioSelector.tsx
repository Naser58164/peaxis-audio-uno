import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePatientScenarios,
  useCreateScenario,
  useDeleteScenario,
  type PatientScenario,
} from '@/hooks/usePatientScenarios';

interface ScenarioSelectorProps {
  selectedScenarioId: string | null;
  onScenarioSelect: (scenarioId: string | null) => void;
}

export function ScenarioSelector({ selectedScenarioId, onScenarioSelect }: ScenarioSelectorProps) {
  const { user, isExaminer } = useAuth();
  const { data: scenarios, isLoading } = usePatientScenarios();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newScenario, setNewScenario] = useState({
    name: '',
    age: '',
    gender: '',
    condition_description: '',
    notes: '',
  });

  const handleCreateScenario = async () => {
    if (!newScenario.name.trim() || !user) return;
    
    await createScenario.mutateAsync({
      name: newScenario.name,
      age: newScenario.age ? parseInt(newScenario.age) : null,
      gender: newScenario.gender || null,
      condition_description: newScenario.condition_description || null,
      notes: newScenario.notes || null,
      created_by: user.id,
    });
    
    setNewScenario({ name: '', age: '', gender: '', condition_description: '', notes: '' });
    setIsDialogOpen(false);
  };

  const handleDeleteScenario = async (id: string) => {
    await deleteScenario.mutateAsync(id);
    if (selectedScenarioId === id) {
      onScenarioSelect(null);
    }
  };

  const selectedScenario = scenarios?.find(s => s.id === selectedScenarioId);

  if (isLoading) {
    return <div className="h-20 flex items-center justify-center text-muted-foreground">Loading scenarios...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Patient Scenario</Label>
        {isExaminer && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Scenario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Patient Scenario</DialogTitle>
                <DialogDescription>
                  Define a new patient case with specific conditions and sounds.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Scenario Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Pneumonia Patient A"
                    value={newScenario.name}
                    onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="45"
                      value={newScenario.age}
                      onChange={(e) => setNewScenario({ ...newScenario, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={newScenario.gender}
                      onValueChange={(value) => setNewScenario({ ...newScenario, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition Description</Label>
                  <Textarea
                    id="condition"
                    placeholder="Describe the patient's condition..."
                    value={newScenario.condition_description}
                    onChange={(e) => setNewScenario({ ...newScenario, condition_description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes for examiners..."
                    value={newScenario.notes}
                    onChange={(e) => setNewScenario({ ...newScenario, notes: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleCreateScenario}
                  disabled={!newScenario.name.trim() || createScenario.isPending}
                  className="w-full"
                >
                  {createScenario.isPending ? 'Creating...' : 'Create Scenario'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Select
        value={selectedScenarioId || ''}
        onValueChange={(value) => onScenarioSelect(value || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a patient scenario" />
        </SelectTrigger>
        <SelectContent>
          {scenarios?.map((scenario) => (
            <SelectItem key={scenario.id} value={scenario.id}>
              {scenario.name}
              {scenario.age && ` (${scenario.age}y)`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedScenario && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">{selectedScenario.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedScenario.age && `Age: ${selectedScenario.age}`}
                  {selectedScenario.gender && ` • ${selectedScenario.gender}`}
                </p>
                {selectedScenario.condition_description && (
                  <p className="text-sm mt-2">{selectedScenario.condition_description}</p>
                )}
              </div>
              {isExaminer && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{selectedScenario.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteScenario(selectedScenario.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
