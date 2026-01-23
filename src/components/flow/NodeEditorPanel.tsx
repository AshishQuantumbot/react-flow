import { useEffect, useState } from "react";
import { X, Trash2, Sparkles, Globe } from "lucide-react";
import { useFlowStore, FlowNodeData } from "@/store/flowStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          (n) => n.type === "question" && n.id !== selectedNodeId,
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
    end: "CTA Node",
    subflow: "SubFlow Container",
  };

  const nodeTypeIcons: Record<string, React.ReactNode> = {
    ai: <Sparkles className="w-4 h-4 text-node-ai" />,
    api: <Globe className="w-4 h-4 text-node-api" />,
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

        {/* Weight/Score field for all nodes */}
        {selectedNode.type === "question" && (
          <>
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
            <div className="space-y-2">
              <Label htmlFor="weight">Weight/Score</Label>
              <Input
                id="weight"
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
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                value={formData.priority ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^-?\d+$/.test(value)) {
                    updateField(
                      "priority",
                      value === "" ? undefined : parseInt(value),
                    );
                  }
                }}
                placeholder="Enter integer value"
                min={Number.MIN_SAFE_INTEGER}
                max={Number.MAX_SAFE_INTEGER}
              />
            
            </div>
          </>
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
