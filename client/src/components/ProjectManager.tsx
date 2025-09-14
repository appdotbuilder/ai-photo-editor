import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FolderPlus, 
  Folder, 
  Save, 
  Plus, 
  Eye, 
  Lock, 
  Unlock,
  Calendar,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Image, Project, CreateProjectInput, UpdateProjectInput } from '../../../server/src/schema';

interface ProjectManagerProps {
  currentImage: Image | null;
  activeProject: Project | null;
  onProjectChange: (project: Project | null) => void;
}

export function ProjectManager({ 
  currentImage, 
  activeProject, 
  onProjectChange 
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectIsPublic, setNewProjectIsPublic] = useState(false);

  // Load projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.listProjects.query({
        limit: 20,
        offset: 0,
        public_only: false
      });
      setProjects(result.projects);
      setError('');
    } catch (err) {
      setError('Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Create new project
  const handleCreateProject = useCallback(async () => {
    if (!currentImage) {
      setError('Please upload an image first');
      return;
    }

    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    try {
      const createInput: CreateProjectInput = {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        original_image_id: currentImage.id,
        is_public: newProjectIsPublic
      };

      const createdProject = await trpc.createProject.mutate(createInput);
      
      // Add to projects list
      setProjects((prev: Project[]) => [createdProject, ...prev]);
      
      // Set as active project
      onProjectChange(createdProject);
      
      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectIsPublic(false);
      setShowCreateForm(false);
      setError('');
      
    } catch (err) {
      setError('Failed to create project');
      console.error('Failed to create project:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentImage, newProjectName, newProjectDescription, newProjectIsPublic, onProjectChange]);

  // Save current project
  const handleSaveProject = useCallback(async () => {
    if (!activeProject || !currentImage) return;

    setIsLoading(true);
    try {
      // In a real implementation, we would track the current image path and operations history
      const updateInput: UpdateProjectInput = {
        id: activeProject.id,
        current_image_path: `/results/current_${activeProject.id}_${Date.now()}.jpg`,
        operations_history: JSON.stringify({
          last_updated: new Date().toISOString(),
          operations_count: 0 // This would be tracked from actual operations
        })
      };

      const updatedProject = await trpc.updateProject.mutate(updateInput);
      
      if (updatedProject) {
        // Update in projects list
        setProjects((prev: Project[]) => 
          prev.map((p: Project) => p.id === updatedProject.id ? updatedProject : p)
        );
        
        // Update active project
        onProjectChange(updatedProject);
      } else {
        setError('Failed to update project');
      }
      setError('');
      
    } catch (err) {
      setError('Failed to save project');
      console.error('Failed to save project:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject, currentImage, onProjectChange]);

  // Select project
  const handleSelectProject = useCallback(async (project: Project) => {
    try {
      // Load the project details
      const fullProject = await trpc.getProject.query({ id: project.id });
      if (fullProject) {
        onProjectChange(fullProject);
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Failed to load project:', err);
    }
  }, [onProjectChange]);

  return (
    <div className="space-y-6">
      {/* Active Project Display */}
      {activeProject && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Folder className="w-5 h-5 text-green-600" />
              Active Project: {activeProject.name}
            </CardTitle>
            <CardDescription>
              {activeProject.description || 'No description provided'}
            </CardDescription>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created {activeProject.created_at.toLocaleDateString()}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {activeProject.is_public ? (
                  <>
                    <Unlock className="w-3 h-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    Private
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveProject}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Current State
              </Button>
              <Button
                variant="outline"
                onClick={() => onProjectChange(null)}
              >
                Close Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Management */}
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-500" />
                Project Management
              </CardTitle>
              <CardDescription>
                Create and manage your photo editing projects to save your work and continue later
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadProjects}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                disabled={!currentImage}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
                <button 
                  onClick={() => setError('')}
                  className="ml-2 text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Create Project Form */}
          {showCreateForm && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Create New Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Describe your project... (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    disabled={isLoading}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="project-public"
                    checked={newProjectIsPublic}
                    onCheckedChange={setNewProjectIsPublic}
                    disabled={isLoading}
                  />
                  <Label htmlFor="project-public" className="flex items-center gap-2">
                    {newProjectIsPublic ? (
                      <>
                        <Unlock className="w-4 h-4" />
                        Make project public
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Keep project private
                      </>
                    )}
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateProject}
                    disabled={isLoading || !newProjectName.trim() || !currentImage}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderPlus className="w-4 h-4" />
                    )}
                    Create Project
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProjectName('');
                      setNewProjectDescription('');
                      setNewProjectIsPublic(false);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Projects List */}
          <div className="space-y-2">
            <h4 className="font-medium">Your Projects ({projects.length})</h4>
            
            {isLoading && !showCreateForm && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                <span className="text-gray-600">Loading projects...</span>
              </div>
            )}

            {!isLoading && projects.length === 0 && (
              <Card className="border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderPlus className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-2">No projects yet</p>
                  <p className="text-sm text-gray-400">
                    Create your first project to save your editing work
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoading && projects.length > 0 && (
              <div className="grid gap-3">
                {projects.map((project: Project) => (
                  <Card 
                    key={project.id} 
                    className={`cursor-pointer transition-colors ${
                      activeProject?.id === project.id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectProject(project)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium mb-1">{project.name}</h5>
                          {project.description && (
                            <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              ID: #{project.id}
                            </Badge>
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {project.created_at.toLocaleDateString()}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs flex items-center gap-1 ${
                                project.is_public 
                                  ? 'border-green-300 text-green-700 bg-green-50' 
                                  : 'border-gray-300'
                              }`}
                            >
                              {project.is_public ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  Public
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  Private
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-4"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Tips */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">💡 Project Management Tips:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Projects automatically save your original image and current state</li>
            <li>• Use descriptive names to easily identify your projects later</li>
            <li>• Public projects can be viewed by other users (coming soon)</li>
            <li>• Save frequently to preserve your editing progress</li>
            <li>• Each project maintains a complete operation history</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}