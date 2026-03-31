'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logOut } from '@/lib/firebase';
import { User, CreditCard, Settings, LogOut, Loader2, Mail, Key } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  credits: number;
  createdAt: string;
}

export function SettingsTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Settings & Billing</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-400" />
              Profile
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Your account details and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-medium text-lg">
                  {profile?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-zinc-100">{profile?.displayName || 'Creator'}</p>
                  <p className="text-sm text-zinc-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profile?.email}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-zinc-400 flex items-center gap-2">
                    <Key className="h-4 w-4" /> Account ID
                  </span>
                  <span className="text-sm font-mono text-zinc-500">{profile?.uid}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-zinc-400 flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Role
                  </span>
                  <span className="text-sm font-medium uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {profile?.role}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
              Credits & Billing
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Manage your generation credits and subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Available Credits</span>
              <div className="text-5xl font-light text-zinc-100 tracking-tighter mb-4">
                {profile?.credits || 0}
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                Purchase Credits
              </Button>
            </div>
            <p className="text-xs text-zinc-500 text-center">
              1 credit = 1 second of generated video or 1 image generation.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-8 border-t border-zinc-800 flex justify-end">
        <Button variant="destructive" onClick={logOut} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
