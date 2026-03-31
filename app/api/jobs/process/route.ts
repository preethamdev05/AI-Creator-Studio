import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getGemini } from '@/lib/gemini';
import { FieldValue } from 'firebase-admin/firestore';

const JOB_COSTS: Record<string, number> = {
  'ai_script': 10,
  'ai_scene_plan': 5,
  'ai_visuals': 20,
  'ai_voice': 15,
  'ai_captions': 5,
  'ffmpeg_render': 50
};

export async function POST(req: NextRequest) {
  // In a real app, this would be secured (e.g., via Cloud Tasks or a secret header)
  // For this prototype, we'll allow it to be called to process pending jobs.
  
  try {
    const db = getAdminDb();
    
    // Find a pending job
    const jobsSnapshot = await db.collection('jobs')
      .where('status', '==', 'queued')
      .limit(1)
      .get();

    if (jobsSnapshot.empty) {
      return NextResponse.json({ message: 'No pending jobs' }, { status: 200 });
    }

    const jobDoc = jobsSnapshot.docs[0];
    const job = jobDoc.data();
    const payload = job.payload ? JSON.parse(job.payload) : {};
    
    // Mark as processing
    await jobDoc.ref.update({
      status: 'processing',
      progress: 0,
      updatedAt: new Date().toISOString()
    });

    let result = null;

    try {
      if (job.type === 'ai_script') {
        result = await processAiScript(job, payload);
      } else if (job.type === 'ai_visuals') {
        result = await processAiVisuals(job, payload);
      } else if (job.type === 'ai_voice') {
        result = await processAiVoice(job, payload);
      } else if (job.type === 'ai_scene_plan') {
        result = await processAiScenePlan(job, payload);
      } else if (job.type === 'ai_captions') {
        result = await processAiCaptions(job, payload);
      } else if (job.type === 'ffmpeg_render') {
        result = await processFfmpegRender(job, payload);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      // Deduct credits on success
      const cost = JOB_COSTS[job.type] || 0;
      if (cost > 0 && job.ownerId) {
        const userRef = db.collection('users').doc(job.ownerId);
        await userRef.update({
          credits: FieldValue.increment(-cost)
        });
      }

      // Mark as completed
      await jobDoc.ref.update({
        status: 'completed',
        progress: 100,
        result: JSON.stringify(result),
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({ message: 'Job processed successfully', jobId: jobDoc.id }, { status: 200 });
    } catch (jobError: any) {
      console.error(`Error processing job ${jobDoc.id}:`, jobError);
      await jobDoc.ref.update({
        status: 'failed',
        result: JSON.stringify({ error: jobError.message }),
        updatedAt: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Job processing failed', details: jobError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in job processor:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

async function processAiScript(job: any, payload: any) {
  const { prompt, style } = payload;
  const ai = getGemini();

  const systemInstruction = `You are an expert video producer and scriptwriter.
Create a script for a video based on the user's prompt.
The style should be: ${style}.
Output the script as a JSON array of scenes.
Each scene should have:
- order: number (starting from 0)
- visual: string (description of the visual)
- audio: string (voiceover or dialogue)
- imagePrompt: string (a prompt to generate an image for this scene)
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('No text returned from Gemini');
  }

  const scenes = JSON.parse(text);
  const db = getAdminDb();

  // Save scenes to Firestore
  const batch = db.batch();
  for (const scene of scenes) {
    const sceneRef = db.collection('scenes').doc();
    batch.set(sceneRef, {
      id: sceneRef.id,
      projectId: job.projectId,
      ownerId: job.ownerId,
      order: scene.order,
      script: `Visual: ${scene.visual}\nAudio: ${scene.audio}`,
      imagePrompt: scene.imagePrompt,
      voicePrompt: scene.audio,
      status: 'pending',
    });
  }

  // Update project status
  const projectRef = db.collection('projects').doc(job.projectId);
  batch.update(projectRef, {
    status: 'draft',
    updatedAt: new Date().toISOString()
  });

  await batch.commit();

  return { scenesGenerated: scenes.length };
}

async function processAiVisuals(job: any, payload: any) {
  const { sceneId, projectId, imagePrompt } = payload;
  const ai = getGemini();
  const db = getAdminDb();

  let scenesToProcess: any[] = [];
  if (sceneId) {
    const sceneDoc = await db.collection('scenes').doc(sceneId).get();
    if (sceneDoc.exists) {
      scenesToProcess.push({ id: sceneDoc.id, ...sceneDoc.data() });
    }
  } else if (projectId) {
    const scenesSnapshot = await db.collection('scenes').where('projectId', '==', projectId).get();
    scenesToProcess = scenesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  if (scenesToProcess.length === 0) {
    throw new Error('No scenes found to process');
  }

  const batch = db.batch();
  const generatedAssets = [];

  for (const scene of scenesToProcess) {
    const promptToUse = imagePrompt || scene.imagePrompt || scene.script;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: promptToUse },
        ],
      },
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      console.error(`Failed to generate image for scene ${scene.id}`);
      continue;
    }

    // Save asset
    const assetRef = db.collection('assets').doc();
    batch.set(assetRef, {
      id: assetRef.id,
      ownerId: job.ownerId,
      projectId: job.projectId,
      type: 'image',
      url: imageUrl,
      createdAt: new Date().toISOString()
    });

    generatedAssets.push(assetRef.id);

    // Update scene
    const sceneRef = db.collection('scenes').doc(scene.id);
    batch.update(sceneRef, {
      imageUrl: imageUrl,
      status: 'completed'
    });
  }

  await batch.commit();

  return { assetsGenerated: generatedAssets.length, assetIds: generatedAssets };
}

async function processAiVoice(job: any, payload: any) {
  const { sceneId, projectId, voicePrompt } = payload;
  const ai = getGemini();
  const db = getAdminDb();

  let scenesToProcess: any[] = [];
  if (sceneId) {
    const sceneDoc = await db.collection('scenes').doc(sceneId).get();
    if (sceneDoc.exists) {
      scenesToProcess.push({ id: sceneDoc.id, ...sceneDoc.data() });
    }
  } else if (projectId) {
    const scenesSnapshot = await db.collection('scenes').where('projectId', '==', projectId).get();
    scenesToProcess = scenesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  if (scenesToProcess.length === 0) {
    throw new Error('No scenes found to process');
  }

  const batch = db.batch();
  const generatedAssets = [];

  for (const scene of scenesToProcess) {
    const promptToUse = voicePrompt || scene.voicePrompt || scene.script;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptToUse }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      console.error(`Failed to generate audio for scene ${scene.id}`);
      continue;
    }

    const audioUrl = `data:audio/wav;base64,${base64Audio}`;

    // Save asset
    const assetRef = db.collection('assets').doc();
    batch.set(assetRef, {
      id: assetRef.id,
      ownerId: job.ownerId,
      projectId: job.projectId,
      type: 'audio',
      url: audioUrl,
      createdAt: new Date().toISOString()
    });

    generatedAssets.push(assetRef.id);

    // Update scene
    const sceneRef = db.collection('scenes').doc(scene.id);
    batch.update(sceneRef, {
      audioUrl: audioUrl,
      status: 'completed'
    });
  }

  await batch.commit();

  return { assetsGenerated: generatedAssets.length, assetIds: generatedAssets };
}

async function processAiScenePlan(job: any, payload: any) {
  const db = getAdminDb();
  const { projectId } = job;
  
  const scenesSnapshot = await db.collection('scenes').where('projectId', '==', projectId).get();
  if (scenesSnapshot.empty) {
    throw new Error('No scenes found for project');
  }

  const ai = getGemini();
  const batch = db.batch();

  for (const doc of scenesSnapshot.docs) {
    const scene = doc.data();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a detailed camera and lighting plan for this scene: ${scene.script}`,
    });

    batch.update(doc.ref, {
      scenePlan: response.text,
      updatedAt: new Date().toISOString()
    });
  }

  // Update project status to indicate scene planning is done
  const projectRef = db.collection('projects').doc(projectId);
  batch.update(projectRef, {
    status: 'generating',
    updatedAt: new Date().toISOString()
  });

  await batch.commit();

  return { status: 'Scene plan generated' };
}

async function processAiCaptions(job: any, payload: any) {
  const db = getAdminDb();
  const { projectId } = job;
  
  const scenesSnapshot = await db.collection('scenes').where('projectId', '==', projectId).get();
  if (scenesSnapshot.empty) {
    throw new Error('No scenes found for project');
  }

  const ai = getGemini();
  const batch = db.batch();

  for (const doc of scenesSnapshot.docs) {
    const scene = doc.data();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate short, punchy video captions (max 5 words per line) for this audio script: ${scene.voicePrompt || scene.script}`,
    });

    batch.update(doc.ref, {
      captions: response.text,
      updatedAt: new Date().toISOString()
    });
  }

  await batch.commit();

  return { status: 'Captions generated for all scenes' };
}

async function processFfmpegRender(job: any, payload: any) {
  const db = getAdminDb();
  const { projectId } = job;

  // Simulate progress
  for (let i = 10; i <= 100; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s
    await db.collection('jobs').doc(job.id).update({
      progress: i,
      updatedAt: new Date().toISOString()
    });
  }
  
  // Create a dummy video asset
  const assetRef = db.collection('assets').doc();
  await assetRef.set({
    id: assetRef.id,
    ownerId: job.ownerId,
    projectId: projectId,
    type: 'video',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4', // dummy video
    createdAt: new Date().toISOString()
  });

  // Update project status
  await db.collection('projects').doc(projectId).update({
    status: 'completed',
    updatedAt: new Date().toISOString()
  });

  return { assetId: assetRef.id };
}
