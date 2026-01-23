import { memo } from "react";
import { NodeProps, Node, NodeResizer } from "@xyflow/react";
import { FlowNodeData } from "@/store/flowStore";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

type FlowNode = Node<FlowNodeData>;

export const SubFlowNode = memo(function SubFlowNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  return (
    <>
      <NodeResizer
        color="#8b5cf6"
        isVisible={selected}
        minWidth={600}
        minHeight={500}
      />
      <div
        className={cn(
          "w-full h-full rounded-lg border-2 border-dashed transition-all duration-200",
          "bg-card/5 backdrop-blur-sm", // Very transparent background
          selected 
            ? "border-node-subflow border-opacity-60 shadow-lg shadow-node-subflow/10" 
            : "border-node-subflow/20", // Very subtle border
          "relative"
        )}
      >
        {/* Header */}
        <div className="absolute -top-8 left-2 flex items-center gap-2 px-3 py-1 rounded-t-lg bg-card border-2 border-b-0 border-node-subflow/50">
          <Package className="w-4 h-4 text-node-subflow" />
          <span className="text-sm font-semibold text-foreground">
            {data.label}
          </span>
        </div>
        
        {/* Content area for child nodes */}
        <div className="p-4 h-full">
          <div className="text-xs text-muted-foreground text-center mt-8 opacity-30">
            Question nodes will be placed here
          </div>
        </div>
      </div>
    </>
  );
});