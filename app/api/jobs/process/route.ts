import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getGemini } from '@/lib/gemini';

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
      updatedAt: new Date().toISOString()
    });

    let result = null;

    if (job.type === 'ai_script') {
      result = await processAiScript(job, payload);
    } else if (job.type === 'ai_visuals') {
      result = await processAiVisuals(job, payload);
    } else if (job.type === 'ai_voice') {
      result = await processAiVoice(job, payload);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    // Mark as completed
    await jobDoc.ref.update({
      status: 'completed',
      result: result,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ message: 'Job processed successfully', jobId: jobDoc.id }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing job:', error);
    // We should ideally mark the job as failed here if we have the jobDoc reference
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
  const { sceneId, imagePrompt } = payload;
  const ai = getGemini();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: imagePrompt },
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
    throw new Error('Failed to generate image');
  }

  const db = getAdminDb();
  
  // Save asset
  const assetRef = db.collection('assets').doc();
  await assetRef.set({
    id: assetRef.id,
    ownerId: job.ownerId,
    projectId: job.projectId,
    type: 'image',
    url: imageUrl,
    createdAt: new Date().toISOString()
  });

  // Update scene
  if (sceneId) {
    await db.collection('scenes').doc(sceneId).update({
      imageUrl: imageUrl,
      status: 'completed'
    });
  }

  return { assetId: assetRef.id };
}

async function processAiVoice(job: any, payload: any) {
  const { sceneId, voicePrompt } = payload;
  const ai = getGemini();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: voicePrompt }] }],
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
    throw new Error('Failed to generate audio');
  }

  const audioUrl = `data:audio/wav;base64,${base64Audio}`;

  const db = getAdminDb();
  
  // Save asset
  const assetRef = db.collection('assets').doc();
  await assetRef.set({
    id: assetRef.id,
    ownerId: job.ownerId,
    projectId: job.projectId,
    type: 'audio',
    url: audioUrl,
    createdAt: new Date().toISOString()
  });

  // Update scene
  if (sceneId) {
    await db.collection('scenes').doc(sceneId).update({
      audioUrl: audioUrl,
      status: 'completed'
    });
  }

  return { assetId: assetRef.id };
}
