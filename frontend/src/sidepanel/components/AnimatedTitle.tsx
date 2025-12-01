interface AnimatedTitleProps {
  text: string;
  startDelay?: number;
  className?: string;
}

export function AnimatedTitle({
  text,
  startDelay = 0,
  className = "",
}: AnimatedTitleProps) {
  return (
    <h1 className={`coming-soon-title ${className}`}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="title-char"
          style={{ animationDelay: `${startDelay + index * 0.1}s` }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
}
