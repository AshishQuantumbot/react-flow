import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const AnswerNode = memo(function AnswerNode(props: NodeProps<FlowNode>) {
  const { data } = props;
  const hasAI = !!data.aiPrompt;
  
  return (
    <BaseNode
      {...props}
      icon={
        hasAI ? (
          <Sparkles className="w-4 h-4 text-node-answer" />
        ) : (
          <MessageSquare className="w-4 h-4 text-node-answer" />
        )
      }
      colorClass="border-node-answer/50"
      glowClass="node-glow-answer"
    >
      {data.answer ? (
        <p className="text-xs text-muted-foreground line-clamp-2">{data.answer}</p>
      ) : hasAI ? (
        <p className="text-xs text-node-answer flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI Generated
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Click to configure</p>
      )}
    </BaseNode>
  );
});
