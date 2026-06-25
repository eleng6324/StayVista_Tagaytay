// Generate Booking Report
export const generateBookingReport = (bookings, startDate, endDate) => {
  const filtered = bookings.filter(b => {
    const bDate = new Date(b.createdAt || b.paymentDate || '');
    return bDate >= new Date(startDate) && bDate <= new Date(endDate);
  });

  const totalBookings = filtered.length;
  const confirmedBookings = filtered.filter(b => b.status === 'CONFIRMED').length;
  const pendingBookings = filtered.filter(b => b.status === 'PENDING APPROVAL').length;
  const rejectedBookings = filtered.filter(b => b.status === 'REJECTED').length;
  const totalValue = filtered.reduce((sum, b) => sum + (Number(b.amount || 0)), 0);

  return {
    type: 'booking',
    period: { startDate, endDate },
    data: {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      rejectedBookings,
      totalValue,
      averageBookingValue: totalBookings > 0 ? totalValue / totalBookings : 0,
      bookingsByCategory: {
        home: filtered.filter(b => b.listingCategory === 'Home').length,
        experience: filtered.filter(b => b.listingCategory === 'Experience').length,
        service: filtered.filter(b => b.listingCategory === 'Service').length,
      },
      bookings: filtered
    },
    generatedAt: new Date().toISOString(),
  };
};

// Generate Revenue Report
export const generateRevenueReport = (bookings, startDate, endDate) => {
  const filtered = bookings.filter(b => {
    const bDate = new Date(b.createdAt || b.paymentDate || '');
    return bDate >= new Date(startDate) && bDate <= new Date(endDate);
  });

  const totalRevenue = filtered.reduce((sum, b) => sum + (Number(b.amount || 0)), 0);
  const totalWithDiscount = filtered.reduce((sum, b) => sum + (Number(b.totalAfterDiscount || b.amount || 0)), 0);
  const totalDiscounts = filtered.reduce((sum, b) => sum + (Number(b.couponAmount || 0)), 0);
  const totalServiceFees = filtered.reduce((sum, b) => sum + (Number(b.serviceFeeAmount || 0)), 0);
  const totalHostPayouts = filtered.reduce((sum, b) => sum + (Number(b.hostPayoutAmount || 0)), 0);

  return {
    type: 'revenue',
    period: { startDate, endDate },
    data: {
      totalRevenue,
      totalWithDiscount,
      totalDiscounts,
      totalServiceFees,
      totalHostPayouts,
      netProfit: totalWithDiscount - totalServiceFees,
      bookingCount: filtered.length,
      averageRevenuePerBooking: filtered.length > 0 ? totalWithDiscount / filtered.length : 0,
    },
    generatedAt: new Date().toISOString(),
  };
};

// Generate Guest Report
export const generateGuestReport = (bookings, startDate, endDate) => {
  const filtered = bookings.filter(b => {
    const bDate = new Date(b.createdAt || b.paymentDate || '');
    return bDate >= new Date(startDate) && bDate <= new Date(endDate);
  });

  const uniqueGuests = new Map();
  filtered.forEach(b => {
    if (b.guestId && !uniqueGuests.has(b.guestId)) {
      uniqueGuests.set(b.guestId, {
        guestId: b.guestId,
        guestName: b.guestName,
        guestEmail: b.guestEmail,
        bookingCount: 0,
        totalSpent: 0,
      });
    }
    if (b.guestId) {
      const guest = uniqueGuests.get(b.guestId);
      guest.bookingCount += 1;
      guest.totalSpent += Number(b.amount || 0);
    }
  });

  const guests = Array.from(uniqueGuests.values());
  const topGuests = guests.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

  return {
    type: 'guest',
    period: { startDate, endDate },
    data: {
      totalUniqueGuests: guests.length,
      totalBookings: filtered.length,
      averageBookingsPerGuest: guests.length > 0 ? filtered.length / guests.length : 0,
      topGuests,
      guests,
    },
    generatedAt: new Date().toISOString(),
  };
};

// Generate Payment Report
export const generatePaymentReport = (bookings, startDate, endDate) => {
  const filtered = bookings.filter(b => {
    const bDate = new Date(b.createdAt || b.paymentDate || '');
    return bDate >= new Date(startDate) && bDate <= new Date(endDate);
  });

  return {
    type: 'payment',
    period: { startDate, endDate },
    data: {
      totalTransactions: filtered.length,
      totalAmount: filtered.reduce((sum, b) => sum + (Number(b.amount || 0)), 0),
      byStatus: {
        completed: filtered.filter(b => b.paymentStatus === 'Completed').length,
        pending: filtered.filter(b => b.paymentStatus !== 'Completed').length,
      },
      byMethod: {
        paypal: filtered.filter(b => b.paymentMethod === 'paypal').length,
      },
      payments: filtered.map(b => ({
        id: b.id,
        bookingId: b.bookingId,
        guestName: b.guestName,
        amount: b.amount,
        paymentStatus: b.paymentStatus,
        date: b.paymentDate,
      }))
    },
    generatedAt: new Date().toISOString(),
  };
};

// Export report to CSV
export const exportReportToCSV = (report, fileName) => {
  let csv = '';

  if (report.type === 'booking') {
    csv = 'StayVista Booking Report\n';
    csv += `Period: ${report.period.startDate} to ${report.period.endDate}\n\n`;
    csv += `Total Bookings,${report.data.totalBookings}\n`;
    csv += `Confirmed,${report.data.confirmedBookings}\n`;
    csv += `Pending,${report.data.pendingBookings}\n`;
    csv += `Rejected,${report.data.rejectedBookings}\n`;
    csv += `Total Value,PHP ${report.data.totalValue.toLocaleString()}\n\n`;
    csv += 'Bookings:\nID,Guest,Listing,Check-in,Check-out,Amount,Status\n';
    report.data.bookings.forEach(b => {
      csv += `${b.id},${b.guestName},${b.listingTitle},${b.checkInDate},${b.checkOutDate},${b.amount},${b.status}\n`;
    });
  } else if (report.type === 'revenue') {
    csv = 'StayVista Revenue Report\n';
    csv += `Period: ${report.period.startDate} to ${report.period.endDate}\n\n`;
    csv += `Total Revenue,PHP ${report.data.totalRevenue.toLocaleString()}\n`;
    csv += `Total After Discount,PHP ${report.data.totalWithDiscount.toLocaleString()}\n`;
    csv += `Total Discounts,PHP ${report.data.totalDiscounts.toLocaleString()}\n`;
    csv += `Service Fees,PHP ${report.data.totalServiceFees.toLocaleString()}\n`;
    csv += `Host Payouts,PHP ${report.data.totalHostPayouts.toLocaleString()}\n`;
    csv += `Net Profit,PHP ${report.data.netProfit.toLocaleString()}\n`;
  } else if (report.type === 'guest') {
    csv = 'StayVista Guest Report\n';
    csv += `Period: ${report.period.startDate} to ${report.period.endDate}\n\n`;
    csv += `Total Unique Guests,${report.data.totalUniqueGuests}\n`;
    csv += `Total Bookings,${report.data.totalBookings}\n\n`;
    csv += 'Top Guests:\nName,Email,Bookings,Total Spent\n';
    report.data.topGuests.forEach(g => {
      csv += `${g.guestName},${g.guestEmail},${g.bookingCount},PHP ${g.totalSpent.toLocaleString()}\n`;
    });
  } else if (report.type === 'payment') {
    csv = 'StayVista Payment Report\n';
    csv += `Period: ${report.period.startDate} to ${report.period.endDate}\n\n`;
    csv += `Total Transactions,${report.data.totalTransactions}\n`;
    csv += `Total Amount,PHP ${report.data.totalAmount.toLocaleString()}\n\n`;
    csv += 'Payments:\nTransaction ID,Booking ID,Guest,Amount,Status,Date\n';
    report.data.payments.forEach(p => {
      csv += `${p.id},${p.bookingId},${p.guestName},${p.amount},${p.paymentStatus},${p.date}\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName || 'report'}-${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
  URL.revokeObjectURL(url);
};

// Export report to Excel-like CSV with better formatting
export const exportReportToExcel = (report, fileName) => {
  exportReportToCSV(report, fileName);
};
