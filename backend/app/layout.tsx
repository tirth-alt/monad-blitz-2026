export const metadata = {
  title: 'ChainMind Backend',
  description: 'AI task execution, auth, and live feed API for ChainMind on Monad.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
