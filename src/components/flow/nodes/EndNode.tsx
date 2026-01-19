import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { Square } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const EndNode = memo(function EndNode(props: NodeProps<FlowNode>) {
  return (
    <BaseNode
      {...props}
      icon={<Square className="w-4 h-4 text-node-end" />}
      colorClass="border-node-end/50"
      glowClass="node-glow-end"
      showSourceHandle={false}
    >
      <p className="text-xs text-muted-foreground">CTA conversation</p>
    </BaseNode>
  );
});
