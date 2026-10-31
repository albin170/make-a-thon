'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'CUSTOMER') {
      router.replace('/portal/dashboard');
    } else {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
