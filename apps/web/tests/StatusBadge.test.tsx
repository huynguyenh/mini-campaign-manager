import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../src/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the correct label for each status', () => {
    const statuses = ['draft', 'scheduled', 'sending', 'sent'] as const;
    const labels = ['Draft', 'Scheduled', 'Sending', 'Sent'];
    statuses.forEach((s, i) => {
      const { unmount } = render(<StatusBadge status={s} />);
      expect(screen.getByText(labels[i]!)).toBeInTheDocument();
      unmount();
    });
  });

  it('applies the sent-status emerald palette', () => {
    render(<StatusBadge status="sent" />);
    const el = screen.getByText('Sent');
    expect(el.className).toMatch(/emerald/);
  });
});
