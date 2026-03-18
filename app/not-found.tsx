import { DraggableErrorIcon } from "@/components/DraggableErrorIcon";

export default function NotFound() {
  return (
    <main className="error-shell">
      <article className="error-card">
        <h1>Error 404</h1>
        <DraggableErrorIcon />
        <p>Page not found.</p>
      </article>
    </main>
  );
}
