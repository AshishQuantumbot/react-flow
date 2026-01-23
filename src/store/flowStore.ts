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
  priority?: number;
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
  {
    id: "end-1",
    type: "end",
    position: { x: 250, y: 300 },
    data: { label: "CTA", meetingType: "meeting-schedule" },
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
    const { nodes, edges } = get();

    // Allow multiple outgoing connections (removed single flow restriction)
    // Now Start can connect to multiple Questions, Questions can connect to Questions, etc.

    // Still prevent Start node from connecting directly to End node
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (sourceNode?.type === "start" && targetNode?.type === "end") {
      console.warn("Start node cannot connect directly to End/CTA node");
      return;
    }

    // Prevent duplicate connections
    const connectionExists = edges.some(
      (e) => e.source === connection.source && e.target === connection.target,
    );
    if (connectionExists) {
      console.warn("Connection already exists");
      return;
    }

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
    const { nodes, edges, selectedNodeId } = get();

    if (type === "start" && nodes.some((n) => n.type === "start")) {
      return;
    }

    // Allow adding end/CTA nodes (removed the restriction)
    // The restriction was preventing End nodes without Question nodes
    // but we want End nodes to be available by default

    const baseLabels: Record<NodeType, string> = {
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

    // Generate unique label with numbering for duplicate types
    const getUniqueLabel = (baseLabel: string, nodeType: NodeType): string => {
      if (nodeType === "start") return baseLabel; // Start node is always unique

      const existingNodes = nodes.filter((n) => n.type === nodeType);
      if (existingNodes.length === 0) {
        return baseLabel; // First node of this type
      }

      // Find the highest number used
      let maxNumber = 0;
      existingNodes.forEach((node) => {
        const match = node.data.label.match(
          new RegExp(`^${baseLabel}\\s*(\\d+)?$`),
        );
        if (match) {
          const num = match[1] ? parseInt(match[1]) : 1;
          maxNumber = Math.max(maxNumber, num);
        }
      });

      // For the first duplicate, use "Question 2", "Answer 2", etc.
      const nextNumber = maxNumber === 0 ? 2 : maxNumber + 1;
      return `${baseLabel} ${nextNumber}`;
    };

    const baseLabel = baseLabels[type];
    const uniqueLabel = getUniqueLabel(baseLabel, type);

    // Set default data based on node type
    let defaultData: FlowNodeData = { label: uniqueLabel };

    if (type === "question") {
      defaultData = {
        ...defaultData,
        required: "yes", // Default to YES
      };
    } else if (type === "end") {
      defaultData = {
        ...defaultData,
        meetingType: "meeting-schedule", // Default meeting type
      };
    }

    const newNode: Node<FlowNodeData> = {
      id: generateId(),
      type,
      position,
      data: defaultData,
    };

    // Auto-connect logic for multiple connections
    let sourceNodeId: string | null = null;

    // Find nodes that can connect to the new node
    const availableNodes = nodes.filter((n) => n.type !== "end");

    if (availableNodes.length > 0 && type !== "start") {
      // Don't auto-connect Start nodes, but auto-connect others

      if (type === "end") {
        // For End nodes, connect to the most recently added Question node
        const questionNodes = availableNodes.filter(
          (n) => n.type === "question",
        );
        if (questionNodes.length > 0) {
          sourceNodeId = questionNodes[questionNodes.length - 1].id;
        }
      } else {
        // For Question nodes, connect to Start if it has no connections, otherwise to the last Question
        const startNode = availableNodes.find((n) => n.type === "start");
        const startHasConnections = edges.some(
          (e) => e.source === startNode?.id,
        );

        if (startNode && !startHasConnections) {
          sourceNodeId = startNode.id;
        } else {
          // Connect to the most recently added Question node
          const questionNodes = availableNodes.filter(
            (n) => n.type === "question",
          );
          if (questionNodes.length > 0) {
            sourceNodeId = questionNodes[questionNodes.length - 1].id;
          } else if (startNode) {
            // If no Questions exist, connect to Start (allowing multiple connections from Start)
            sourceNodeId = startNode.id;
          }
        }
      }
    }

    // Create the new edge if we found a source
    const newEdges = sourceNodeId
      ? [
          ...edges,
          {
            id: `edge-${sourceNodeId}-${newNode.id}`,
            source: sourceNodeId,
            target: newNode.id,
            animated: true,
            style: { strokeWidth: 2 },
          },
        ]
      : edges;

    set({
      nodes: [...nodes, newNode],
      edges: newEdges,
      selectedNodeId: newNode.id,
      isPanelOpen: true,
    });
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
    const nodeToDelete = nodes.find((n) => n.id === nodeId);

    if (!nodeToDelete) return;

    let nodesToDelete = [nodeId];
    let edgesToDelete = edges.filter(
      (e) => e.source === nodeId || e.target === nodeId,
    );

    // Smart reconnection logic for multiple connections
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    let newEdges = edges.filter(
      (e) => !edgesToDelete.some((del) => del.id === e.id),
    );

    // If the deleted node was in the middle of connections, reconnect appropriately
    if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
      // For each incoming connection, connect to each outgoing connection
      incomingEdges.forEach((inEdge) => {
        outgoingEdges.forEach((outEdge) => {
          const newEdge = {
            id: `edge-${inEdge.source}-${outEdge.target}`,
            source: inEdge.source,
            target: outEdge.target,
            animated: true,
            style: { strokeWidth: 2 },
            // Preserve sourceHandle and targetHandle if they exist
            ...(inEdge.sourceHandle && { sourceHandle: inEdge.sourceHandle }),
            ...(outEdge.targetHandle && { targetHandle: outEdge.targetHandle }),
          };

          // Only add if this connection doesn't already exist
          const connectionExists = newEdges.some(
            (e) => e.source === newEdge.source && e.target === newEdge.target,
          );

          if (!connectionExists) {
            newEdges.push(newEdge);
          }
        });
      });
    }

    // If deleting a question node, we no longer automatically delete end nodes
    // End nodes can exist independently now

    set({
      nodes: nodes.filter((n) => !nodesToDelete.includes(n.id)),
      edges: newEdges,
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
      errors.push("Flow must have at least one CTA node");
    }

    // REQUIRE at least one Question node for submission
    const questionNodes = nodes.filter((n) => n.type === "question");
    if (questionNodes.length === 0) {
      errors.push(
        "Please add at least one Question node to create a valid flow",
      );
    }

    // Allow multiple connections (removed single linear flow restriction)
    // Only condition nodes still need special handling for TRUE/FALSE paths

    // Check Start node doesn't connect directly to End
    if (startNodes.length > 0 && endNodes.length > 0) {
      const startToEndConnection = edges.some(
        (e) =>
          e.source === startNodes[0].id &&
          endNodes.some((end) => end.id === e.target),
      );
      if (startToEndConnection) {
        errors.push(
          "Start node cannot connect directly to End/CTA node. Add at least one Question node between them.",
        );
      }
    }

    // Check for proper connections - ALL Questions must be in valid paths
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    // If Questions exist, they ALL must be connected AND in valid paths
    if (questionNodes.length > 0) {
      // First check basic connectivity
      questionNodes.forEach((node) => {
        if (!connectedNodeIds.has(node.id)) {
          errors.push(`Question node "${node.data.label}" is not connected`);
        }
      });

      // Check if Start connects to at least one Question
      if (startNodes.length > 0) {
        const startHasConnection = edges.some(
          (e) => e.source === startNodes[0].id,
        );
        if (!startHasConnection) {
          errors.push(
            "Please connect the Start node to at least one Question node",
          );
        }
      }

      // Check if at least one Question connects to End/CTA
      if (endNodes.length > 0) {
        const endHasIncomingConnection = edges.some((e) =>
          endNodes.some((end) => end.id === e.target),
        );
        if (!endHasIncomingConnection) {
          errors.push(
            "Please connect at least one Question node to the End/CTA node",
          );
        }
      }

      // ADVANCED PATH VALIDATION: Ensure all Questions are in valid Start→End paths
      // This prevents scenarios where Questions are connected but not part of valid flow
      if (startNodes.length > 0 && endNodes.length > 0) {
        const startNodeId = startNodes[0].id;
        const endNodeIds = endNodes.map((n) => n.id);

        // Find all nodes reachable from Start (forward traversal)
        const reachableFromStart = new Set<string>();
        const findReachableFromStart = (nodeId: string) => {
          if (reachableFromStart.has(nodeId)) return;
          reachableFromStart.add(nodeId);

          const outgoingEdges = edges.filter((e) => e.source === nodeId);
          outgoingEdges.forEach((edge) => {
            findReachableFromStart(edge.target);
          });
        };
        findReachableFromStart(startNodeId);

        // Find all nodes that can reach End (backward traversal)
        const canReachEnd = new Set<string>();
        const findCanReachEnd = (nodeId: string) => {
          if (canReachEnd.has(nodeId)) return;
          canReachEnd.add(nodeId);

          const incomingEdges = edges.filter((e) => e.target === nodeId);
          incomingEdges.forEach((edge) => {
            findCanReachEnd(edge.source);
          });
        };
        endNodeIds.forEach((endId) => findCanReachEnd(endId));

        // Validate each Question is in a complete Start→End path
        questionNodes.forEach((node) => {
          const isReachableFromStart = reachableFromStart.has(node.id);
          const canReachEndCTA = canReachEnd.has(node.id);

          if (!isReachableFromStart) {
            errors.push(
              `Question node "${node.data.label}" is not reachable from Start node`,
            );
          }

          if (!canReachEndCTA) {
            errors.push(
              `Question node "${node.data.label}" does not lead to End/CTA node`,
            );
          }
        });
      }
    }

    // Check for infinite loops (only if there are connections)
    if (startNodes.length > 0 && edges.length > 0) {
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

      if (hasCycle(startNodes[0].id)) {
        errors.push("Flow contains an infinite loop");
      }
    }

    // Check condition nodes have both outputs (exception to single flow rule)
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
