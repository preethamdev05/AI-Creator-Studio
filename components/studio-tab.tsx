'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2, Loader2, Play, Image as ImageIcon, Mic, Video } from 'lucide-react';
import { toast } from 'sonner';

export function StudioTab() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Cinematic');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    if (!user) return;
    
    setIsGenerating(true);
    try {
      // 1. Create Project Document
      const projectRef = doc(collection(db, 'projects'));
      const projectId = projectRef.id;
      
      const projectData = {
        id: projectId,
        ownerId: user.uid,
        title: prompt.slice(0, 40) + (prompt.length > 40 ? '...' : ''),
        prompt: prompt,
        status: 'generating',
        stylePreset: style,
        aspectRatio: aspectRatio,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(projectRef, projectData).catch(e => handleFirestoreError(e, OperationType.CREATE, 'projects'));
      setCurrentProjectId(projectId);

      // 2. Simulate AI Generation Delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const script = `[SCENE 1]\nVisual: A cinematic wide shot of ${prompt}\nAudio: "Welcome to the future of content creation."\n\n[SCENE 2]\nVisual: Close up details.\nAudio: "Everything you imagine, brought to life."`;
      setGeneratedScript(script);

      // 3. Update Project Status
      await setDoc(projectRef, {
        ...projectData,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, 'projects'));

      // 4. Create Initial Scene Document
      const sceneRef = doc(collection(db, 'scenes'));
      await setDoc(sceneRef, {
        id: sceneRef.id,
        projectId: projectId,
        ownerId: user.uid,
        order: 0,
        script: script,
        status: 'pending'
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'scenes'));

      toast.success('Script generated successfully! Project saved.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate script');
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
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
                  {generatedScript}
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => toast.info('Visual generation queued.')}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Generate Visuals
                </Button>
                <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => toast.info('Voice synthesis queued.')}>
                  <Mic className="mr-2 h-4 w-4" />
                  Generate Voice
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="aspect-video bg-zinc-950 flex flex-col items-center justify-center relative group cursor-pointer border-b border-zinc-800">
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                </div>
                <Video className="h-12 w-12 text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-medium">Preview will appear here</p>
              </div>
              <div className="p-4 bg-zinc-900 flex justify-between items-center">
                 <div className="text-sm text-zinc-400">Project ID: <span className="font-mono text-zinc-500">{currentProjectId}</span></div>
                 <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => toast.success('Video rendering started!')}>Render Final Video</Button>
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
