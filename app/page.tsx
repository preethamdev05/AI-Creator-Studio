'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db, signInWithGoogle, logOut } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Video, LayoutDashboard, Folder, Library, Settings as SettingsIcon, Loader2, LogOut, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { StudioTab } from '@/components/studio-tab';
import { ProjectsTab } from '@/components/projects-tab';
import { AssetsTab } from '@/components/assets-tab';
import { SettingsTab } from '@/components/settings-tab';

export default function Home() {
  const { user, loading, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState('studio');
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCredits(docSnap.data().credits);
      }
    });
    return () => unsubscribe();
  }, [user]);

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="h-20 w-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto border border-zinc-800 shadow-2xl">
              <Video className="h-10 w-10 text-indigo-500" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">AI Creator Studio</h1>
            <p className="text-zinc-400 text-lg">
              Convert a single prompt into fully produced video assets with automation, editing, and publishing capabilities.
            </p>
          </div>
          <Button 
            size="lg" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={async () => {
              try {
                await signInWithGoogle();
              } catch (e) {
                toast.error('Failed to sign in');
              }
            }}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'studio', label: 'Studio', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'projects', label: 'Projects', icon: <Folder className="h-5 w-5" /> },
    { id: 'assets', label: 'Assets', icon: <Library className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800/50">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Video className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Creator Studio</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800/50 space-y-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-zinc-300">Credits</span>
            </div>
            <span className="text-sm font-bold text-white">{credits !== null ? credits : '...'}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{user.displayName || 'Creator'}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logOut} className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Video className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 mr-2">
              <Coins className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs font-bold text-white">{credits !== null ? credits : '...'}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logOut} className="text-zinc-400 hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Navigation */}
        <nav className="md:hidden border-b border-zinc-800 bg-zinc-950 flex overflow-x-auto hide-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap transition-colors border-b-2 ${
                activeTab === item.id 
                  ? 'border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'studio' && <StudioTab />}
          {activeTab === 'projects' && <ProjectsTab />}
          {activeTab === 'assets' && <AssetsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
