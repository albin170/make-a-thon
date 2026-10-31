describe('Payments and Reconciliation Tests', () => {
  it('tracks partial payment status correctly', () => {
    const invoiceTotal = 500;
    let amountPaid = 0;

    // Apply partial payment of 200
    amountPaid += 200;
    let balance = invoiceTotal - amountPaid;
    let status = balance === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    expect(balance).toBe(300);
    expect(status).toBe('PARTIALLY_PAID');

    // Apply remaining payment of 300
    amountPaid += 300;
    balance = invoiceTotal - amountPaid;
    status = balance === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    expect(balance).toBe(0);
    expect(status).toBe('PAID');
  });

  it('rejects over-allocation exceeding invoice balance', () => {
    const invoiceDue = 150;
    const paymentAmount = 200;

    const allocate = (due: number, payment: number) => {
      if (payment > due) throw new Error('Allocation exceeds outstanding balance');
      return due - payment;
    };

    expect(() => allocate(invoiceDue, paymentAmount)).toThrow('Allocation exceeds outstanding balance');
  });

  it('identifies overdue invoices based on due date and positive outstanding balance', () => {
    const isOverdue = (dueDate: Date, balance: number) => {
      return dueDate < new Date() && balance > 0;
    };

    const pastDate = new Date(Date.now() - 86400000 * 5); // 5 days ago
    const futureDate = new Date(Date.now() + 86400000 * 5);

    expect(isOverdue(pastDate, 100)).toBe(true);
    expect(isOverdue(pastDate, 0)).toBe(false); // Paid in full
    expect(isOverdue(futureDate, 100)).toBe(false); // Not due yet
  });
});
