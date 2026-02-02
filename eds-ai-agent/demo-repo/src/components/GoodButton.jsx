import { Button } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';

// This component follows Carbon Design System guidelines correctly

function GoodButton({ children, onClick, disabled, variant = 'primary' }) {
  const kindMap = {
    primary: 'primary',
    secondary: 'secondary',
    danger: 'danger',
    ghost: 'ghost'
  };

  return (
    <Button
      kind={kindMap[variant] || 'primary'}
      size="lg"
      onClick={onClick}
      disabled={disabled}
      renderIcon={ArrowRight}
    >
      {children}
    </Button>
  );
}

export default GoodButton;
