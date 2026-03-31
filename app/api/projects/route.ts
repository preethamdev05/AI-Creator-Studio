import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const userId = authResult.user?.uid;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prompt, style, aspectRatio } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const projectRef = getAdminDb().collection('projects').doc();
    const newProject = {
      id: projectRef.id,
      ownerId: userId,
      title: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
      prompt: prompt,
      status: 'generating',
      stylePreset: style || 'cinematic',
      aspectRatio: aspectRatio || '16:9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await projectRef.set(newProject);

    // Create a job for script generation
    const jobRef = getAdminDb().collection('jobs').doc();
    await jobRef.set({
      id: jobRef.id,
      projectId: projectRef.id,
      ownerId: userId,
      type: 'ai_script',
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload: JSON.stringify({
        prompt,
        style: newProject.stylePreset,
      }),
      result: null,
      error: null,
    });

    return NextResponse.json({
      projectId: projectRef.id,
      jobId: jobRef.id,
      message: 'Project created and script generation started',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const userId = authResult.user?.uid;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projectsSnapshot = await getAdminDb()
      .collection('projects')
      .where('ownerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
