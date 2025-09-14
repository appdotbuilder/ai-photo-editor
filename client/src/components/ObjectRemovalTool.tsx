import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Scissors, RotateCcw, Wand2, Brush } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Image, AIOperation, ObjectRemovalInput } from '../../../server/src/schema';

interface ObjectRemovalToolProps {
  image: Image;
  imageSrc: string;
  onOperationStarted: (operation: AIOperation) => void;
  isProcessing: boolean;
}

interface MaskPoint {
  x: number;
  y: number;
}

export function ObjectRemovalTool({ 
  image, 
  imageSrc, 
  onOperationStarted,
  isProcessing 
}: ObjectRemovalToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskPath, setMaskPath] = useState<MaskPoint[]>([]);
  const [brushSize, setBrushSize] = useState(20);
  const [inpaintStrength, setInpaintStrength] = useState(0.8);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Initialize canvases
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!ctx || !overlayCtx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match image aspect ratio
      const maxWidth = 800;
      const maxHeight = 600;
      const aspectRatio = img.width / img.height;
      
      let displayWidth = maxWidth;
      let displayHeight = maxWidth / aspectRatio;
      
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      overlayCanvas.width = displayWidth;
      overlayCanvas.height = displayHeight;

      // Position overlay canvas on top of main canvas
      overlayCanvas.style.position = 'absolute';
      overlayCanvas.style.top = canvas.offsetTop + 'px';
      overlayCanvas.style.left = canvas.offsetLeft + 'px';

      // Draw image on main canvas
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      
      // Clear overlay
      overlayCtx.clearRect(0, 0, displayWidth, displayHeight);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle mouse events for mask drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelectionMode || isProcessing) return;
    
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setMaskPath([{ x, y }]);
  }, [isSelectionMode, isProcessing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !isSelectionMode || isProcessing) return;
    
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add point to mask path
    setMaskPath(prev => [...prev, { x, y }]);
    
    // Draw mask overlay
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [isDrawing, isSelectionMode, brushSize, isProcessing]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Clear mask
  const clearMask = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;
    
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    setMaskPath([]);
  }, []);

  // Start object removal
  const handleRemoveObject = useCallback(async () => {
    if (maskPath.length === 0) {
      alert('Please select an area to remove by drawing on the image');
      return;
    }

    try {
      const maskData = JSON.stringify({
        type: 'brush_strokes',
        points: maskPath,
        brush_size: brushSize,
        canvas_width: overlayCanvasRef.current?.width || image.width,
        canvas_height: overlayCanvasRef.current?.height || image.height
      });

      const removalInput: ObjectRemovalInput = {
        image_id: image.id,
        mask_data: maskData,
        parameters: {
          inpaint_strength: inpaintStrength,
          guidance_scale: guidanceScale
        }
      };

      const operation = await trpc.removeObject.mutate(removalInput);
      onOperationStarted(operation);
      
      // Clear the mask after starting the operation
      clearMask();
      setIsSelectionMode(false);
      
    } catch (error) {
      console.error('Failed to start object removal:', error);
      alert('Failed to start object removal. Please try again.');
    }
  }, [maskPath, brushSize, image.id, inpaintStrength, guidanceScale, onOperationStarted, clearMask]);

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-red-500" />
            AI Object Removal
          </CardTitle>
          <CardDescription>
            Mark objects you want to remove and let AI intelligently fill the background.
            The AI will analyze the surrounding context and generate realistic replacements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tool Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Selection Tools */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={isSelectionMode ? "default" : "outline"}
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Brush className="w-4 h-4" />
                  {isSelectionMode ? 'Drawing Mode ON' : 'Start Selection'}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearMask}
                  disabled={isProcessing || maskPath.length === 0}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brush-size">Brush Size: {brushSize}px</Label>
                <Slider
                  id="brush-size"
                  min={5}
                  max={50}
                  step={5}
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  disabled={isProcessing}
                  className="w-full"
                />
              </div>
            </div>

            {/* AI Parameters */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">AI Parameters</h4>
              
              <div className="space-y-2">
                <Label htmlFor="inpaint-strength">Inpaint Strength: {inpaintStrength}</Label>
                <Slider
                  id="inpaint-strength"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={[inpaintStrength]}
                  onValueChange={(value) => setInpaintStrength(value[0])}
                  disabled={isProcessing}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Higher values create more dramatic changes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guidance-scale">Guidance Scale: {guidanceScale}</Label>
                <Slider
                  id="guidance-scale"
                  min={1}
                  max={20}
                  step={0.5}
                  value={[guidanceScale]}
                  onValueChange={(value) => setGuidanceScale(value[0])}
                  disabled={isProcessing}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Controls how closely AI follows the removal instructions
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleRemoveObject}
              disabled={isProcessing || maskPath.length === 0}
              size="lg"
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              {isProcessing ? 'Processing...' : 'Remove Selected Objects'}
            </Button>
          </div>

          {/* Instructions */}
          {isSelectionMode && (
            <Alert className="bg-blue-50 border-blue-200">
              <Brush className="w-4 h-4" />
              <AlertDescription>
                <strong>Selection Mode Active:</strong> Click and drag on the image to mark objects you want to remove. 
                The red overlay shows your selection. You can adjust the brush size and clear the selection as needed.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center bg-gray-50 rounded-lg p-4 relative">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-gray-200 rounded shadow-sm max-w-full"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 pointer-events-auto cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">✨ Pro Tips for Object Removal:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Mark the entire object you want to remove, including shadows</li>
            <li>• Use a smaller brush for precise selection around edges</li>
            <li>• Higher inpaint strength works better for complex backgrounds</li>
            <li>• AI works best when removing objects against natural backgrounds</li>
            <li>• Processing may take 1-3 minutes depending on image complexity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}