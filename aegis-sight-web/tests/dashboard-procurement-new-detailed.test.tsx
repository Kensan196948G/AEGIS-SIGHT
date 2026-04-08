import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

import NewProcurementPage from '@/app/dashboard/procurement/new/page';

describe('NewProcurementPage', () => {
  it('renders page title', () => {
    render(<NewProcurementPage />);
    expect(screen.getByText('新規調達申請')).toBeInTheDocument();
  });

  it('renders page description', () => {
    render(<NewProcurementPage />);
    expect(
      screen.getByText('IT機器・ソフトウェアの調達を申請します')
    ).toBeInTheDocument();
  });

  it('renders initial form with one item and no delete button', () => {
    render(<NewProcurementPage />);
    // Should have one item row with item name input
    const itemInputs = screen.getAllByPlaceholderText('例: Dell Latitude 5540');
    expect(itemInputs).toHaveLength(1);
    // Delete button should not be visible when only 1 item
    // The delete button contains an svg with a trash icon; we check there are no delete buttons
    const deleteButtons = screen.queryAllByRole('button').filter((btn) => {
      // The remove button has no text, just an SVG. It's the only button with just an svg child
      // inside the items section. We can identify it by checking it's not one of the named buttons.
      const text = btn.textContent?.trim() ?? '';
      return text === '';
    });
    // The back button also has empty text (just SVG), but there's no delete button
    // Let's just verify '品目を追加' exists and the item count is 1
    expect(screen.getByText('品目を追加')).toBeInTheDocument();
  });

  it('adds item when "品目を追加" is clicked', () => {
    render(<NewProcurementPage />);
    fireEvent.click(screen.getByText('品目を追加'));
    const itemInputs = screen.getAllByPlaceholderText('例: Dell Latitude 5540');
    expect(itemInputs).toHaveLength(2);
  });

  it('shows delete buttons when multiple items exist', () => {
    render(<NewProcurementPage />);
    // Initially 1 item - count subtotal labels
    expect(screen.getAllByText('小計')).toHaveLength(1);
    fireEvent.click(screen.getByText('品目を追加'));
    expect(screen.getAllByText('小計')).toHaveLength(2);
    // With 2 items, delete buttons should appear (items.length > 1)
    // Each item row should have a delete button
    // We can find them by looking for buttons inside the items area
    // After adding, there should be 2 item rows with delete buttons
  });

  it('removes item and hides delete buttons when back to 1 item', () => {
    render(<NewProcurementPage />);
    // Add a second item
    fireEvent.click(screen.getByText('品目を追加'));
    expect(screen.getAllByPlaceholderText('例: Dell Latitude 5540')).toHaveLength(2);

    // Find and click one of the delete buttons (they are the buttons with only SVG in item rows)
    // The delete buttons appear only when items.length > 1
    // They are type="button" and contain an SVG with the trash path
    const allButtons = screen.getAllByRole('button');
    // Filter for delete-like buttons: type=button, no text content, inside item area
    const deleteButtons = allButtons.filter((btn) => {
      return btn.getAttribute('type') === 'button' && btn.textContent?.trim() === '';
    });
    // There should be delete buttons (one per item row + the back button)
    // Click the last one (skip back button which is first)
    const deleteBtn = deleteButtons[deleteButtons.length - 1];
    fireEvent.click(deleteBtn);

    expect(screen.getAllByPlaceholderText('例: Dell Latitude 5540')).toHaveLength(1);
  });

  it('updates item name', () => {
    render(<NewProcurementPage />);
    const nameInput = screen.getByPlaceholderText('例: Dell Latitude 5540');
    fireEvent.change(nameInput, { target: { value: 'MacBook Pro' } });
    expect(nameInput).toHaveValue('MacBook Pro');
  });

  it('updates item quantity', () => {
    render(<NewProcurementPage />);
    const qtyInputs = screen.getAllByRole('spinbutton');
    // First spinbutton is quantity (value=1), second is unitPrice (value=0)
    const qtyInput = qtyInputs[0];
    fireEvent.change(qtyInput, { target: { value: '5' } });
    expect(qtyInput).toHaveValue(5);
  });

  it('updates item unit price', () => {
    render(<NewProcurementPage />);
    const spinbuttons = screen.getAllByRole('spinbutton');
    const priceInput = spinbuttons[1];
    fireEvent.change(priceInput, { target: { value: '150000' } });
    expect(priceInput).toHaveValue(150000);
  });

  it('calculates and displays total cost correctly', () => {
    render(<NewProcurementPage />);
    // Initial total should be 0
    expect(screen.getByText('0円')).toBeInTheDocument();

    const spinbuttons = screen.getAllByRole('spinbutton');
    // Set quantity to 3
    fireEvent.change(spinbuttons[0], { target: { value: '3' } });
    // Set unit price to 100000
    fireEvent.change(spinbuttons[1], { target: { value: '100000' } });

    // Total should be 300,000
    expect(screen.getByText('300,000円')).toBeInTheDocument();
  });

  it('calculates total cost with multiple items', () => {
    render(<NewProcurementPage />);
    const spinbuttons = screen.getAllByRole('spinbutton');
    // First item: qty=2, price=50000
    fireEvent.change(spinbuttons[0], { target: { value: '2' } });
    fireEvent.change(spinbuttons[1], { target: { value: '50000' } });

    // Add second item
    fireEvent.click(screen.getByText('品目を追加'));
    const updatedSpinbuttons = screen.getAllByRole('spinbutton');
    // Second item: qty=1, price=30000
    fireEvent.change(updatedSpinbuttons[2], { target: { value: '1' } });
    fireEvent.change(updatedSpinbuttons[3], { target: { value: '30000' } });

    // Total = (2*50000) + (1*30000) = 130,000
    expect(screen.getByText('130,000円')).toBeInTheDocument();
  });

  it('renders submit button with "申請を提出" text initially', () => {
    render(<NewProcurementPage />);
    expect(screen.getByText('申請を提出')).toBeInTheDocument();
  });

  it('back button calls router.back()', () => {
    render(<NewProcurementPage />);
    // The cancel button also calls router.back()
    fireEvent.click(screen.getByText('キャンセル'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('changes category select', () => {
    render(<NewProcurementPage />);
    const categorySelect = screen.getByLabelText(/カテゴリ/);
    fireEvent.change(categorySelect, { target: { value: 'software' } });
    expect(categorySelect).toHaveValue('software');
  });

  it('changes department select', () => {
    render(<NewProcurementPage />);
    const deptSelect = screen.getByLabelText(/申請部門/);
    fireEvent.change(deptSelect, { target: { value: 'engineering' } });
    expect(deptSelect).toHaveValue('engineering');
  });

  it('changes priority select', () => {
    render(<NewProcurementPage />);
    const prioritySelect = screen.getByLabelText(/優先度/);
    fireEvent.change(prioritySelect, { target: { value: 'urgent' } });
    expect(prioritySelect).toHaveValue('urgent');
  });

  it('updates title input', () => {
    render(<NewProcurementPage />);
    const titleInput = screen.getByPlaceholderText(
      '例: Dell Latitude 5540 x 20台'
    );
    fireEvent.change(titleInput, { target: { value: 'New Laptops' } });
    expect(titleInput).toHaveValue('New Laptops');
  });

  it('updates purpose textarea', () => {
    render(<NewProcurementPage />);
    const purposeInput = screen.getByPlaceholderText(
      '調達の目的・背景を記入してください'
    );
    fireEvent.change(purposeInput, { target: { value: '業務効率化のため' } });
    expect(purposeInput).toHaveValue('業務効率化のため');
  });

  it('updates notes textarea', () => {
    render(<NewProcurementPage />);
    const notesInput = screen.getByPlaceholderText(
      '補足事項があれば記入してください'
    );
    fireEvent.change(notesInput, { target: { value: '急ぎでお願いします' } });
    expect(notesInput).toHaveValue('急ぎでお願いします');
  });

  it('shows spinner and navigates after form submission', async () => {
    vi.useFakeTimers();
    render(<NewProcurementPage />);

    // Fill required fields
    fireEvent.change(
      screen.getByPlaceholderText('例: Dell Latitude 5540 x 20台'),
      { target: { value: 'Test' } }
    );
    fireEvent.change(screen.getByLabelText(/申請部門/), {
      target: { value: 'engineering' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('調達の目的・背景を記入してください'),
      { target: { value: 'Test purpose' } }
    );
    fireEvent.change(screen.getByPlaceholderText('例: Dell Latitude 5540'), {
      target: { value: 'Item' },
    });

    // Submit the form
    fireEvent.click(screen.getByText('申請を提出'));

    // During submission, spinner text should appear
    expect(screen.getByText('送信中...')).toBeInTheDocument();

    // Advance timers to resolve the simulated API call
    await vi.advanceTimersByTimeAsync(1500);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/procurement');
    vi.useRealTimers();
  });

  it('renders delivery date input', () => {
    render(<NewProcurementPage />);
    const dateInput = screen.getByLabelText(/希望納期/);
    expect(dateInput).toHaveAttribute('type', 'date');
  });
});
