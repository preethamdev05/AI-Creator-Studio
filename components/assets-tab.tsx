'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, Music, Video, FileAudio, Loader2 } from 'lucide-react';

interface Asset {
  id: string;
  type: string;
  url: string;
  createdAt: string;
}

export function AssetsTab() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'assets'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetData: Asset[] = [];
      snapshot.forEach((doc) => {
        assetData.push(doc.data() as Asset);
      });
      assetData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAssets(assetData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assets');
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
        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Asset Library</h2>
      </div>

      {assets.length === 0 ? (
        <div className="border border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/50">
          <ImageIcon className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No assets yet</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Generated images, audio clips, and videos will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group overflow-hidden">
              <div className="aspect-square bg-zinc-950 flex items-center justify-center relative">
                {asset.type === 'image' && (
                  <img src={asset.url} alt="Generated asset" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                )}
                {asset.type === 'audio' && (
                  <div className="flex flex-col items-center gap-2">
                    <Music className="h-8 w-8 text-zinc-700 group-hover:scale-110 transition-transform" />
                    <audio controls src={asset.url} className="w-full max-w-[150px] h-8 mt-2" />
                  </div>
                )}
                {asset.type === 'video' && <Video className="h-8 w-8 text-zinc-700 group-hover:scale-110 transition-transform" />}
                
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-medium uppercase tracking-wider text-zinc-300">
                  {asset.type}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
