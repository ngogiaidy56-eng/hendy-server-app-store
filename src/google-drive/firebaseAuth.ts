/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider with Google Drive file scope
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

export const createGoogleProvider = (includeDriveScopes = false): GoogleAuthProvider => {
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  if (includeDriveScopes) {
    for (const scope of DRIVE_SCOPES) {
      googleProvider.addScope(scope);
    }
  }
  return googleProvider;
};

// In-memory access token storage (MANDATORY per Workspace Skill - never in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (
  includeDriveScopes = false
): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider(includeDriveScopes);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    if (includeDriveScopes && !cachedAccessToken) {
      console.warn('Google Drive access token không có trong phản hồi xác thực.');
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errorCode = error?.code || '';
    if (errorCode === 'auth/popup-closed-by-user') {
      console.info('Google Auth: Cửa sổ đăng nhập đã được đóng bởi người dùng.');
    } else if (errorCode === 'auth/popup-blocked') {
      console.warn('Google Auth: Cửa sổ popup bị chặn bởi trình duyệt.');
    } else if (errorCode === 'auth/cancelled-popup-request') {
      console.info('Google Auth: Yêu cầu popup trước đó đã bị hủy.');
    } else {
      console.error('Lỗi đăng nhập Google Auth:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const emailSignIn = async (email: string, pass: string): Promise<User> => {
  try {
    isSigningIn = true;
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error) {
    console.error('Lỗi đăng nhập email:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const emailSignUp = async (email: string, pass: string, displayName?: string): Promise<User> => {
  try {
    isSigningIn = true;
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  } catch (error) {
    console.error('Lỗi đăng ký tài khoản:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
