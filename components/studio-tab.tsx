'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2, Loader2, Play, Image as ImageIcon, Mic, Video, Type, ListTree } from 'lucide-react';
import { toast } from 'sonner';

export function StudioTab() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Cinematic');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProjectId || !user) return;

    const q = query(
      collection(db, 'jobs'),
      where('projectId', '==', currentProjectId),
      where('type', '==', 'ffmpeg_render')
    );

    const unsubscribeJobs = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Get the most recent render job
        const jobDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        jobDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latestJob = jobDocs[0];
        
        setRenderStatus(latestJob.status);
        if (latestJob.progress !== undefined) {
          setRenderProgress(latestJob.progress);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jobs');
    });

    const scenesQuery = query(
      collection(db, 'scenes'),
      where('projectId', '==', currentProjectId)
    );

    const unsubscribeScenes = onSnapshot(scenesQuery, (snapshot) => {
      const sceneDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      sceneDocs.sort((a, b) => a.order - b.order);
      setScenes(sceneDocs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scenes');
    });

    const assetsQuery = query(
      collection(db, 'assets'),
      where('projectId', '==', currentProjectId),
      where('type', '==', 'video')
    );

    const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const assetDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        assetDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setVideoUrl(assetDocs[0].url);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assets');
    });

    return () => {
      unsubscribeJobs();
      unsubscribeScenes();
      unsubscribeAssets();
    };
  }, [currentProjectId, user]);

  const handleGenerateVisuals = async () => {
    if (!currentProjectId) return;
    toast.info('Queuing visual generation...');
    try {
      const jobRef = doc(collection(db, 'jobs'));
      await setDoc(jobRef, {
        id: jobRef.id,
        projectId: currentProjectId,
        ownerId: user?.uid,
        type: 'ai_visuals',
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payload: JSON.stringify({
          projectId: currentProjectId,
        }),
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'jobs'));

      // Trigger processing
      fetch('/api/jobs/process', { method: 'POST' });
      toast.success('Visual generation queued!');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to queue visual generation');
    }
  };

  const handleGenerateVoice = async () => {
    if (!currentProjectId) return;
    toast.info('Queuing voice synthesis...');
    try {
      const jobRef = doc(collection(db, 'jobs'));
      await setDoc(jobRef, {
        id: jobRef.id,
        projectId: currentProjectId,
        ownerId: user?.uid,
        type: 'ai_voice',
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payload: JSON.stringify({
          projectId: currentProjectId,
        }),
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'jobs'));

      // Trigger processing
      fetch('/api/jobs/process', { method: 'POST' });
      toast.success('Voice synthesis queued!');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to queue voice synthesis');
    }
  };
  const handleGenerateCaptions = async () => {
    if (!currentProjectId) return;
    toast.info('Queuing caption generation...');
    try {
      const jobRef = doc(collection(db, 'jobs'));
      await setDoc(jobRef, {
        id: jobRef.id,
        projectId: currentProjectId,
        ownerId: user?.uid,
        type: 'ai_captions',
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payload: JSON.stringify({
          projectId: currentProjectId,
        }),
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'jobs'));

      fetch('/api/jobs/process', { method: 'POST' });
      toast.success('Caption generation queued!');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to queue caption generation');
    }
  };

  const handleGenerateScenePlan = async () => {
    if (!currentProjectId) return;
    toast.info('Queuing scene plan generation...');
    try {
      const jobRef = doc(collection(db, 'jobs'));
      await setDoc(jobRef, {
        id: jobRef.id,
        projectId: currentProjectId,
        ownerId: user?.uid,
        type: 'ai_scene_plan',
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payload: JSON.stringify({
          projectId: currentProjectId,
        }),
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'jobs'));

      fetch('/api/jobs/process', { method: 'POST' });
      toast.success('Scene plan generation queued!');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to queue scene plan generation');
    }
  };

  const handleRenderVideo = async () => {
    if (!currentProjectId) return;
    toast.info('Queuing video rendering...');
    try {
      const jobRef = doc(collection(db, 'jobs'));
      await setDoc(jobRef, {
        id: jobRef.id,
        projectId: currentProjectId,
        ownerId: user?.uid,
        type: 'ffmpeg_render',
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payload: JSON.stringify({
          projectId: currentProjectId,
        }),
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'jobs'));

      fetch('/api/jobs/process', { method: 'POST' });
      toast.success('Video rendering queued!');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to queue video rendering');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    if (!user) return;
    
    setIsGenerating(true);
    try {
      const token = await user.getIdToken();
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          style,
          aspectRatio
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();
      setCurrentProjectId(data.projectId);

      // Trigger job processing
      toast.info('Processing script generation...');
      const processResponse = await fetch('/api/jobs/process', {
        method: 'POST',
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process job');
      }

      // Fetch the generated scenes to display
      // For now, we'll just show a success message
      toast.success('Script generated successfully! Project saved.');
      setGeneratedScript('Script generation completed. Check the Projects tab for details.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left Column - Input */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Create New Video</CardTitle>
            <CardDescription className="text-zinc-400">
              Describe the video you want to generate. Be as detailed as possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-zinc-300">Prompt</Label>
              <Textarea 
                id="prompt" 
                placeholder="A cinematic documentary about the history of space exploration..."
                className="min-h-[150px] bg-zinc-950 border-zinc-800 text-zinc-100 resize-none focus-visible:ring-indigo-500"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Style</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:ring-indigo-500 focus:border-indigo-500"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="Cinematic">Cinematic</option>
                  <option value="Vlog">Vlog</option>
                  <option value="Documentary">Documentary</option>
                  <option value="TikTok/Reel">TikTok/Reel</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Aspect Ratio</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:ring-indigo-500 focus:border-indigo-500"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <option value="9:16">9:16 (Vertical)</option>
                  <option value="16:9">16:9 (Horizontal)</option>
                  <option value="1:1">1:1 (Square)</option>
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Script...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right Column - Output/Preview */}
      <div className="lg:col-span-7 space-y-6">
        {generatedScript ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-indigo-400" />
                  Generated Script
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-sm text-zinc-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {generatedScript}
                </div>
                
                {scenes.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Scenes ({scenes.length})</h4>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {scenes.map((scene, idx) => (
                        <div key={scene.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-indigo-400">Scene {idx + 1}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                              {scene.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-zinc-300">
                            <span className="text-zinc-500 block mb-1">Script:</span>
                            {scene.script}
                          </div>
                          
                          {scene.scenePlan && (
                            <div className="text-sm text-zinc-300 border-t border-zinc-800 pt-2">
                              <span className="text-zinc-500 block mb-1">Scene Plan:</span>
                              {scene.scenePlan}
                            </div>
                          )}
                          
                          {scene.captions && (
                            <div className="text-sm text-zinc-300 border-t border-zinc-800 pt-2">
                              <span className="text-zinc-500 block mb-1">Captions:</span>
                              {scene.captions}
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2 border-t border-zinc-800">
                            {scene.imageUrl && (
                              <div className="h-16 w-16 rounded overflow-hidden bg-zinc-900 border border-zinc-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={scene.imageUrl} alt={`Scene ${idx + 1}`} className="h-full w-full object-cover" />
                              </div>
                            )}
                            {scene.audioUrl && (
                              <div className="flex-1 flex items-center px-3 rounded bg-zinc-900 border border-zinc-800">
                                <audio src={scene.audioUrl} controls className="h-8 w-full" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={handleGenerateScenePlan}>
                  <ListTree className="mr-2 h-4 w-4" />
                  Scene Plan
                </Button>
                <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={handleGenerateVisuals}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Visuals
                </Button>
                <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={handleGenerateVoice}>
                  <Mic className="mr-2 h-4 w-4" />
                  Voice
                </Button>
                <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={handleGenerateCaptions}>
                  <Type className="mr-2 h-4 w-4" />
                  Captions
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="aspect-video bg-zinc-950 flex flex-col items-center justify-center relative group border-b border-zinc-800">
                {videoUrl ? (
                  <video src={videoUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Play className="h-8 w-8 text-white ml-1" />
                      </div>
                    </div>
                    <Video className="h-12 w-12 text-zinc-800 mb-4" />
                    <p className="text-zinc-500 font-medium">Preview will appear here</p>
                  </>
                )}
              </div>
              <div className="p-4 bg-zinc-900 flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                   <div className="text-sm text-zinc-400">Project ID: <span className="font-mono text-zinc-500">{currentProjectId}</span></div>
                   <Button 
                     size="sm" 
                     className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                     onClick={handleRenderVideo}
                     disabled={renderStatus === 'queued' || renderStatus === 'processing'}
                   >
                     {renderStatus === 'queued' || renderStatus === 'processing' ? (
                       <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rendering...</>
                     ) : (
                       'Render Final Video'
                     )}
                   </Button>
                 </div>
                 
                 {(renderStatus === 'queued' || renderStatus === 'processing' || renderStatus === 'completed') && renderProgress !== null && (
                   <div className="space-y-2">
                     <div className="flex justify-between text-xs text-zinc-400">
                       <span>{renderStatus === 'completed' ? 'Rendering Complete' : 'Rendering Progress'}</span>
                       <span>{renderProgress}%</span>
                     </div>
                     <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                         style={{ width: `${renderProgress}%` }}
                       />
                     </div>
                   </div>
                 )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="h-full min-h-[400px] border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-500 p-8 text-center bg-zinc-900/50">
            <Wand2 className="h-12 w-12 mb-4 text-zinc-700" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">Ready to Create</h3>
            <p className="max-w-sm">
              Enter a prompt on the left to start the AI generation pipeline. We&apos;ll create a script, generate visuals, and synthesize voice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
