import type { ReactNode } from 'react';
import { useRef } from 'react';

interface SgfFileInputProps {
  id: string;
  onFileSelected: (content: string) => void;
  className?: string;
  children: (openFilePicker: () => void) => ReactNode;
}

export function SgfFileInput({ id, onFileSelected, className = '', children }: SgfFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const content = await file.text();
      onFileSelected(content);
    } catch {
      onFileSelected('');
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".sgf,application/x-go-sgf,text/plain"
        className="sgf-file-input"
        onChange={handleChange}
      />
      {children(openFilePicker)}
    </div>
  );
}
