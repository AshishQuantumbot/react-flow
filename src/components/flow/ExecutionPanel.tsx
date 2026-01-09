import { useFlowStore } from '@/store/flowStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { Send, Variable, History, AlertCircle } from 'lucide-react';

export function ExecutionPanel() {
  const { nodes, execution, updateContext, stepExecution } = useFlowStore();
  const [userInput, setUserInput] = useState('');
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  const currentNode = nodes.find(n => n.id === execution.currentNodeId);

  const handleSendInput = () => {
    if (!userInput.trim()) return;
    updateContext({
      userInput,
      variables: {
        ...execution.context.variables,
        user_input: userInput,
      },
    });
    setUserInput('');
    stepExecution();
  };

  const handleAddVariable = () => {
    if (!newVarKey.trim()) return;
    updateContext({
      variables: {
        ...execution.context.variables,
        [newVarKey]: newVarValue,
      },
    });
    setNewVarKey('');
    setNewVarValue('');
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 w-80 glass-panel rounded-lg shadow-xl">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-node-start animate-pulse" />
          <h3 className="font-semibold text-sm text-foreground">Execution Preview</h3>
        </div>
        {currentNode && (
          <p className="text-xs text-muted-foreground mt-1">
            Current: <span className="text-primary">{currentNode.data.label}</span>
          </p>
        )}
      </div>

      <ScrollArea className="h-64">
        <div className="p-3 space-y-4">
          {/* User Input */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Send className="w-3 h-3" />
              Simulate User Input
            </Label>
            <div className="flex gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type a message..."
                className="text-xs h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
              />
              <Button size="sm" className="h-8" onClick={handleSendInput}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Context Variables */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Variable className="w-3 h-3" />
              Context Variables
            </Label>
            <div className="space-y-1">
              {Object.entries(execution.context.variables).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs bg-secondary/30 rounded px-2 py-1">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="text-foreground font-mono">{String(value)}</span>
                </div>
              ))}
              {Object.keys(execution.context.variables).length === 0 && (
                <p className="text-xs text-muted-foreground italic">No variables set</p>
              )}
            </div>
            <div className="flex gap-1 mt-2">
              <Input
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                placeholder="key"
                className="text-xs h-7 flex-1"
              />
              <Input
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                placeholder="value"
                className="text-xs h-7 flex-1"
              />
              <Button size="sm" variant="secondary" className="h-7 px-2" onClick={handleAddVariable}>
                +
              </Button>
            </div>
          </div>

          {/* Execution History */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <History className="w-3 h-3" />
              Execution Path
            </Label>
            <div className="flex flex-wrap gap-1">
              {execution.executionHistory.map((nodeId, index) => {
                const node = nodes.find(n => n.id === nodeId);
                const isCurrent = nodeId === execution.currentNodeId;
                return (
                  <span
                    key={`${nodeId}-${index}`}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isCurrent 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {node?.data.label || nodeId}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Error Display */}
          {execution.error && (
            <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{execution.error}</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
