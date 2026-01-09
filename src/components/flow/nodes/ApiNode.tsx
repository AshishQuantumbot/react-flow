import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { Globe } from 'lucide-react';
import { BaseNode } from '../BaseNode';
import { FlowNodeData } from '@/store/flowStore';

type FlowNode = Node<FlowNodeData>;

export const ApiNode = memo(function ApiNode(props: NodeProps<FlowNode>) {
  const { data } = props;
  
  return (
    <BaseNode
      {...props}
      icon={<Globe className="w-4 h-4 text-node-api" />}
      colorClass="border-node-api/50"
      glowClass="node-glow-api"
    >
      {data.apiConfig?.url ? (
        <div className="text-xs space-y-0.5">
          <p className="text-node-api font-medium">{data.apiConfig.method || 'GET'}</p>
          <p className="text-muted-foreground line-clamp-1">{data.apiConfig.url}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Click to configure</p>
      )}
    </BaseNode>
  );
});
