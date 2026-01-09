import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { Play } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const StartNode = memo(function StartNode(props: NodeProps<FlowNode>) {
  return (
    <BaseNode
      {...props}
      icon={<Play className="w-4 h-4 text-node-start" />}
      colorClass="border-node-start/50"
      glowClass="node-glow-start"
      showTargetHandle={false}
    >
      <p className="text-xs text-muted-foreground">Entry point</p>
    </BaseNode>
  );
});
