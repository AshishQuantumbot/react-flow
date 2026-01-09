import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { Timer } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const DelayNode = memo(function DelayNode(props: NodeProps<FlowNode>) {
  const { data } = props;
  
  return (
    <BaseNode
      {...props}
      icon={<Timer className="w-4 h-4 text-node-delay" />}
      colorClass="border-node-delay/50"
      glowClass="node-glow-delay"
    >
      {data.delayConfig ? (
        <p className="text-xs text-muted-foreground mt-2">
          Wait {data.delayConfig.duration} {data.delayConfig.unit}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/60 mt-2 italic">
          Configure delay...
        </p>
      )}
    </BaseNode>
  );
});
