import type { Metadata } from "next";
import { DraggableErrorIcon } from "@/components/DraggableErrorIcon";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
};

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
