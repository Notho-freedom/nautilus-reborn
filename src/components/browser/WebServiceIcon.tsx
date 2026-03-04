import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { WebServiceId } from '@/lib/settings';
import { getWebServiceIconCandidates } from '@/lib/webServiceIcons';

interface WebServiceIconProps {
  serviceId: WebServiceId;
  serviceUrl: string;
  serviceLabel: string;
  size: number;
  fallbackIcon: LucideIcon;
}

export function WebServiceIcon({
  serviceId,
  serviceUrl,
  serviceLabel,
  size,
  fallbackIcon: FallbackIcon,
}: WebServiceIconProps) {
  const iconCandidates = useMemo(
    () => getWebServiceIconCandidates(serviceId, serviceUrl),
    [serviceId, serviceUrl]
  );
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    setFailedCount(0);
  }, [serviceId, serviceUrl]);

  const src = iconCandidates[failedCount];
  if (src) {
    return (
      <img
        src={src}
        alt={serviceLabel}
        width={size}
        height={size}
        className="shrink-0 rounded-sm object-contain"
        onError={() => setFailedCount(prev => prev + 1)}
      />
    );
  }

  return <FallbackIcon size={size} className="shrink-0" />;
}

