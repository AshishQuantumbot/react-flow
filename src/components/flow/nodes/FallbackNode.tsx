import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { ShieldAlert } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const FallbackNode = memo(function FallbackNode(props: NodeProps<FlowNode>) {
  const { data } = props;
  
  return (
    <BaseNode
      {...props}
      icon={<ShieldAlert className="w-4 h-4 text-node-fallback" />}
      colorClass="border-node-fallback/50"
      glowClass="node-glow-fallback"
    >
      {data.fallbackConfig?.fallbackMessage ? (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {data.fallbackConfig.fallbackMessage}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/60 mt-2 italic">
          Configure fallback...
        </p>
      )}
      {data.fallbackConfig?.maxRetries && (
        <p className="text-xs text-node-fallback mt-1">
          Max retries: {data.fallbackConfig.maxRetries}
        </p>
      )}
    </BaseNode>
  );
});
