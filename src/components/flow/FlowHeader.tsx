import { useState, useEffect } from 'react';
import { Download, Upload, CheckCircle, Bot, Sun, Moon, Play, Pause, Square, StepForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowStore } from '@/store/flowStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function FlowHeader() {
  const { 
    exportFlow, 
    importFlow, 
    validateFlow,
    execution,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    stepExecution,
  } = useFlowStore();
  const { toast } = useToast();
  const [importJson, setImportJson] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const handleExport = () => {
    const json = exportFlow();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chatbot-flow.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Flow Exported',
      description: 'Your chatbot flow has been downloaded.',
    });
  };

  const handleImport = () => {
    const success = importFlow(importJson);
    if (success) {
      toast({
        title: 'Flow Imported',
        description: 'Your chatbot flow has been loaded successfully.',
      });
      setIsImportOpen(false);
      setImportJson('');
    } else {
      toast({
        title: 'Import Failed',
        description: 'Invalid JSON format. Please check your file.',
        variant: 'destructive',
      });
    }
  };

  const handleValidate = () => {
    const { valid, errors } = validateFlow();
    if (valid) {
      toast({
        title: 'Flow Valid',
        description: 'Your chatbot flow is ready to run!',
      });
    } else {
      toast({
        title: 'Validation Errors',
        description: errors.join('\n'),
        variant: 'destructive',
      });
    }
  };

  const handleRun = () => {
    const { valid, errors } = validateFlow();
    if (!valid) {
      toast({
        title: 'Cannot Run Flow',
        description: errors[0],
        variant: 'destructive',
      });
      return;
    }
    startExecution();
    toast({
      title: 'Flow Started',
      description: 'Use Step or Resume to navigate through the flow.',
    });
  };

  const handleStep = async () => {
    await stepExecution();
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass-panel rounded-full px-6 py-3 flex items-center gap-4 shadow-lg">
      <div className="flex items-center gap-2 pr-4 border-r border-border">
        <div className="p-2 rounded-lg bg-primary/20">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-foreground">AI Flow Editor</h1>
          <p className="text-xs text-muted-foreground">Visual Chatbot Builder</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleValidate} className="gap-2">
          <CheckCircle className="w-4 h-4" />
          Validate
        </Button>

        {/* Run Controls */}
        <div className="flex items-center gap-1 px-2 border-l border-r border-border">
          {!execution.isRunning ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRun} 
              className="gap-2 text-node-start hover:text-node-start"
            >
              <Play className="w-4 h-4" />
              Run
            </Button>
          ) : (
            <>
              {execution.isPaused ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resumeExecution}
                  className="gap-1"
                >
                  <Play className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={pauseExecution}
                  className="gap-1"
                >
                  <Pause className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleStep}
                className="gap-1"
              >
                <StepForward className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={stopExecution}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <Square className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
        
        <Button variant="ghost" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>

        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Flow</DialogTitle>
              <DialogDescription>
                Paste your chatbot flow JSON below to import it.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste JSON here..."
              rows={10}
              className="font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport}>Import</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="pl-2 border-l border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4" />
                Light
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Dark
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
