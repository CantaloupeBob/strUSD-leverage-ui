type LoadingStripProps = {
  className?: string;
};

export function LoadingStrip({ className = "" }: LoadingStripProps) {
  return (
    <span
      aria-label="Loading"
      className={`block h-3 w-24 animate-pulse bg-[linear-gradient(90deg,#252828,#c7f66e,#252828)] bg-bg-size-[200%_100%] ${className}`}
      role="status"
    />
  );
}
