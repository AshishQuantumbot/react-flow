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
  | "handoff"
  | "subflow";

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
    id: "subflow-1",
    type: "subflow",
    position: { x: 50, y: 150 },
    data: { label: "Questions" },
    style: {
      width: 600,
      height: 500,
    },
  },
  {
    id: "end-1",
    type: "end",
    position: { x: 250, y: 500 },
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

// Helper function to calculate SubFlow size based on contained Question nodes
const calculateSubFlowSize = (nodes: Node<FlowNodeData>[], subflowId: string) => {
  const questionNodes = nodes.filter(
    (n) => n.type === "question" && n.parentId === subflowId
  );

  if (questionNodes.length === 0) {
    // Minimum size when no questions
    return { width: 500, height: 400 };
  }

  // Calculate bounding box of all question nodes
  const questionWidth = 200; // Increased from 180 to 200
  const questionHeight = 120; // Increased from 100 to 120
  const padding = 40; // Increased from 20 to 40
  const headerHeight = 60; // Increased from 40 to 60

  // Find the bounds of all question nodes
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  questionNodes.forEach((node) => {
    const x = node.position.x;
    const y = node.position.y;
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + questionWidth);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + questionHeight);
  });

  // Handle edge case where all positions are at origin
  if (minX === Infinity) {
    minX = 0;
    maxX = questionWidth;
    minY = 0;
    maxY = questionHeight;
  }

  // Calculate required dimensions with padding
  // Ensure we account for negative positions by using absolute bounds
  const requiredWidth = Math.max(
    maxX - Math.min(minX, 0) + padding * 2, 
    padding * 2 + questionWidth
  );
  const requiredHeight = Math.max(
    maxY - Math.min(minY, 0) + headerHeight + padding * 2, 
    headerHeight + padding * 2 + questionHeight
  );

  // Ensure minimum dimensions - increased minimum sizes
  const minWidth = 600; // Increased from 400 to 600
  const minHeight = 500; // Increased from 300 to 500

  return {
    width: Math.max(requiredWidth, minWidth),
    height: Math.max(requiredHeight, minHeight),
  };
};

// Helper function to ensure all END nodes are outside SubFlow
const ensureEndNodesOutsideSubFlow = (nodes: Node<FlowNodeData>[]): Node<FlowNodeData>[] => {
  const subflowNode = nodes.find((n) => n.type === "subflow");
  if (!subflowNode) return nodes;

  return nodes.map((node) => {
    // If an END node is inside SubFlow, move it outside
    if (node.type === "end" && node.parentId === subflowNode.id) {
      console.warn("Moving End/CTA node outside SubFlow container");
      
      const subflowHeight = typeof subflowNode.style?.height === 'number' 
        ? subflowNode.style.height 
        : 500;
      const subflowWidth = typeof subflowNode.style?.width === 'number' 
        ? subflowNode.style.width 
        : 600;
      
      return {
        ...node,
        parentId: undefined,
        extent: undefined,
        position: {
          x: subflowNode.position.x + subflowWidth / 2 - 90, // Center horizontally
          y: subflowNode.position.y + subflowHeight + 50, // 50px below SubFlow
        },
      };
    }
    return node;
  });
};

// Helper function to enforce boundary constraints
const enforceBoundaryConstraints = (nodes: Node<FlowNodeData>[]): Node<FlowNodeData>[] => {
  const subflowNode = nodes.find((n) => n.type === "subflow");
  if (!subflowNode) return nodes;

  return nodes.map((node) => {
    if (node.type === "question" && node.parentId === subflowNode.id) {
      // Question nodes: keep INSIDE SubFlow with padding
      const subflowWidth = typeof subflowNode.style?.width === 'number' 
        ? subflowNode.style.width 
        : 600;
      const subflowHeight = typeof subflowNode.style?.height === 'number' 
        ? subflowNode.style.height 
        : 500;
      
      const padding = 20;
      const nodeWidth = 180;
      const nodeHeight = 100;
      const headerHeight = 40;
      
      const constrainedPosition = {
        x: Math.max(padding, Math.min(node.position.x, subflowWidth - nodeWidth - padding)),
        y: Math.max(padding + headerHeight, Math.min(node.position.y, subflowHeight - nodeHeight - padding)),
      };
      
      return {
        ...node,
        position: constrainedPosition,
      };
    } else if (node.type !== "subflow" && node.type !== "question") {
      // Other nodes: prevent from going INSIDE SubFlow
      const subflowX = subflowNode.position.x;
      const subflowY = subflowNode.position.y;
      const subflowWidth = typeof subflowNode.style?.width === 'number' 
        ? subflowNode.style.width 
        : 600;
      const subflowHeight = typeof subflowNode.style?.height === 'number' 
        ? subflowNode.style.height 
        : 500;
      
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const nodeWidth = 180;
      const nodeHeight = 100;
      
      // Check if node is inside SubFlow area
      const isInsideSubFlow = (
        nodeX >= subflowX && 
        nodeX + nodeWidth <= subflowX + subflowWidth &&
        nodeY >= subflowY && 
        nodeY + nodeHeight <= subflowY + subflowHeight
      );
      
      if (isInsideSubFlow) {
        // Push to nearest border with gap
        const gap = 20;
        const centerX = nodeX + nodeWidth / 2;
        const centerY = nodeY + nodeHeight / 2;
        const subflowCenterX = subflowX + subflowWidth / 2;
        const subflowCenterY = subflowY + subflowHeight / 2;
        
        let newPosition = { ...node.position };
        
        // Determine which side is closest
        if (Math.abs(centerX - subflowCenterX) > Math.abs(centerY - subflowCenterY)) {
          // Move horizontally
          if (centerX < subflowCenterX) {
            newPosition.x = subflowX - nodeWidth - gap; // Left side
          } else {
            newPosition.x = subflowX + subflowWidth + gap; // Right side
          }
        } else {
          // Move vertically
          if (centerY < subflowCenterY) {
            newPosition.y = subflowY - nodeHeight - gap; // Top side
          } else {
            newPosition.y = subflowY + subflowHeight + gap; // Bottom side
          }
        }
        
        return {
          ...node,
          position: newPosition,
        };
      }
    }
    
    return node;
  });
};

// Helper function to update SubFlow size
const updateSubFlowSize = (nodes: Node<FlowNodeData>[]): Node<FlowNodeData>[] => {
  return nodes.map((node) => {
    if (node.type === "subflow") {
      const newSize = calculateSubFlowSize(nodes, node.id);
      const currentWidth = node.style?.width || 600; // Updated default
      const currentHeight = node.style?.height || 500; // Updated default
      
      // Only update if size actually changed (avoid unnecessary re-renders)
      if (currentWidth !== newSize.width || currentHeight !== newSize.height) {
        return {
          ...node,
          style: {
            ...node.style,
            width: newSize.width,
            height: newSize.height,
          },
        };
      }
    }
    return node;
  });
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: enforceBoundaryConstraints(ensureEndNodesOutsideSubFlow(initialNodes)),
  edges: [],
  selectedNodeId: null,
  isPanelOpen: false,
  execution: initialExecutionState,

  setNodes: (nodes) => set({ nodes: enforceBoundaryConstraints(ensureEndNodesOutsideSubFlow(nodes)) }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    let updatedNodes = applyNodeChanges(changes, get().nodes) as Node<FlowNodeData>[];
    
    // Always ensure END nodes are outside SubFlow
    updatedNodes = ensureEndNodesOutsideSubFlow(updatedNodes);
    
    // Apply boundary constraints
    updatedNodes = enforceBoundaryConstraints(updatedNodes);
    
    // Check if any Question nodes were moved (position changes)
    const hasQuestionPositionChange = changes.some(
      (change) => 
        change.type === 'position' && 
        updatedNodes.find(n => n.id === change.id)?.type === 'question'
    );

    // Check if SubFlow was manually resized (dimensions change)
    const hasSubFlowResize = changes.some(
      (change) => 
        change.type === 'dimensions' && 
        updatedNodes.find(n => n.id === change.id)?.type === 'subflow'
    );

    // Only auto-resize if it's not a manual resize
    const shouldAutoResize = hasQuestionPositionChange && !hasSubFlowResize;

    set({
      nodes: shouldAutoResize ? updateSubFlowSize(updatedNodes) : updatedNodes,
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

    // Prevent connections to/from SubFlow nodes - they are containers only
    if (sourceNode?.type === "subflow" || targetNode?.type === "subflow") {
      console.warn("SubFlow nodes cannot be connected directly - they are containers for Question nodes");
      return;
    }

    // Prevent END nodes from being dragged into SubFlow
    if (targetNode?.type === "end" && targetNode.parentId) {
      console.warn("End/CTA nodes cannot be placed inside SubFlow container");
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

    if (type === "subflow" && nodes.some((n) => n.type === "subflow")) {
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
      subflow: "Questions",
    };

    // Generate unique label with numbering for duplicate types
    const getUniqueLabel = (baseLabel: string, nodeType: NodeType): string => {
      if (nodeType === "start" || nodeType === "subflow") return baseLabel; // Start and SubFlow nodes are always unique

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

    // Handle Question node placement inside SubFlow
    let finalPosition = position;
    let parentNode = undefined;
    let extent = undefined;

    if (type === "question") {
      const subflowNode = nodes.find((n) => n.type === "subflow");
      if (subflowNode) {
        // Place question inside the subflow
        parentNode = subflowNode.id;
        extent = "parent" as const;
        
        // Calculate position relative to subflow (with padding)
        const existingQuestions = nodes.filter(
          (n) => n.type === "question" && n.parentId === subflowNode.id
        );
        
        // Position questions in a grid inside the subflow
        const questionsPerRow = 2;
        const questionIndex = existingQuestions.length;
        const row = Math.floor(questionIndex / questionsPerRow);
        const col = questionIndex % questionsPerRow;
        
        finalPosition = {
          x: 40 + col * 200, // Increased padding to 40px and spacing to 200px
          y: 60 + row * 120,  // Increased header space to 60px and row height to 120px
        };
      } else {
        console.warn("Cannot add Question node: SubFlow container not found");
        return;
      }
    }

    // Ensure END nodes are placed outside SubFlow
    if (type === "end") {
      const subflowNode = nodes.find((n) => n.type === "subflow");
      if (subflowNode) {
        // Position END node below the SubFlow container
        const subflowHeight = typeof subflowNode.style?.height === 'number' 
          ? subflowNode.style.height 
          : 500;
        const subflowWidth = typeof subflowNode.style?.width === 'number' 
          ? subflowNode.style.width 
          : 600;
        const subflowBottom = subflowNode.position.y + subflowHeight;
        
        finalPosition = {
          x: subflowNode.position.x + subflowWidth / 2 - 90, // Center horizontally
          y: subflowBottom + 50, // 50px gap below SubFlow
        };
      }
    }

    const newNode: Node<FlowNodeData> = {
      id: generateId(),
      type,
      position: finalPosition,
      data: defaultData,
      ...(parentNode && { parentId: parentNode }),
      ...(extent && { extent }),
    };

    // Auto-connect logic for multiple connections
    let newEdges = [...edges];

    // Find nodes that can connect to the new node
    const availableNodes = nodes.filter((n) => n.type !== "end");

    if (availableNodes.length > 0 && type !== "start" && type !== "subflow") {
      // Don't auto-connect Start nodes or SubFlow nodes, but auto-connect others

      if (type === "question") {
        // For Question nodes: ALWAYS connect to Start node
        const startNode = availableNodes.find((n) => n.type === "start");
        if (startNode) {
          // Connect Start → Question
          newEdges.push({
            id: `edge-${startNode.id}-${newNode.id}`,
            source: startNode.id,
            target: newNode.id,
            animated: true,
            style: { strokeWidth: 2 },
          });

          // Also connect Question → End (if End node exists)
          const endNode = nodes.find((n) => n.type === "end");
          if (endNode) {
            newEdges.push({
              id: `edge-${newNode.id}-${endNode.id}`,
              source: newNode.id,
              target: endNode.id,
              animated: true,
              style: { strokeWidth: 2 },
            });
          }
        }
      } else if (type === "end") {
        // For End nodes, connect to all existing Question nodes
        const questionNodes = availableNodes.filter(
          (n) => n.type === "question",
        );
        questionNodes.forEach((questionNode) => {
          // Check if connection already exists
          const connectionExists = newEdges.some(
            (e) => e.source === questionNode.id && e.target === newNode.id,
          );
          if (!connectionExists) {
            newEdges.push({
              id: `edge-${questionNode.id}-${newNode.id}`,
              source: questionNode.id,
              target: newNode.id,
              animated: true,
              style: { strokeWidth: 2 },
            });
          }
        });
      }
    }

    set({
      nodes: enforceBoundaryConstraints(ensureEndNodesOutsideSubFlow(updateSubFlowSize([...nodes, newNode]))),
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

    const updatedNodes = nodes.filter((n) => !nodesToDelete.includes(n.id));

    set({
      nodes: enforceBoundaryConstraints(ensureEndNodesOutsideSubFlow(updateSubFlowSize(updatedNodes))),
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
        set({ 
          nodes: enforceBoundaryConstraints(ensureEndNodesOutsideSubFlow(updateSubFlowSize(nodes))), 
          edges, 
          selectedNodeId: null, 
          isPanelOpen: false 
        });
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

    // Check for subflow node
    const subflowNodes = nodes.filter((n) => n.type === "subflow");
    if (subflowNodes.length === 0) {
      errors.push("Flow must have a SubFlow container");
    } else if (subflowNodes.length > 1) {
      errors.push("Flow can only have one SubFlow container");
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

    // NEW: Validate SubFlow constraints
    if (subflowNodes.length > 0 && questionNodes.length > 0) {
      const subflowId = subflowNodes[0].id;
      
      // Check that ALL Question nodes are inside the SubFlow
      questionNodes.forEach((node) => {
        if (node.parentId !== subflowId) {
          errors.push(
            `Question node "${node.data.label}" must be inside the SubFlow container`,
          );
        }
      });
    }

    // Check that no non-Question nodes are inside SubFlow
    const nodesInSubflow = nodes.filter((n) => n.parentId && subflowNodes.some(sf => sf.id === n.parentId));
    nodesInSubflow.forEach((node) => {
      if (node.type !== "question") {
        errors.push(
          `Only Question nodes are allowed inside the SubFlow container. Found: ${node.data.label} (${node.type})`,
        );
      }
    });

    // Check that END/CTA nodes are NOT inside SubFlow
    const endNodesInSubflow = nodes.filter((n) => n.type === "end");
    endNodesInSubflow.forEach((node) => {
      if (node.parentId && subflowNodes.some(sf => sf.id === node.parentId)) {
        errors.push(
          `End/CTA node "${node.data.label}" must be outside the SubFlow container`,
        );
      }
    });

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
