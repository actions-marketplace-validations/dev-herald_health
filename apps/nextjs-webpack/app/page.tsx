import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Home</h1>
      <nav>
        <Link href="/dashboard">Dashboard</Link>
        {' · '}
        <Link href="/settings">Settings</Link>
      </nav>
    </main>
  );
}
