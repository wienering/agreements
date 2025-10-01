'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function AdminLogin() {
  const [email, setEmail] = useState('agreements@photoboothguys.ca');

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Login</h1>
      <p>We’ll send a magic link to the admin email.</p>
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



