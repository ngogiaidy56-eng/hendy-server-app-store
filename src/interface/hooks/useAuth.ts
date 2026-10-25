/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  googleSignIn,
  emailSignIn,
  emailSignUp,
  logout,
} from '../../google-drive/firebaseAuth.ts';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signInWithGmail: () => Promise<User | null>;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<User>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signInWithGmail = useCallback(async (): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn(false);
      if (res?.user) {
        setUser(res.user);
        return res.user;
      }
      return null;
    } catch (err: any) {
      const errorCode = err?.code || '';
      if (errorCode === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        setError('Cửa sổ đăng nhập Google đã được đóng. Bạn có thể nhấn thử lại hoặc đăng ký / đăng nhập bằng Email & Mật khẩu bên dưới.');
      } else if (errorCode === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        setError('Trình duyệt đã chặn cửa sổ Pop-up. Vui lòng cho phép hiển thị Pop-up hoặc sử dụng Email & Mật khẩu.');
      } else if (errorCode === 'auth/cancelled-popup-request') {
        setError('Yêu cầu mở cửa sổ đăng nhập đã bị hủy. Vui lòng thử lại.');
      } else {
        const message = err?.message || 'Không thể đăng nhập bằng Gmail / Google';
        setError(message);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await emailSignIn(email, pass);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err: any) {
      const message = err.message || 'Email hoặc mật khẩu không chính xác';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, pass: string, name?: string): Promise<User> => {
      setLoading(true);
      setError(null);
      try {
        const newUser = await emailSignUp(email, pass, name);
        setUser(newUser);
        return newUser;
      } catch (err: any) {
        const message = err.message || 'Không thể tạo tài khoản mới';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signOutUser = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đăng xuất');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    signInWithGmail,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    clearError,
  };
}
