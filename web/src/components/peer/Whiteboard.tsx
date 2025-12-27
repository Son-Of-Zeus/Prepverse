import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { motion } from 'framer-motion';
import { Pencil, Type, Eraser, Trash2, Palette, Minus, Plus } from 'lucide-react';
import type { WhiteboardOperation } from '../../api/peer';

interface WhiteboardProps {
  operations: WhiteboardOperation[];
  onDrawLine: (
    points: { x: number; y: number }[],
    color: string,
    strokeWidth: number
  ) => void;
  onAddText: (
    text: string,
    position: { x: number; y: number },
    fontSize: number,
    color: string
  ) => void;
  onEraseItems: (itemIds: string[]) => void;
  onClearAll: () => void;
  currentUserId?: string;
  disabled?: boolean;
}

type Tool = 'draw' | 'text' | 'eraser';

const colors = [
  '#ffffff',
  '#E53935',
  '#43A047',
  '#1E88E5',
  '#FDD835',
  '#8E24AA',
  '#00ACC1',
  '#FF8F00',
];

// Extended fabric types
interface FabricObjectWithId extends fabric.Object {
  customId?: string;
}

interface PathCreatedEvent {
  path?: fabric.Path & { customId?: string };
}

/**
 * Convert ARGB int to hex color.
 * Android sends colors as ARGB integers (e.g., -16777216 for black).
 */
function argbIntToHex(argb: number): string {
  // Handle negative numbers (Java int overflow)
  const unsigned = argb >>> 0;
  // Extract RGB (ignore alpha)
  const rgb = unsigned & 0xFFFFFF;
  return '#' + rgb.toString(16).padStart(6, '0');
}

/**
 * Parse color from various formats (Android int, hex string, or number).
 */
function parseColor(colorValue: unknown): string {
  if (typeof colorValue === 'string') {
    // Already a hex color
    if (colorValue.startsWith('#')) {
      return colorValue;
    }
    // String number (from Android)
    const parsed = parseInt(colorValue, 10);
    if (!isNaN(parsed)) {
      return argbIntToHex(parsed);
    }
    return colorValue;
  }
  if (typeof colorValue === 'number') {
    return argbIntToHex(colorValue);
  }
  return '#ffffff'; // Default
}

/**
 * Parse points from Android string format or web array format.
 * Android format: "x1,y1;x2,y2;x3,y3"
 * Web format: [{ x: 1, y: 1 }, { x: 2, y: 2 }]
 */
function parsePoints(pointsValue: unknown): { x: number; y: number }[] {
  if (typeof pointsValue === 'string') {
    // Android format: "x1,y1;x2,y2;x3,y3"
    return pointsValue.split(';').filter(Boolean).map((pointStr) => {
      const [x, y] = pointStr.split(',').map(Number);
      return { x: x || 0, y: y || 0 };
    });
  }
  if (Array.isArray(pointsValue)) {
    return pointsValue.map((p) => ({
      x: typeof p.x === 'number' ? p.x : Number(p.x) || 0,
      y: typeof p.y === 'number' ? p.y : Number(p.y) || 0,
    }));
  }
  return [];
}

/**
 * Parse number from string or number.
 */
function parseNumber(value: unknown, defaultValue: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Parse target IDs from Android string format or web array format.
 * Android format: "id1,id2,id3"
 * Web format: ["id1", "id2", "id3"]
 */
function parseTargetIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split(',').filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}

export function Whiteboard({
  operations,
  onDrawLine,
  onAddText,
  onEraseItems,
  onClearAll,
  currentUserId,
  disabled,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const appliedOpsRef = useRef<Set<string>>(new Set());

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    let canvas: fabric.Canvas | null = null;
    let resizeHandler: (() => void) | null = null;

    // Small delay to ensure container has proper dimensions after mount
    const timeoutId = setTimeout(() => {
      if (!canvasRef.current) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      canvas = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: true,
        backgroundColor: '#1a1a24',
        width,
        height,
        selection: false,
      });

      fabricRef.current = canvas;

      // Configure brush
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = strokeWidth;
      }

      // Handle drawing end
      (canvas as unknown as { on: (event: string, callback: (e: PathCreatedEvent) => void) => void }).on('path:created', (e: PathCreatedEvent) => {
        const path = e.path;
        if (!path || !path.path) return;

        const points: { x: number; y: number }[] = [];
        const pathData = path.path as unknown as Array<(string | number)[]>;

        pathData.forEach((cmd) => {
          if (cmd[0] === 'M' || cmd[0] === 'L') {
            points.push({ x: cmd[1] as number, y: cmd[2] as number });
          } else if (cmd[0] === 'Q') {
            points.push({ x: cmd[3] as number, y: cmd[4] as number });
          }
        });

        const id = crypto.randomUUID();
        path.customId = id;

        onDrawLine(points, (path.stroke as string) || color, path.strokeWidth || strokeWidth);
      });

      // Handle object selection for eraser
      canvas.on('selection:created', (e) => {
        if (tool === 'eraser' && e.selected) {
          const idsToErase: string[] = [];
          e.selected.forEach((obj) => {
            const id = (obj as FabricObjectWithId).customId;
            if (id) idsToErase.push(id);
          });
          if (idsToErase.length > 0) {
            onEraseItems(idsToErase);
            e.selected.forEach((obj) => canvas?.remove(obj));
          }
          canvas?.discardActiveObject();
        }
      });

      // Handle resize
      resizeHandler = () => {
        if (fabricRef.current && containerRef.current) {
          fabricRef.current.setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', resizeHandler);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (canvas) {
        canvas.dispose();
      }
      fabricRef.current = null;
    };
  }, []);

  // Update tool mode
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    canvas.isDrawingMode = tool === 'draw';
    canvas.selection = tool === 'eraser';

    if (tool === 'draw' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [tool, color, strokeWidth]);

  // Apply incoming operations (from both Android and web)
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    operations.forEach((op) => {
      // Create unique operation ID for deduplication
      const opId = `${op.user_id}-${op.timestamp}`;

      // Skip if we already applied this op
      if (appliedOpsRef.current.has(opId)) return;

      // Skip if it's from current user (we already rendered locally)
      if (op.user_id === currentUserId) return;

      appliedOpsRef.current.add(opId);

      const data = op.data as Record<string, unknown>;

      switch (op.type) {
        case 'draw': {
          // Parse points (handles both Android string and web array format)
          const points = parsePoints(data.points);
          // Parse color (handles ARGB int or hex string)
          const parsedColor = parseColor(data.color);
          // Parse stroke width
          const parsedStrokeWidth = parseNumber(data.strokeWidth, 3);
          // Get ID
          const id = (data.id as string) || crypto.randomUUID();

          if (points.length >= 2) {
            const pathData = points
              .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
              .join(' ');

            const path = new fabric.Path(pathData, {
              stroke: parsedColor,
              strokeWidth: parsedStrokeWidth,
              fill: undefined,
              selectable: false,
            }) as FabricObjectWithId;
            path.customId = id;
            canvas.add(path);
          }
          break;
        }
        case 'text': {
          const text = (data.text as string) || '';
          // Handle both position object and x/y fields (Android format)
          const position = data.position as { x: number; y: number } | undefined;
          const x = position?.x ?? parseNumber(data.x, 0);
          const y = position?.y ?? parseNumber(data.y, 0);
          const fontSize = parseNumber(data.fontSize, 20);
          const parsedColor = parseColor(data.color);
          const id = (data.id as string) || crypto.randomUUID();

          const textObj = new fabric.Text(text, {
            left: x,
            top: y,
            fontSize,
            fill: parsedColor,
            selectable: false,
          }) as FabricObjectWithId;
          textObj.customId = id;
          canvas.add(textObj);
          break;
        }
        case 'erase': {
          const targetIds = parseTargetIds(data.targetIds);
          canvas.getObjects().forEach((obj) => {
            const id = (obj as FabricObjectWithId).customId;
            if (id && targetIds.includes(id)) {
              canvas.remove(obj);
            }
          });
          break;
        }
        case 'clear': {
          canvas.clear();
          canvas.backgroundColor = '#1a1a24';
          canvas.renderAll();
          appliedOpsRef.current.clear();
          break;
        }
      }
    });

    canvas.renderAll();
  }, [operations, currentUserId]);

  // Handle text tool click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool !== 'text' || !fabricRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const text = prompt('Enter text:');
      if (text) {
        const textObj = new fabric.Text(text, {
          left: x,
          top: y,
          fontSize: 20,
          fill: color,
          selectable: false,
        }) as FabricObjectWithId;
        const id = crypto.randomUUID();
        textObj.customId = id;
        fabricRef.current.add(textObj);

        onAddText(text, { x, y }, 20, color);
      }
    },
    [tool, color, onAddText]
  );

  // Handle clear
  const handleClear = () => {
    if (!fabricRef.current) return;
    if (confirm('Clear the entire whiteboard?')) {
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = '#1a1a24';
      fabricRef.current.renderAll();
      appliedOpsRef.current.clear();
      onClearAll();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-surface border-b border-white/10 shrink-0">
        {/* Tools */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
          <ToolButton
            icon={<Pencil className="w-4 h-4" />}
            active={tool === 'draw'}
            onClick={() => setTool('draw')}
            tooltip="Draw"
            disabled={disabled}
          />
          <ToolButton
            icon={<Type className="w-4 h-4" />}
            active={tool === 'text'}
            onClick={() => setTool('text')}
            tooltip="Text"
            disabled={disabled}
          />
          <ToolButton
            icon={<Eraser className="w-4 h-4" />}
            active={tool === 'eraser'}
            onClick={() => setTool('eraser')}
            tooltip="Eraser"
            disabled={disabled}
          />
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-white/10" />

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color }}
            disabled={disabled}
          >
            <Palette className="w-4 h-4" />
          </button>

          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColorPicker(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-1 p-2 bg-elevated rounded-lg border border-white/10 shadow-lg z-20 grid grid-cols-4 gap-1"
              >
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setShowColorPicker(false);
                    }}
                    className={`
                      w-6 h-6 rounded-full border-2 transition-transform hover:scale-110
                      ${color === c ? 'border-white' : 'border-transparent'}
                    `}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </motion.div>
            </>
          )}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
            className="p-1 rounded hover:bg-white/10 text-white/60"
            disabled={disabled}
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs text-white/60 w-4 text-center">{strokeWidth}</span>
          <button
            onClick={() => setStrokeWidth(Math.min(20, strokeWidth + 1))}
            className="p-1 rounded hover:bg-white/10 text-white/60"
            disabled={disabled}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-white/10" />

        {/* Clear */}
        <button
          onClick={handleClear}
          className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
          title="Clear all"
          disabled={disabled}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden cursor-crosshair relative"
        onClick={handleCanvasClick}
        style={{ minHeight: 0 }}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tooltip: string;
  disabled?: boolean;
}

function ToolButton({ icon, active, onClick, tooltip, disabled }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        p-2 rounded-lg transition-colors
        ${active ? 'bg-prepverse-red text-white' : 'text-white/60 hover:bg-white/10'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {icon}
    </button>
  );
}
