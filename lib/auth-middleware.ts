import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from './firebase-admin';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: 'Missing or invalid Authorization header',
      status: 401,
    };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      },
      status: 200,
    };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return {
      error: 'Invalid or expired token',
      status: 401,
    };
  }
}
