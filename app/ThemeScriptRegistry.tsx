'use client'

import { useServerInsertedHTML } from 'next/navigation'

/**
 * Injects the pre-paint theme-init script into the document head via
 * `useServerInsertedHTML`. This is the Next 16 App Router pattern for inline
 * scripts that must run before hydration without being reconciled as React
 * client elements — rendering a raw `<script>` in `layout.tsx` (even with
 * `dangerouslySetInnerHTML`) serializes it into the RSC flight payload, so
 * React's client renderer reconstructs the `<script>` element and emits:
 *   "Encountered a script tag while rendering React component. Scripts
 *    inside React components are never executed when rendering on the client."
 * `useServerInsertedHTML` injects the markup as raw HTML into the server
 * response, bypassing client reconciliation entirely. `ThemeApplier`
 * re-applies the class after hydration (React controls `<html>` className and
 * reconciliation can drop the script-added `.dark` class).
 */
export function ThemeScriptRegistry({ children }: { children: React.ReactNode }) {
  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var a=localStorage.getItem('accent')||'copper';document.documentElement.setAttribute('data-theme',a);}catch(e){}})();`,
      }}
    />
  ))

  return <>{children}</>
}