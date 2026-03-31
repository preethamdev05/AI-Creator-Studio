'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Clock, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  stylePreset?: string;
}

export function ProjectsTab() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projData: Project[] = [];
      snapshot.forEach((doc) => {
        projData.push(doc.data() as Project);
      });
      // Sort client-side to avoid needing a composite index immediately
      projData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setProjects(projData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Your Projects</h2>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">New Project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="border border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/50">
          <Video className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No projects yet</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Head over to the Studio tab to generate your first AI video project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
              <div className="aspect-video bg-zinc-950 rounded-t-xl flex items-center justify-center border-b border-zinc-800 relative overflow-hidden">
                <Video className="h-10 w-10 text-zinc-800 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider
                    ${project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      project.status === 'generating' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                      'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>
                    {project.status}
                  </span>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-zinc-100 line-clamp-1" title={project.title}>
                    {project.title}
                  </h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-zinc-500 hover:text-zinc-300">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center text-xs text-zinc-500 gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  {project.stylePreset && (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                      {project.stylePreset}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
