import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileImage, Loader2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Image, UploadImageInput } from '../../../server/src/schema';

interface ImageUploaderProps {
  onImageUploaded: (image: Image, imageSrc: string) => void;
}

export function ImageUploader({ onImageUploaded }: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string>('');

  // Handle file selection and upload
  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Get image dimensions
      const dimensions = await getImageDimensions(file);
      
      // Prepare upload data
      const uploadData: UploadImageInput = {
        filename: `${Date.now()}_${file.name}`,
        original_filename: file.name,
        file_path: `/uploads/${Date.now()}_${file.name}`, // This would be handled by actual upload service
        file_size: file.size,
        mime_type: file.type,
        width: dimensions.width,
        height: dimensions.height
      };

      // Upload image via tRPC
      const uploadedImage = await trpc.uploadImage.mutate(uploadData);
      
      // Create object URL for immediate display (in real implementation, this would be the actual uploaded image URL)
      const imageSrc = URL.createObjectURL(file);
      
      onImageUploaded(uploadedImage, imageSrc);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onImageUploaded]);

  // Get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8">
          <div className="text-center">
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500" />
                <div>
                  <p className="text-lg font-medium text-gray-700">Uploading your image...</p>
                  <p className="text-sm text-gray-500">Please wait while we process your file</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drop your image here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports JPG, PNG, WebP • Max 10MB • Min 256×256 pixels
                  </p>
                </div>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploading}
                />
                <Button 
                  asChild
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  disabled={isUploading}
                >
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <FileImage className="w-4 h-4 mr-2" />
                    Choose Image
                  </label>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview && !isUploading && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Preview:</h3>
            <div className="flex justify-center">
              <img 
                src={preview} 
                alt="Preview" 
                className="max-w-full max-h-64 rounded-lg shadow-md"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}