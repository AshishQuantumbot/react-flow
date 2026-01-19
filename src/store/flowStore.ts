import { create } from "zustand";
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";

export type NodeType =
  | "start"
  | "question"
  | "answer"
  | "condition"
  | "api"
  | "end"
  | "ai"
  | "fallback"
  | "delay"
  | "handoff";

export type MeetingType = "meeting-schedule" | "site-visit" | "demo-booking";

export interface FlowNodeData {
  label: string;
  weight?: number;
  threshold?: number;
  meetingType?: MeetingType;
  question?: string;
  answer?: string;
  aiPrompt?: string;
  systemPrompt?: string;
  apiConfig?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    responseMapping?: string;
    retryCount?: number;
    retryDelay?: number;
  };
  conditions?: {
    variable: string;
    operator:
      | "equals"
      | "contains"
      | "greater"
      | "less"
      | "exists"
      | "intent"
      | "confidence";
    value: string;
    trueNodeId?: string;
    falseNodeId?: string;
  };
  delayConfig?: {
    duration: number;
    unit: "seconds" | "minutes" | "hours";
  };
  handoffConfig?: {
    department?: string;
    priority?: "low" | "medium" | "high";
    message?: string;
  };
  fallbackConfig?: {
    maxRetries?: number;
    fallbackMessage?: string;
  };
  contextOperations?: {
    read?: string[];
    write?: { key: string; value: string }[];
  };
  channel?: "all" | "web" | "whatsapp" | "telegram" | "facebook";
  required?: string;
  [key: string]: unknown;
}

export interface FlowContext {
  variables: Record<string, unknown>;
  sessionMemory: Record<string, unknown>;
  userInput?: string;
  lastResponse?: string;
  currentIntent?: string;
  intentConfidence?: number;
  channel?: string;
}

interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  executionHistory: string[];
  context: FlowContext;
  error?: string;
}

interface FlowState {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  isPanelOpen: boolean;
  execution: ExecutionState;

  // Actions
  setNodes: (nodes: Node<FlowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<Node<FlowNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  exportFlow: () => string;
  importFlow: (json: string) => boolean;
  validateFlow: () => { valid: boolean; errors: string[] };

  // Execution actions
  startExecution: () => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => void;
  stepExecution: () => Promise<void>;
  setCurrentNode: (nodeId: string | null) => void;
  updateContext: (updates: Partial<FlowContext>) => void;
  setExecutionError: (error: string | null) => void;
}

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 250, y: 50 },
    data: { label: "Start" },
  },
];

const initialExecutionState: ExecutionState = {
  isRunning: false,
  isPaused: false,
  currentNodeId: null,
  executionHistory: [],
  context: {
    variables: {},
    sessionMemory: {},
  },
};

const generateId = () =>
  `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  selectedNodeId: null,
  isPanelOpen: false,
  execution: initialExecutionState,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<FlowNodeData>[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { strokeWidth: 2 },
        },
        get().edges,
      ),
    });
  },

  addNode: (type, position) => {
    const { nodes } = get();

    if (type === "start" && nodes.some((n) => n.type === "start")) {
      return;
    }

    const labels: Record<NodeType, string> = {
      start: "Start",
      question: "Question",
      answer: "Answer",
      condition: "Condition",
      api: "API Call",
      end: "CTA",
      ai: "AI Prompt",
      fallback: "Fallback",
      delay: "Delay",
      handoff: "Human Handoff",
    };

    const newNode: Node<FlowNodeData> = {
      id: generateId(),
      type,
      position,
      data: { label: labels[type] },
    };

    set({ nodes: [...nodes, newNode] });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node,
      ),
    });
  },

  deleteNode: (nodeId) => {
    const { nodes, edges } = get();
    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: null,
      isPanelOpen: false,
    });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, isPanelOpen: !!nodeId });
  },

  setPanelOpen: (open) => {
    set({
      isPanelOpen: open,
      selectedNodeId: open ? get().selectedNodeId : null,
    });
  },

  exportFlow: () => {
    const { nodes, edges } = get();
    return JSON.stringify({ nodes, edges, version: "2.0" }, null, 2);
  },

  importFlow: (json) => {
    try {
      const { nodes, edges } = JSON.parse(json);
      if (Array.isArray(nodes) && Array.isArray(edges)) {
        set({ nodes, edges, selectedNodeId: null, isPanelOpen: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  validateFlow: () => {
    const { nodes, edges } = get();
    const errors: string[] = [];

    // Check for start node
    const startNodes = nodes.filter((n) => n.type === "start");
    if (startNodes.length === 0) {
      errors.push("Flow must have a Start node");
    } else if (startNodes.length > 1) {
      errors.push("Flow can only have one Start node");
    }

    // Check for end node
    const endNodes = nodes.filter((n) => n.type === "end");
    if (endNodes.length === 0) {
      errors.push("Flow must have at least one End node");
    }

    // Check for unconnected nodes
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    nodes.forEach((node) => {
      if (node.type !== "start" && !connectedNodeIds.has(node.id)) {
        errors.push(`Node "${node.data.label}" is not connected`);
      }
    });

    // Check if start has outgoing connection
    if (startNodes.length > 0) {
      const startHasConnection = edges.some(
        (e) => e.source === startNodes[0].id,
      );
      if (!startHasConnection) {
        errors.push("Start node must have an outgoing connection");
      }
    }

    // Check for infinite loops
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCycle(edge.target)) return true;
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    if (startNodes.length > 0 && hasCycle(startNodes[0].id)) {
      errors.push("Flow contains an infinite loop");
    }

    // Check condition nodes have both outputs
    const conditionNodes = nodes.filter((n) => n.type === "condition");
    conditionNodes.forEach((node) => {
      const outEdges = edges.filter((e) => e.source === node.id);
      if (outEdges.length < 2) {
        errors.push(
          `Condition node "${node.data.label}" needs both TRUE and FALSE paths`,
        );
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // Execution actions
  startExecution: () => {
    const { nodes } = get();
    const startNode = nodes.find((n) => n.type === "start");

    set({
      execution: {
        isRunning: true,
        isPaused: false,
        currentNodeId: startNode?.id || null,
        executionHistory: startNode ? [startNode.id] : [],
        context: {
          variables: {},
          sessionMemory: {},
        },
      },
    });
  },

  pauseExecution: () => {
    set((state) => ({
      execution: { ...state.execution, isPaused: true },
    }));
  },

  resumeExecution: () => {
    set((state) => ({
      execution: { ...state.execution, isPaused: false },
    }));
  },

  stopExecution: () => {
    set({ execution: initialExecutionState });
  },

  stepExecution: async () => {
    const { nodes, edges, execution } = get();

    if (!execution.currentNodeId || !execution.isRunning) return;

    const currentNode = nodes.find((n) => n.id === execution.currentNodeId);
    if (!currentNode) return;

    // Find next node based on edges
    let nextNodeId: string | null = null;

    if (currentNode.type === "condition") {
      // Handle condition routing
      const condition = currentNode.data.conditions;
      let result = false;

      if (condition) {
        const contextValue = execution.context.variables[condition.variable];
        switch (condition.operator) {
          case "equals":
            result = String(contextValue) === condition.value;
            break;
          case "contains":
            result = String(contextValue).includes(condition.value);
            break;
          case "greater":
            result = Number(contextValue) > Number(condition.value);
            break;
          case "less":
            result = Number(contextValue) < Number(condition.value);
            break;
          case "exists":
            result = contextValue !== undefined && contextValue !== null;
            break;
          case "intent":
            result = execution.context.currentIntent === condition.value;
            break;
          case "confidence":
            result =
              (execution.context.intentConfidence || 0) >=
              Number(condition.value);
            break;
        }
      }

      // Find TRUE or FALSE edge based on sourceHandle
      const matchingEdge = edges.find(
        (e) =>
          e.source === currentNode.id &&
          (result ? e.sourceHandle === "true" : e.sourceHandle === "false"),
      );
      nextNodeId = matchingEdge?.target || null;
    } else if (currentNode.type === "end") {
      // End execution
      set((state) => ({
        execution: {
          ...state.execution,
          isRunning: false,
          currentNodeId: null,
        },
      }));
      return;
    } else {
      // Normal flow - find first outgoing edge
      const outEdge = edges.find((e) => e.source === currentNode.id);
      nextNodeId = outEdge?.target || null;
    }

    if (nextNodeId) {
      set((state) => ({
        execution: {
          ...state.execution,
          currentNodeId: nextNodeId,
          executionHistory: [...state.execution.executionHistory, nextNodeId!],
        },
      }));
    } else {
      // No next node found
      set((state) => ({
        execution: {
          ...state.execution,
          isRunning: false,
          error: "No next node found - flow incomplete",
        },
      }));
    }
  },

  setCurrentNode: (nodeId) => {
    set((state) => ({
      execution: { ...state.execution, currentNodeId: nodeId },
    }));
  },

  updateContext: (updates) => {
    set((state) => ({
      execution: {
        ...state.execution,
        context: { ...state.execution.context, ...updates },
      },
    }));
  },

  setExecutionError: (error) => {
    set((state) => ({
      execution: { ...state.execution, error: error || undefined },
    }));
  },
}));
