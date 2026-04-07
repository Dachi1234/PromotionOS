export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-4xl font-bold">PromoCanvas</h1>
        <p className="text-gray-400">
          Drag-and-drop page builder for casino promotions.
        </p>
        <div className="text-sm text-gray-500 space-y-1">
          <p>Builder: <code>/builder/[campaignId]</code></p>
          <p>Runtime: <code>/[slug]</code></p>
        </div>
      </div>
    </main>
  );
}
