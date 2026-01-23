import { memo, ReactNode } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {FlowNodeData } from "@/store/flowStore";

type FlowNode = Node<FlowNodeData>;

interface BaseNodeProps extends NodeProps<FlowNode> {
  icon: ReactNode;
  colorClass: string;
  glowClass: string;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  children?: ReactNode;
}

export const BaseNode = memo(function BaseNode({
  data,
  selected,
  icon,
  colorClass,
  glowClass,
  showSourceHandle = true,
  showTargetHandle = true,
  children,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "min-w-[180px] rounded-lg border-2 transition-all duration-200",
        "bg-card shadow-lg",
        selected && glowClass,
        selected ? "border-opacity-100 scale-105" : "border-opacity-50",
        colorClass,
      )}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-card !border-2"
        />
      )}

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={cn(
              "p-1.5 rounded-md",
              colorClass.replace("border-", "bg-").replace("/50", "/20"),
            )}
          >
            {icon}
          </div>
          <span className="font-semibold text-sm text-foreground">
            {data.label}
          </span>
        </div>

        {data.text && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-sm text-foreground">Text: </span>
            {data.label}
          </div>
        )}

        {/* Display additional data for question nodes */}
        {data.required && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-sm text-foreground">
              Required:{" "}
            </span>
            {data.required === "yes" ? "YES" : "No"}
          </div>
        )}

        {data.weight !== undefined && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-sm text-foreground">
              Weight:{" "}
            </span>
            {data.weight}
          </div>
        )}

          {data.priority && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-sm text-foreground">
              Priority:{" "}
            </span>
            {data.priority}
          </div>
        )}

        {data.meetingType && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-sm text-foreground">Type: </span>
            {data.meetingType
              .replace("-", " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </div>
        )}

        {data.threshold !== undefined && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-sm text-foreground">
              Threshold:{" "}
            </span>
            {data.threshold}
          </div>
        )}

        {children}
      </div>

      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-card !border-2"
        />
      )}
    </div>
  );
});
