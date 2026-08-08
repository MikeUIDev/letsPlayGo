/** Trigger a browser download for text content. */
export function downloadTextFile(content: string, filename: string, mimeType = 'application/x-go-sgf'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}
