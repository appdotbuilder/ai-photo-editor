import { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react';
import type { Image } from '../../../server/src/schema';

interface ImageCanvasProps {
  image: Image;
  imageSrc: string;
  showTools?: boolean;
}

export function ImageCanvas({ image, imageSrc, showTools = true }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Calculate optimal canvas size to fit container
      const containerRect = container.getBoundingClientRect();
      const maxWidth = Math.min(containerRect.width - 40, 800);
      const maxHeight = Math.min(containerRect.height - 40, 600);
      
      const aspectRatio = img.width / img.height;
      let displayWidth = maxWidth;
      let displayHeight = maxWidth / aspectRatio;
      
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      
      setCanvasSize({ width: displayWidth, height: displayHeight });
      
      // Draw image
      drawImage();
    };
    img.src = imageSrc;

    function drawImage() {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      // Apply transformations
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x, pan.y);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      ctx.restore();
    }

    // Redraw when zoom or pan changes
    drawImage();
  }, [imageSrc, zoom, pan]);

  // Handle mouse events for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setPan(prev => ({
      x: prev.x + deltaX / zoom,
      y: prev.y + deltaY / zoom
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `edited_${image.original_filename}`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    const canvas = canvasRef.current;
    if (canvas && canvas.requestFullscreen) {
      canvas.requestFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Canvas Controls */}
      {showTools && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Zoom: {Math.round(zoom * 100)}%
            </Badge>
            <Badge variant="outline" className="text-sm">
              {canvasSize.width} × {canvasSize.height}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="px-3"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="px-3"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetView}
              className="px-3"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              className="px-3"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="px-3"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex justify-center bg-gray-50 rounded-lg p-4 min-h-[400px]">
            <canvas
              ref={canvasRef}
              className={`border border-gray-200 rounded shadow-sm max-w-full max-h-[600px] ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                imageRendering: zoom > 2 ? 'pixelated' : 'auto'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500">
        <p>💡 Drag to pan • Use zoom controls to get a closer look • Download to save your work</p>
      </div>
    </div>
  );
}