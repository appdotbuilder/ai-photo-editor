import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  Scissors, 
  Palette, 
  Edit3, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';
import type { AIOperation, AIOperationType, AIOperationStatus } from '../../../server/src/schema';

interface OperationHistoryProps {
  operations: AIOperation[];
  onRefresh: () => void;
}

// Get icon for operation type
const getOperationIcon = (type: AIOperationType) => {
  switch (type) {
    case 'object_removal':
      return <Scissors className="w-4 h-4" />;
    case 'style_transfer':
      return <Palette className="w-4 h-4" />;
    case 'image_modification':
      return <Edit3 className="w-4 h-4" />;
    default:
      return <Edit3 className="w-4 h-4" />;
  }
};

// Get status badge
const getStatusBadge = (status: AIOperationStatus) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
};

// Get operation type label
const getOperationLabel = (type: AIOperationType) => {
  switch (type) {
    case 'object_removal':
      return 'Object Removal';
    case 'style_transfer':
      return 'Style Transfer';
    case 'image_modification':
      return 'Image Modification';
    default:
      return type;
  }
};

// Format processing time
const formatProcessingTime = (timeInSeconds: number | null) => {
  if (timeInSeconds === null) return 'N/A';
  
  if (timeInSeconds < 60) {
    return `${timeInSeconds}s`;
  } else {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }
};

export function OperationHistory({ operations, onRefresh }: OperationHistoryProps) {
  const [expandedOperation, setExpandedOperation] = useState<number | null>(null);

  // Handle operation expansion
  const toggleExpanded = useCallback((operationId: number) => {
    setExpandedOperation(prev => prev === operationId ? null : operationId);
  }, []);

  // Handle result download
  const handleDownloadResult = useCallback((operation: AIOperation) => {
    if (!operation.result_image_path) return;
    
    // In a real implementation, this would download from the actual result path
    // For now, we'll simulate the download
    const link = document.createElement('a');
    link.href = operation.result_image_path;
    link.download = `ai_result_${operation.id}_${Date.now()}.jpg`;
    link.click();
  }, []);

  // Handle view result
  const handleViewResult = useCallback((operation: AIOperation) => {
    if (!operation.result_image_path) return;
    
    // Open result in new tab
    window.open(operation.result_image_path, '_blank');
  }, []);

  if (operations.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            Operation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <History className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">No operations yet</p>
            <p className="text-sm text-gray-400">
              Start editing your image to see the operation history here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              Operation History
            </CardTitle>
            <Button
              variant="outline"
              onClick={onRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {operations.map((operation: AIOperation) => (
            <Card key={operation.id} className="border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-50">
                      {getOperationIcon(operation.operation_type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">
                        {getOperationLabel(operation.operation_type)}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {operation.created_at.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(operation.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(operation.id)}
                      className="px-2"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedOperation === operation.id && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  
                  <div className="space-y-3">
                    {/* Operation Details */}
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Operation ID:</span>
                        <p className="text-gray-600">#{operation.id}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Image ID:</span>
                        <p className="text-gray-600">#{operation.image_id}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Processing Time:</span>
                        <p className="text-gray-600">
                          {formatProcessingTime(operation.processing_time)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Status:</span>
                        <p className="text-gray-600">{operation.status}</p>
                      </div>
                    </div>

                    {/* Prompt (if available) */}
                    {operation.prompt && (
                      <div>
                        <span className="font-medium text-gray-700">Prompt:</span>
                        <p className="text-gray-600 text-sm mt-1 p-2 bg-gray-50 rounded">
                          "{operation.prompt}"
                        </p>
                      </div>
                    )}

                    {/* Parameters (if available) */}
                    {operation.parameters && (
                      <div>
                        <span className="font-medium text-gray-700">Parameters:</span>
                        <div className="mt-1">
                          {(() => {
                            try {
                              const params = JSON.parse(operation.parameters);
                              return (
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(params).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-xs">
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              );
                            } catch {
                              return (
                                <p className="text-gray-600 text-sm">
                                  {operation.parameters}
                                </p>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Error Message (if failed) */}
                    {operation.status === 'failed' && operation.error_message && (
                      <Alert className="border-red-200 bg-red-50">
                        <XCircle className="w-4 h-4" />
                        <AlertDescription className="text-red-800">
                          <strong>Error:</strong> {operation.error_message}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2">
                      <div className="text-xs text-gray-500">
                        Last updated: {operation.updated_at.toLocaleString()}
                      </div>
                      
                      {operation.status === 'completed' && operation.result_image_path && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResult(operation)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View Result
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadResult(operation)}
                            className="flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Summary Stats */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {operations.length}
                  </div>
                  <div className="text-xs text-gray-600">Total Operations</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {operations.filter((op: AIOperation) => op.status === 'completed').length}
                  </div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {operations.filter((op: AIOperation) => 
                      op.status === 'pending' || op.status === 'processing'
                    ).length}
                  </div>
                  <div className="text-xs text-gray-600">In Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {operations.filter((op: AIOperation) => op.status === 'failed').length}
                  </div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}