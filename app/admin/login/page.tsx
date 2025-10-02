/* eslint-disable react/no-unescaped-entities */
'use client';
import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('agreements@photoboothguys.ca');
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (status === 'authenticated') {
    return <div style={{ padding: 24 }}>Redirecting...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Login</h1>
      <p>We&apos;ll send a magic link to the admin email.</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin email"
        style={{ padding: 8, marginRight: 8 }}
      />
      <button onClick={() => signIn('email', { email })}>Send magic link</button>
    </div>
  );
}



