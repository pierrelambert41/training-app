import { Text as RNText, TextProps } from 'react-native';

type Variant = 'heading' | 'body' | 'caption';

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
};

const variantClasses: Record<Variant, string> = {
  heading: 'text-heading text-content-primary',
  body: 'text-body text-content-primary',
  caption: 'text-caption text-content-secondary',
};

export function AppText({ variant = 'body', muted = false, className = '', ...rest }: Props) {
  const base = variantClasses[variant];
  const mutedClass = muted ? 'text-content-muted' : '';

  return (
    <RNText
      className={`${base} ${mutedClass} ${className}`.trim()}
      {...rest}
    />
  );
}
