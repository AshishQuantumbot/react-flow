import { ReactFlowProvider } from '@xyflow/react';
import { FlowCanvas } from '@/components/flow/FlowCanvas';

const Index = () => {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
};

export default Index;
