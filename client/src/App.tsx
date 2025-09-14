import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wand2, Palette, Scissors, Upload, History } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { ImageUploader } from '@/components/ImageUploader';
import { ImageCanvas } from '@/components/ImageCanvas';
import { ObjectRemovalTool } from '@/components/ObjectRemovalTool';
import { StyleTransferTool } from '@/components/StyleTransferTool';
import { ImageModificationTool } from '@/components/ImageModificationTool';
import { OperationHistory } from '@/components/OperationHistory';
import { ProjectManager } from '@/components/ProjectManager';
// Using type-only imports for better TypeScript compliance
import type { Image, AIOperation, Project } from '../../server/src/schema';

function App() {
  // Main application state
  const [currentImage, setCurrentImage] = useState<Image | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentImageSrc, setCurrentImageSrc] = useState<string>('');
  const [operations, setOperations] = useState<AIOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('upload');

  // Load operations for current image
  const loadOperations = useCallback(async () => {
    if (!currentImage) return;
    
    try {
      const result = await trpc.listOperations.query({ image_id: currentImage.id });
      setOperations(result);
    } catch (err) {
      console.error('Failed to load operations:', err);
    }
  }, [currentImage]);

  // Load operations when image changes
  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  // Handle image upload success
  const handleImageUploaded = useCallback((image: Image, imageSrc: string) => {
    setCurrentImage(image);
    setCurrentImageSrc(imageSrc);
    setActiveTab('canvas');
    setError('');
  }, []);

  // Poll for operation result
  const pollOperationResult = useCallback(async (operationId: number) => {
    const maxAttempts = 60; // Poll for 5 minutes max (5 second intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const result = await trpc.getOperationResult.query({ operation_id: operationId });
        
        if (result) {
          // Update operation in the list
          setOperations((prev: AIOperation[]) => 
            prev.map((op: AIOperation) => op.id === operationId ? result : op)
          );

          if (result.status === 'completed') {
            setIsLoading(false);
            if (result.result_image_path) {
              // Update current image source with result
              setCurrentImageSrc(result.result_image_path);
            }
            return;
          } else if (result.status === 'failed') {
            setIsLoading(false);
            setError(result.error_message || 'Operation failed');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsLoading(false);
          setError('Operation timed out');
        }
      } catch (err) {
        setIsLoading(false);
        setError('Failed to check operation status');
        console.error('Polling error:', err);
      }
    };

    poll();
  }, []);

  // Handle new AI operation started
  const handleOperationStarted = useCallback((operation: AIOperation) => {
    setOperations((prev: AIOperation[]) => [operation, ...prev]);
    setIsLoading(true);
    
    // Start polling for operation result
    pollOperationResult(operation.id);
  }, [pollOperationResult]);

  // Handle project creation/selection
  const handleProjectChange = useCallback((project: Project | null) => {
    setActiveProject(project);
  }, []);

  // Clear error message
  const clearError = useCallback(() => {
    setError('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Photo Editor ✨
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your photos and transform them with powerful AI tools: remove objects intelligently, 
            apply artistic styles, and make precise modifications with simple prompts.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
              <button 
                onClick={clearError}
                className="ml-2 text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-3 p-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-800">AI is processing your image... This may take a few minutes.</span>
            </CardContent>
          </Card>
        )}

        {/* Main Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/80 backdrop-blur-sm border border-gray-200">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="canvas" 
              disabled={!currentImage}
              className="flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              Canvas
            </TabsTrigger>
            <TabsTrigger 
              value="remove" 
              disabled={!currentImage}
              className="flex items-center gap-2"
            >
              <Scissors className="w-4 h-4" />
              Remove Objects
            </TabsTrigger>
            <TabsTrigger 
              value="style" 
              disabled={!currentImage}
              className="flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Style Transfer
            </TabsTrigger>
            <TabsTrigger 
              value="modify" 
              disabled={!currentImage}
              className="flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              Modify Image
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              disabled={!currentImage}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Your Image
                </CardTitle>
                <CardDescription>
                  Select an image file to start editing with AI-powered tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader onImageUploaded={handleImageUploaded} />
              </CardContent>
            </Card>

            {/* Project Manager */}
            <ProjectManager 
              currentImage={currentImage}
              activeProject={activeProject}
              onProjectChange={handleProjectChange}
            />
          </TabsContent>

          {/* Canvas Tab */}
          <TabsContent value="canvas" className="space-y-6">
            {currentImage && (
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Image Canvas
                  </CardTitle>
                  <CardDescription>
                    View and interact with your image. Current image: {currentImage.original_filename}
                  </CardDescription>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {currentImage.width} × {currentImage.height}
                    </Badge>
                    <Badge variant="outline">
                      {(currentImage.file_size / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ImageCanvas 
                    image={currentImage}
                    imageSrc={currentImageSrc}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Object Removal Tab */}
          <TabsContent value="remove" className="space-y-6">
            {currentImage && (
              <ObjectRemovalTool 
                image={currentImage}
                imageSrc={currentImageSrc}
                onOperationStarted={handleOperationStarted}
                isProcessing={isLoading}
              />
            )}
          </TabsContent>

          {/* Style Transfer Tab */}
          <TabsContent value="style" className="space-y-6">
            {currentImage && (
              <StyleTransferTool 
                image={currentImage}
                imageSrc={currentImageSrc}
                onOperationStarted={handleOperationStarted}
                isProcessing={isLoading}
              />
            )}
          </TabsContent>

          {/* Image Modification Tab */}
          <TabsContent value="modify" className="space-y-6">
            {currentImage && (
              <ImageModificationTool 
                image={currentImage}
                imageSrc={currentImageSrc}
                onOperationStarted={handleOperationStarted}
                isProcessing={isLoading}
              />
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <OperationHistory 
              operations={operations}
              onRefresh={loadOperations}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>🎨 AI Photo Editor - Transform your images with artificial intelligence</p>
          <p className="text-sm mt-2">Upload • Edit • Transform • Create</p>
        </div>
      </div>
    </div>
  );
}

export default App;