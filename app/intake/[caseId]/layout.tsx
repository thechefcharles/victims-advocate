// app/intake/[caseId]/layout.tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-50">{children}</div>;
}