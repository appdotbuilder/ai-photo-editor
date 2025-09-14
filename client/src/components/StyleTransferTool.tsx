import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Palette, Wand2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { ImageCanvas } from './ImageCanvas';
import type { Image, AIOperation, StyleTransferInput } from '../../../server/src/schema';

interface StyleTransferToolProps {
  image: Image;
  imageSrc: string;
  onOperationStarted: (operation: AIOperation) => void;
  isProcessing: boolean;
}

// Predefined style presets
const stylePresets = [
  {
    name: 'Watercolor Painting',
    prompt: 'watercolor painting style, soft colors, artistic brush strokes, dreamy atmosphere',
    icon: '🎨'
  },
  {
    name: 'Oil Painting',
    prompt: 'oil painting style, thick brushstrokes, rich textures, classical art',
    icon: '🖼️'
  },
  {
    name: 'Pencil Sketch',
    prompt: 'pencil sketch drawing, black and white, detailed linework, artistic shading',
    icon: '✏️'
  },
  {
    name: 'Anime Style',
    prompt: 'anime art style, vibrant colors, clean lines, Japanese animation aesthetic',
    icon: '🌟'
  },
  {
    name: 'Pop Art',
    prompt: 'pop art style, bold colors, high contrast, Andy Warhol inspired',
    icon: '🎭'
  },
  {
    name: 'Impressionist',
    prompt: 'impressionist painting style, loose brushwork, light and color emphasis, Monet style',
    icon: '🌅'
  },
  {
    name: 'Cartoon',
    prompt: 'cartoon style, simplified forms, bright colors, playful illustration',
    icon: '🎪'
  },
  {
    name: 'Cyberpunk',
    prompt: 'cyberpunk aesthetic, neon colors, futuristic, dark atmosphere with bright accents',
    icon: '🤖'
  }
];

export function StyleTransferTool({ 
  image, 
  imageSrc, 
  onOperationStarted,
  isProcessing 
}: StyleTransferToolProps) {
  const [prompt, setPrompt] = useState('');
  const [styleStrength, setStyleStrength] = useState(0.7);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [inferenceSteps, setInferenceSteps] = useState(50);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: typeof stylePresets[0]) => {
    setPrompt(preset.prompt);
    setSelectedPreset(preset.name);
  }, []);

  // Start style transfer
  const handleApplyStyle = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a style description or select a preset');
      return;
    }

    try {
      const styleInput: StyleTransferInput = {
        image_id: image.id,
        prompt: prompt.trim(),
        parameters: {
          style_strength: styleStrength,
          guidance_scale: guidanceScale,
          num_inference_steps: inferenceSteps
        }
      };

      const operation = await trpc.applyStyleTransfer.mutate(styleInput);
      onOperationStarted(operation);
      
    } catch (error) {
      console.error('Failed to start style transfer:', error);
      alert('Failed to start style transfer. Please try again.');
    }
  }, [prompt, image.id, styleStrength, guidanceScale, inferenceSteps, onOperationStarted]);

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-500" />
            AI Style Transfer
          </CardTitle>
          <CardDescription>
            Transform your image with artistic styles using AI. Choose from presets or describe your own style.
            The AI will reimagine your entire image in the selected artistic style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Style Presets */}
          <div className="space-y-4">
            <h4 className="font-medium">Quick Style Presets</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stylePresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant={selectedPreset === preset.name ? "default" : "outline"}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={isProcessing}
                  className="h-auto p-3 flex flex-col items-center gap-2 text-sm"
                >
                  <span className="text-2xl">{preset.icon}</span>
                  <span className="text-center leading-tight">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Style Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="style-prompt" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Style Description
              </Label>
              <Textarea
                id="style-prompt"
                placeholder="Describe the artistic style you want to apply... (e.g., 'vintage film noir style with high contrast and dramatic shadows')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isProcessing}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Be specific about colors, techniques, and artistic movements for better results
              </p>
            </div>
          </div>

          <Separator />

          {/* Style Parameters */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="style-strength">Style Strength: {styleStrength}</Label>
              <Slider
                id="style-strength"
                min={0.1}
                max={1}
                step={0.1}
                value={[styleStrength]}
                onValueChange={(value) => setStyleStrength(value[0])}
                disabled={isProcessing}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                How strongly the style is applied
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
                Controls adherence to style description
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inference-steps">Quality Steps: {inferenceSteps}</Label>
              <Slider
                id="inference-steps"
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
              onClick={handleApplyStyle}
              disabled={isProcessing || !prompt.trim()}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              {isProcessing ? 'Applying Style...' : 'Transform with AI Style'}
            </Button>
          </div>

          {/* Current Settings Preview */}
          {prompt && (
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm mb-1">Style to Apply:</h5>
                    <p className="text-sm text-gray-700 mb-2">"{prompt}"</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">Strength: {Math.round(styleStrength * 100)}%</Badge>
                      <Badge variant="outline">Guidance: {guidanceScale}</Badge>
                      <Badge variant="outline">Steps: {inferenceSteps}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Original Image Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="w-5 h-5" />
            Original Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageCanvas 
            image={image}
            imageSrc={imageSrc}
            showTools={false}
          />
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">🎨 Style Transfer Tips:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Use specific art movements: "impressionist", "cubist", "art nouveau"</li>
            <li>• Mention techniques: "oil painting", "watercolor", "digital art", "pencil sketch"</li>
            <li>• Include mood descriptors: "dreamy", "dramatic", "vibrant", "moody"</li>
            <li>• Lower style strength preserves more of the original image structure</li>
            <li>• Higher quality steps produce better results but take longer to process</li>
            <li>• Processing typically takes 2-5 minutes depending on complexity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}