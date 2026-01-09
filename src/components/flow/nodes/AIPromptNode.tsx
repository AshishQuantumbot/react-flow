import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const AIPromptNode = memo(function AIPromptNode(props: NodeProps<FlowNode>) {
  const { data } = props;
  
  return (
    <BaseNode
      {...props}
      icon={<Sparkles className="w-4 h-4 text-node-ai" />}
      colorClass="border-node-ai/50"
      glowClass="node-glow-ai"
    >
      {data.aiPrompt ? (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {data.aiPrompt}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/60 mt-2 italic">
          Configure AI prompt...
        </p>
      )}
    </BaseNode>
  );
});
