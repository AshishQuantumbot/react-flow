import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { UserCheck } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const HandoffNode = memo(function HandoffNode(props: NodeProps<FlowNode>) {
  const { data } = props;
  
  return (
    <BaseNode
      {...props}
      icon={<UserCheck className="w-4 h-4 text-node-handoff" />}
      colorClass="border-node-handoff/50"
      glowClass="node-glow-handoff"
    >
      {data.handoffConfig?.department ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-muted-foreground">
            Dept: {data.handoffConfig.department}
          </p>
          {data.handoffConfig.priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              data.handoffConfig.priority === 'high' ? 'bg-destructive/20 text-destructive' :
              data.handoffConfig.priority === 'medium' ? 'bg-node-condition/20 text-node-condition' :
              'bg-muted text-muted-foreground'
            }`}>
              {data.handoffConfig.priority} priority
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 mt-2 italic">
          Configure handoff...
        </p>
      )}
    </BaseNode>
  );
});
