import { SpeedDial } from './SpeedDial';

interface ContentAreaProps {
  url: string;
  onNavigate: (url: string) => void;
}

export function ContentArea({ url, onNavigate }: ContentAreaProps) {
  const isInternalPage = url.startsWith('notilus://');

  if (isInternalPage || !url || url === 'notilus://speed-dial') {
    return <SpeedDial onNavigate={onNavigate} />;
  }

  return (
    <div className="flex-1 relative">
      <iframe
        src={url}
        title="Web content"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
