export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-zone-bg">
      {children}
    </div>
  );
}
