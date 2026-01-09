import { memo } from 'react';
import { NodeProps, Handle, Position, Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const ConditionNode = memo(function ConditionNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-lg border-2 transition-all duration-200',
        'bg-card shadow-lg',
        'border-node-condition/50',
        selected && 'node-glow-condition scale-105 border-opacity-100'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-card !border-2"
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md bg-node-condition/20">
            <GitBranch className="w-4 h-4 text-node-condition" />
          </div>
          <span className="font-semibold text-sm text-foreground">{data.label}</span>
        </div>
        
        {data.conditions ? (
          <div className="text-xs space-y-1">
            <p className="text-muted-foreground">
              If <span className="text-node-condition font-medium">{data.conditions.variable}</span>
            </p>
            <p className="text-muted-foreground">
              {data.conditions.operator} "{data.conditions.value}"
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Click to configure</p>
        )}
        
        <div className="flex justify-between mt-3 text-[10px] font-medium">
          <span className="text-node-start">TRUE</span>
          <span className="text-node-end">FALSE</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '25%' }}
        className="!bg-node-start !border-2 !border-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '75%' }}
        className="!bg-node-end !border-2 !border-card"
      />
    </div>
  );
});
