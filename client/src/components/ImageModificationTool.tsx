import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit3, Wand2, Target, Brush, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Image, AIOperation, ImageModificationInput } from '../../../server/src/schema';

interface ImageModificationToolProps {
  image: Image;
  imageSrc: string;
  onOperationStarted: (operation: AIOperation) => void;
  isProcessing: boolean;
}

interface MaskPoint {
  x: number;
  y: number;
}

// Predefined modification examples
const modificationExamples = [
  {
    category: 'Sky & Weather',
    examples: [
      'Change the sky to a dramatic sunset with orange and pink clouds',
      'Add storm clouds with lightning in the background',
      'Make it a clear blue sky with white fluffy clouds',
      'Change to a starry night sky with a full moon'
    ]
  },
  {
    category: 'Colors & Lighting',
    examples: [
      'Make the image brighter and more vibrant',
      'Change the lighting to golden hour warm tones',
      'Add dramatic shadows and contrast',
      'Convert to black and white except for one color'
    ]
  },
  {
    category: 'Objects & Elements',
    examples: [
      'Add flowers in the foreground',
      'Change the car color to bright red',
      'Add snow falling from the sky',
      'Replace the building with a modern glass structure'
    ]
  },
  {
    category: 'Seasons & Environment',
    examples: [
      'Change the scene from summer to winter with snow',
      'Add autumn leaves falling from trees',
      'Make it look like spring with blooming flowers',
      'Transform into a tropical paradise setting'
    ]
  }
];

export function ImageModificationTool({ 
  image, 
  imageSrc, 
  onOperationStarted,
  isProcessing 
}: ImageModificationToolProps) {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prompt, setPrompt] = useState('');
  const [useTargetedModification, setUseTargetedModification] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskPath, setMaskPath] = useState<MaskPoint[]>([]);
  const [brushSize, setBrushSize] = useState(20);
  const [modificationStrength, setModificationStrength] = useState(0.8);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [inferenceSteps, setInferenceSteps] = useState(50);
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

      overlayCanvas.style.position = 'absolute';
      overlayCanvas.style.top = canvas.offsetTop + 'px';
      overlayCanvas.style.left = canvas.offsetLeft + 'px';

      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      overlayCtx.clearRect(0, 0, displayWidth, displayHeight);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle mouse events for targeted modification mask
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelectionMode || isProcessing || !useTargetedModification) return;
    
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setMaskPath([{ x, y }]);
  }, [isSelectionMode, isProcessing, useTargetedModification]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !isSelectionMode || isProcessing || !useTargetedModification) return;
    
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMaskPath(prev => [...prev, { x, y }]);
    
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [isDrawing, isSelectionMode, brushSize, isProcessing, useTargetedModification]);

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

  // Handle example selection
  const handleExampleSelect = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  // Start image modification
  const handleModifyImage = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a modification description or select an example');
      return;
    }

    if (useTargetedModification && maskPath.length === 0) {
      alert('Please select an area to modify by drawing on the image');
      return;
    }

    try {
      let maskData = null;
      if (useTargetedModification && maskPath.length > 0) {
        maskData = JSON.stringify({
          type: 'brush_strokes',
          points: maskPath,
          brush_size: brushSize,
          canvas_width: overlayCanvasRef.current?.width || image.width,
          canvas_height: overlayCanvasRef.current?.height || image.height
        });
      }

      const modificationInput: ImageModificationInput = {
        image_id: image.id,
        prompt: prompt.trim(),
        mask_data: maskData,
        parameters: {
          modification_strength: modificationStrength,
          guidance_scale: guidanceScale,
          num_inference_steps: inferenceSteps
        }
      };

      const operation = await trpc.modifyImage.mutate(modificationInput);
      onOperationStarted(operation);
      
      // Clear mask after starting operation
      clearMask();
      setIsSelectionMode(false);
      
    } catch (error) {
      console.error('Failed to start image modification:', error);
      alert('Failed to start image modification. Please try again.');
    }
  }, [prompt, useTargetedModification, maskPath, brushSize, image.id, modificationStrength, guidanceScale, inferenceSteps, onOperationStarted, clearMask]);

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-500" />
            AI Image Modification
          </CardTitle>
          <CardDescription>
            Make specific changes to your image using natural language descriptions. 
            Apply modifications globally or to specific areas you select.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Modification Mode Toggle */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <div>
                    <Label htmlFor="targeted-mode" className="text-base font-medium">
                      Targeted Modification
                    </Label>
                    <p className="text-sm text-gray-600">
                      Apply changes only to selected areas instead of the entire image
                    </p>
                  </div>
                </div>
                <Switch
                  id="targeted-mode"
                  checked={useTargetedModification}
                  onCheckedChange={setUseTargetedModification}
                  disabled={isProcessing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selection Tools (only shown for targeted mode) */}
          {useTargetedModification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={isSelectionMode ? "default" : "outline"}
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Brush className="w-4 h-4" />
                  {isSelectionMode ? 'Selection Mode ON' : 'Start Area Selection'}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearMask}
                  disabled={isProcessing || maskPath.length === 0}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Selection
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brush-size-mod">Selection Brush Size: {brushSize}px</Label>
                <Slider
                  id="brush-size-mod"
                  min={5}
                  max={50}
                  step={5}
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  disabled={isProcessing}
                  className="w-full"
                />
              </div>

              {isSelectionMode && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Target className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Targeted Mode:</strong> Draw on the image to select areas where you want to apply modifications. 
                    The blue overlay shows your selection. Only the selected areas will be modified.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Separator />

          {/* Modification Examples */}
          <div className="space-y-4">
            <h4 className="font-medium">Modification Examples</h4>
            <div className="grid gap-4">
              {modificationExamples.map((category) => (
                <Card key={category.category} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-700">
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-2">
                      {category.examples.map((example, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          onClick={() => handleExampleSelect(example)}
                          disabled={isProcessing}
                          className="justify-start text-left h-auto p-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                          {example}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Modification Input */}
          <div className="space-y-2">
            <Label htmlFor="modification-prompt">Describe Your Modification</Label>
            <Textarea
              id="modification-prompt"
              placeholder="Describe what you want to change in the image... (e.g., 'change the sky to a sunset', 'add mountains in the background', 'make the car blue')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Be specific about what to change and how you want it to look
            </p>
          </div>

          <Separator />

          {/* Modification Parameters */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="mod-strength">Modification Strength: {modificationStrength}</Label>
              <Slider
                id="mod-strength"
                min={0.1}
                max={1}
                step={0.1}
                value={[modificationStrength]}
                onValueChange={(value) => setModificationStrength(value[0])}
                disabled={isProcessing}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                How dramatically to modify the image
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guidance-scale-mod">Guidance Scale: {guidanceScale}</Label>
              <Slider
                id="guidance-scale-mod"
                min={1}
                max={20}
                step={0.5}
                value={[guidanceScale]}
                onValueChange={(value) => setGuidanceScale(value[0])}
                disabled={isProcessing}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Controls adherence to description
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inference-steps-mod">Quality Steps: {inferenceSteps}</Label>
              <Slider
                id="inference-steps-mod"
                min={10}
                max={100}
                step={10}
                value={[inferenceSteps]}
                onValueChange={(value) => setInferenceSteps(value[0])}
                disabled={isProcessing}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Higher = better quality, longer processing
              </p>
            </div>
          </div>

          <Separator />

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleModifyImage}
              disabled={isProcessing || !prompt.trim() || (useTargetedModification && maskPath.length === 0)}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              {isProcessing ? 'Modifying...' : 'Apply AI Modification'}
            </Button>
          </div>

          {/* Current Settings Preview */}
          {prompt && (
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Edit3 className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm mb-1">Modification to Apply:</h5>
                    <p className="text-sm text-gray-700 mb-2">"{prompt}"</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">
                        {useTargetedModification ? 'Targeted' : 'Global'} Modification
                      </Badge>
                      <Badge variant="outline">Strength: {Math.round(modificationStrength * 100)}%</Badge>
                      <Badge variant="outline">Guidance: {guidanceScale}</Badge>
                      <Badge variant="outline">Steps: {inferenceSteps}</Badge>
                      {useTargetedModification && maskPath.length > 0 && (
                        <Badge variant="outline">Area Selected</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="w-5 h-5" />
            {useTargetedModification ? 'Select Area to Modify' : 'Original Image'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex justify-center bg-gray-50 rounded-lg p-4 relative">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-gray-200 rounded shadow-sm max-w-full"
              />
              {useTargetedModification && (
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 pointer-events-auto cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">💡 Modification Tips:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Use specific, descriptive language: "bright red Ferrari" vs "red car"</li>
            <li>• For color changes, mention the original: "change the blue car to red"</li>
            <li>• Targeted modifications work better for specific objects</li>
            <li>• Global modifications are great for lighting, weather, and atmosphere</li>
            <li>• Higher strength values create more dramatic changes</li>
            <li>• Processing typically takes 2-4 minutes depending on complexity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}