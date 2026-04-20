import React, { useState, useEffect } from 'react';

interface SmartImageProps {
  src: string;
  referer?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  onLoad?: () => void;
}

type ImageState = 'direct' | 'proxy' | 'fail';

export const SmartImage: React.FC<SmartImageProps> = ({ src, referer, className, style, alt, onLoad }) => {
  const [state, setState] = useState<ImageState>('direct');
  const [currentSrc, setCurrentSrc] = useState(src);
  const [errorCount, setErrorCount] = useState(0);

  // Protocol: chiyo-proxy://image?url=ENCODED&referer=ENCODED
  const getProxyUrl = (originalUrl: string, ref?: string) => {
    const encodedUrl = encodeURIComponent(originalUrl);
    const encodedRef = ref ? encodeURIComponent(ref) : '';
    return `chiyo-proxy://image?url=${encodedUrl}${encodedRef ? `&referer=${encodedRef}` : ''}`;
  };

  useEffect(() => {
    setCurrentSrc(src);
    setState('direct');
    setErrorCount(0);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Rule: direct → proxy → fail. Only one fallback allowed.
    if (state === 'direct') {
      console.log(`SmartImage: Direct load failed for ${src}, trying proxy...`);
      setState('proxy');
      setCurrentSrc(getProxyUrl(src, referer));
    } else if (state === 'proxy') {
      console.error(`SmartImage: Proxy load failed for ${src}`);
      setState('fail');
    }
  };

  if (state === 'fail') {
    return (
      <div className={`${className} flex items-center justify-center bg-surface border border-white/5 text-text-muted text-xs p-4 text-center`}>
        Image missing
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      className={className}
      style={style}
      alt={alt}
      onLoad={onLoad}
      onError={handleError}
      loading="lazy"
    />
  );
};
