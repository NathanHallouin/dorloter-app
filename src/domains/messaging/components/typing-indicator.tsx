export function TypingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="mr-auto inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </span>
      <span className="text-xs text-muted-foreground">est en train d&apos;écrire</span>
    </div>
  );
}
