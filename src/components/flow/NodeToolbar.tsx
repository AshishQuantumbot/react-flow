import { 
  Play, 
  MessageCircleQuestion, 
  MessageSquare, 
  GitBranch, 
  Globe, 
  Square,
  Sparkles,
  ShieldAlert,
  Timer,
  UserCheck,
} from 'lucide-react';
import { useFlowStore, NodeType } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { useReactFlow } from '@xyflow/react';

const nodeTypes: { type: NodeType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: 'start', icon: <Play className="w-4 h-4" />, label: 'Start', color: 'text-node-start' },
  { type: 'question', icon: <MessageCircleQuestion className="w-4 h-4" />, label: 'Question', color: 'text-node-question' },
  // { type: 'answer', icon: <MessageSquare className="w-4 h-4" />, label: 'Answer', color: 'text-node-answer' },
  // { type: 'ai', icon: <Sparkles className="w-4 h-4" />, label: 'AI Prompt', color: 'text-node-ai' },
  // { type: 'condition', icon: <GitBranch className="w-4 h-4" />, label: 'Condition', color: 'text-node-condition' },
  // { type: 'api', icon: <Globe className="w-4 h-4" />, label: 'API', color: 'text-node-api' },
  // { type: 'delay', icon: <Timer className="w-4 h-4" />, label: 'Delay', color: 'text-node-delay' },
  // { type: 'fallback', icon: <ShieldAlert className="w-4 h-4" />, label: 'Fallback', color: 'text-node-fallback' },
  // { type: 'handoff', icon: <UserCheck className="w-4 h-4" />, label: 'Handoff', color: 'text-node-handoff' },
  { type: 'end', icon: <Square className="w-4 h-4" />, label: 'CTA', color: 'text-node-end' },
];

export function NodeToolbar() {
  const { addNode, nodes } = useFlowStore();
  const { screenToFlowPosition } = useReactFlow();

  const hasStartNode = nodes.some(n => n.type === 'start');

  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (nodeType: NodeType) => {
    if (nodeType === 'start' && hasStartNode) return;
    
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNode(nodeType, position);
  };

  return (
    <div className="glass-panel rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-3 px-2">Add Nodes</p>
      <div className="space-y-1">
        {nodeTypes.map(({ type, icon, label, color }) => {
          const disabled = type === 'start' && hasStartNode;
          
          return (
            <button
              key={type}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => handleClick(type)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-all',
                'hover:bg-secondary/50 active:scale-95',
                disabled && 'opacity-40 cursor-not-allowed',
                color
              )}
            >
              {icon}
              <span className="text-foreground">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
