import { useEffect, useState } from "react";
import {
  X,
  Trash2,
  Sparkles,
  Globe,
  Timer,
  ShieldAlert,
  UserCheck,
  GitBranch,
} from "lucide-react";
import { useFlowStore, FlowNodeData } from "@/store/flowStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const meetingTypes = [
  { value: "meeting-schedule", label: "Meeting Schedule" },
  { value: "site-visit", label: "Site Visit" },
  { value: "demo-booking", label: "Demo Booking" },
];

export function NodeEditorPanel() {
  const {
    nodes,
    selectedNodeId,
    isPanelOpen,
    setPanelOpen,
    updateNodeData,
    deleteNode,
  } = useFlowStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const [formData, setFormData] = useState<Partial<FlowNodeData>>({});

  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data);
    }
  }, [selectedNode]);

  if (!isPanelOpen || !selectedNode) return null;

  const handleSave = () => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, formData);
    }
  };

  const handleDelete = () => {
    if (selectedNodeId && selectedNode.type !== "start") {
      // Check if deleting this question node would also delete end nodes
      if (selectedNode.type === "question") {
        const remainingQuestionNodes = nodes.filter(
          (n) => n.type === "question" && n.id !== selectedNodeId
        );
        const endNodes = nodes.filter((n) => n.type === "end");
        
        if (remainingQuestionNodes.length === 0 && endNodes.length > 0) {
          // Show confirmation or just proceed - the store will handle the cascading delete
        }
      }
      
      deleteNode(selectedNodeId);
    }
  };

  const updateField = (field: keyof FlowNodeData, value: unknown) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    // Auto-save the data immediately
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, newFormData);
    }
  };

  const nodeTypeLabels: Record<string, string> = {
    start: "Start Node",
    question: "Question Node",
    answer: "Answer Node",
    condition: "Condition Node",
    api: "API Node",
    end: "CTA Node",
    ai: "AI Prompt Node",
    fallback: "Fallback Node",
    delay: "Delay Node",
    handoff: "Human Handoff Node",
  };

  const nodeTypeIcons: Record<string, React.ReactNode> = {
    ai: <Sparkles className="w-4 h-4 text-node-ai" />,
    api: <Globe className="w-4 h-4 text-node-api" />,
    delay: <Timer className="w-4 h-4 text-node-delay" />,
    fallback: <ShieldAlert className="w-4 h-4 text-node-fallback" />,
    handoff: <UserCheck className="w-4 h-4 text-node-handoff" />,
    condition: <GitBranch className="w-4 h-4 text-node-condition" />,
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-96 glass-panel z-50",
        "animate-slide-in-right shadow-2xl",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {nodeTypeIcons[selectedNode.type || ""] || null}
          <div>
            <h2 className="font-semibold text-foreground">
              {nodeTypeLabels[selectedNode.type || "start"]}
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure node properties
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setPanelOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-140px)]">
        {/* Label field for all nodes */}
        {["question", "start"].includes(selectedNode.type || "") && (
          <div className="space-y-2">
            <Label htmlFor="label">text</Label>
            <Input
              id="label"
              value={formData.label || ""}
              onChange={(e) => updateField("label", e.target.value)}
              placeholder="Enter text"
            />
          </div>
        )}

        {/* Channel Selection (for applicable nodes) */}
        {["question", "answer", "ai"].includes(selectedNode.type || "") && (
          <div className="space-y-2">
            <Label htmlFor="required">Required</Label>
            <Select
              value={formData.required || "yes"}
              onValueChange={(value) => updateField("required", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">YES</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Meeting Type field for all nodes */}
        {selectedNode.type === "end" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="meetingType">Type</Label>
              <Select
                value={formData.meetingType || meetingTypes[0].value}
                onValueChange={(value) => updateField("meetingType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Threshold field for all nodes */}
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold</Label>
              <Input
                id="threshold"
                type="number"
                value={formData.threshold ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string, negative sign, or complete integers (positive/negative)
                  if (value === "" || value === "-" || /^-?\d+$/.test(value)) {
                    updateField(
                      "threshold",
                      value === "" || value === "-"
                        ? undefined
                        : parseInt(value),
                    );
                  }
                }}
                placeholder="Enter threshold value"
                step="1"
              />
            </div>
          </>
        )}

        {/* Weight/Score field for all nodes */}
        {selectedNode.type === "question" && (
          <div className="space-y-2">
            <Label htmlFor="weight">Weight/Score</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^-?\d+$/.test(value)) {
                  updateField(
                    "weight",
                    value === "" ? undefined : parseInt(value),
                  );
                }
              }}
              placeholder="Enter integer value"
              min={Number.MIN_SAFE_INTEGER}
              max={Number.MAX_SAFE_INTEGER}
            />
          </div>
        )}

        {/* Question Node Fields */}
        {/* {selectedNode.type === 'question' && (
          <div className="space-y-2">
            <Label htmlFor="question">User Question / Intent</Label>
            <Textarea
              id="question"
              value={formData.question || ''}
              onChange={(e) => updateField('question', e.target.value)}
              placeholder="What the user might ask..."
              rows={3}
            />
          </div>
        )} */}

        {/* Answer Node Fields */}
        {selectedNode.type === "answer" && (
          <Tabs defaultValue="static" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="static" className="flex-1">
                Static
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1">
                <Sparkles className="w-3 h-3 mr-1" /> AI
              </TabsTrigger>
            </TabsList>
            <TabsContent value="static" className="space-y-2 mt-4">
              <Label htmlFor="answer">Bot Response</Label>
              <Textarea
                id="answer"
                value={formData.answer || ""}
                onChange={(e) => updateField("answer", e.target.value)}
                placeholder="Type the bot's response..."
                rows={4}
              />
            </TabsContent>
            <TabsContent value="ai" className="space-y-2 mt-4">
              <Label htmlFor="aiPrompt">AI Prompt</Label>
              <Textarea
                id="aiPrompt"
                value={formData.aiPrompt || ""}
                onChange={(e) => updateField("aiPrompt", e.target.value)}
                placeholder="Describe how AI should respond..."
                rows={4}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* AI Prompt Node Fields */}
        {selectedNode.type === "ai" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt || ""}
                onChange={(e) => updateField("systemPrompt", e.target.value)}
                placeholder="You are a helpful assistant..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aiPrompt">User Prompt Template</Label>
              <Textarea
                id="aiPrompt"
                value={formData.aiPrompt || ""}
                onChange={(e) => updateField("aiPrompt", e.target.value)}
                placeholder="Use {{variable}} for context injection..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{variableName}}"} to inject context variables
              </p>
            </div>
          </div>
        )}

        {/* Condition Node Fields */}
        {selectedNode.type === "condition" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variable">Variable to Check</Label>
              <Input
                id="variable"
                value={formData.conditions?.variable || ""}
                onChange={(e) =>
                  updateField("conditions", {
                    ...formData.conditions,
                    variable: e.target.value,
                  })
                }
                placeholder="e.g., user_input, intent, confidence"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator">Operator</Label>
              <Select
                value={formData.conditions?.operator || "equals"}
                onValueChange={(value) =>
                  updateField("conditions", {
                    ...formData.conditions,
                    operator: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="greater">Greater than</SelectItem>
                  <SelectItem value="less">Less than</SelectItem>
                  <SelectItem value="exists">Exists</SelectItem>
                  <SelectItem value="intent">Intent Match</SelectItem>
                  <SelectItem value="confidence">Confidence ≥</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.conditions?.value || ""}
                onChange={(e) =>
                  updateField("conditions", {
                    ...formData.conditions,
                    value: e.target.value,
                  })
                }
                placeholder="Value to compare"
              />
            </div>
          </div>
        )}

        {/* API Node Fields */}
        {selectedNode.type === "api" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={formData.apiConfig?.method || "GET"}
                onValueChange={(value) =>
                  updateField("apiConfig", {
                    ...formData.apiConfig,
                    method: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">API URL</Label>
              <Input
                id="url"
                value={formData.apiConfig?.url || ""}
                onChange={(e) =>
                  updateField("apiConfig", {
                    ...formData.apiConfig,
                    url: e.target.value,
                  })
                }
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Request Body (JSON)</Label>
              <Textarea
                id="body"
                value={formData.apiConfig?.body || ""}
                onChange={(e) =>
                  updateField("apiConfig", {
                    ...formData.apiConfig,
                    body: e.target.value,
                  })
                }
                placeholder='{"key": "value"}'
                rows={3}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="retryCount">Retry Count</Label>
                <Input
                  id="retryCount"
                  type="number"
                  min={0}
                  max={5}
                  value={formData.apiConfig?.retryCount || 0}
                  onChange={(e) =>
                    updateField("apiConfig", {
                      ...formData.apiConfig,
                      retryCount: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retryDelay">Retry Delay (ms)</Label>
                <Input
                  id="retryDelay"
                  type="number"
                  min={0}
                  value={formData.apiConfig?.retryDelay || 1000}
                  onChange={(e) =>
                    updateField("apiConfig", {
                      ...formData.apiConfig,
                      retryDelay: parseInt(e.target.value) || 1000,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="responseMapping">Response Mapping</Label>
              <Input
                id="responseMapping"
                value={formData.apiConfig?.responseMapping || ""}
                onChange={(e) =>
                  updateField("apiConfig", {
                    ...formData.apiConfig,
                    responseMapping: e.target.value,
                  })
                }
                placeholder="data.result.message"
              />
            </div>
          </div>
        )}

        {/* Delay Node Fields */}
        {selectedNode.type === "delay" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={formData.delayConfig?.duration || 5}
                  onChange={(e) =>
                    updateField("delayConfig", {
                      ...formData.delayConfig,
                      duration: parseInt(e.target.value) || 5,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.delayConfig?.unit || "seconds"}
                  onValueChange={(value) =>
                    updateField("delayConfig", {
                      ...formData.delayConfig,
                      unit: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Node Fields */}
        {selectedNode.type === "fallback" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fallbackMessage">Fallback Message</Label>
              <Textarea
                id="fallbackMessage"
                value={formData.fallbackConfig?.fallbackMessage || ""}
                onChange={(e) =>
                  updateField("fallbackConfig", {
                    ...formData.fallbackConfig,
                    fallbackMessage: e.target.value,
                  })
                }
                placeholder="Sorry, I didn't understand that..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min={1}
                max={10}
                value={formData.fallbackConfig?.maxRetries || 3}
                onChange={(e) =>
                  updateField("fallbackConfig", {
                    ...formData.fallbackConfig,
                    maxRetries: parseInt(e.target.value) || 3,
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Handoff Node Fields */}
        {selectedNode.type === "handoff" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.handoffConfig?.department || ""}
                onChange={(e) =>
                  updateField("handoffConfig", {
                    ...formData.handoffConfig,
                    department: e.target.value,
                  })
                }
                placeholder="Sales, Support, Billing..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.handoffConfig?.priority || "medium"}
                onValueChange={(value) =>
                  updateField("handoffConfig", {
                    ...formData.handoffConfig,
                    priority: value as "low" | "medium" | "high",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="handoffMessage">Handoff Message</Label>
              <Textarea
                id="handoffMessage"
                value={formData.handoffConfig?.message || ""}
                onChange={(e) =>
                  updateField("handoffConfig", {
                    ...formData.handoffConfig,
                    message: e.target.value,
                  })
                }
                placeholder="Please wait while we connect you..."
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
          {selectedNode.type !== "start" && (
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
