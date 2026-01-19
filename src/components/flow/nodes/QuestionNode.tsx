import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { MessageCircleQuestion } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const QuestionNode = memo(function QuestionNode(props: NodeProps<FlowNode>) {
  const { data } = props;
  return (
    <BaseNode
      {...props}
      icon={<MessageCircleQuestion className="w-4 h-4 text-node-question" />}
      colorClass="border-node-question/50"
      glowClass="node-glow-question"
    >
      <p className="text-xs text-muted-foreground italic">Click to configure</p>
      {/* {data.label && data.label !== "Question" ? (
        <p className="text-xs text-muted-foreground line-clamp-2">{data.label}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Click to configure</p>
      )} */}
    </BaseNode>
  );
});
