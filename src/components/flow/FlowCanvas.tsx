import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Node,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore, NodeType, FlowNodeData } from '@/store/flowStore';
import { StartNode } from './nodes/StartNode';
import { QuestionNode } from './nodes/QuestionNode';
import { AnswerNode } from './nodes/AnswerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ApiNode } from './nodes/ApiNode';
import { EndNode } from './nodes/EndNode';
import { AIPromptNode } from './nodes/AIPromptNode';
import { FallbackNode } from './nodes/FallbackNode';
import { DelayNode } from './nodes/DelayNode';
import { HandoffNode } from './nodes/HandoffNode';
import { NodeToolbar } from './NodeToolbar';
import { NodeEditorPanel } from './NodeEditorPanel';
import { FlowHeader } from './FlowHeader';
import { ExecutionPanel } from './ExecutionPanel';
import { cn } from '@/lib/utils';

const nodeTypes: NodeTypes = {
  start: StartNode,
  question: QuestionNode,
  answer: AnswerNode,
  condition: ConditionNode,
  api: ApiNode,
  end: EndNode,
  ai: AIPromptNode,
  fallback: FallbackNode,
  delay: DelayNode,
  handoff: HandoffNode,
};

export function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    execution,
  } = useFlowStore();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = {
        x: event.clientX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0) - 90,
        y: event.clientY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0) - 25,
      };

      addNode(type, position);
    },
    [addNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<FlowNodeData>) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Enhance nodes with execution state styling
  const enhancedNodes = nodes.map(node => ({
    ...node,
    className: cn(
      execution.currentNodeId === node.id && 'node-active-glow',
      execution.executionHistory.includes(node.id) && execution.currentNodeId !== node.id && 'opacity-60'
    ),
  }));

  return (
    <div ref={reactFlowWrapper} className="w-full h-screen relative">
      <ReactFlow
        nodes={enhancedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--muted-foreground) / 0.2)"
        />
        <Controls className="!bottom-4 !left-4" />
        <MiniMap
          className="!bottom-4 !right-4"
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              start: 'hsl(142, 71%, 45%)',
              question: 'hsl(217, 91%, 60%)',
              answer: 'hsl(262, 83%, 58%)',
              condition: 'hsl(38, 92%, 50%)',
              api: 'hsl(174, 84%, 45%)',
              end: 'hsl(0, 72%, 51%)',
              ai: 'hsl(280, 85%, 60%)',
              fallback: 'hsl(25, 95%, 55%)',
              delay: 'hsl(200, 70%, 55%)',
              handoff: 'hsl(330, 80%, 60%)',
            };
            return colors[node.type || 'start'] || 'hsl(var(--muted))';
          }}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>

      <FlowHeader />
      
      <div className="absolute top-20 left-4 z-10">
        <NodeToolbar />
      </div>

      {execution.isRunning && <ExecutionPanel />}

      <NodeEditorPanel />
    </div>
  );
}
