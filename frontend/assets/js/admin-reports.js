// admin-reports.js
// Reports functionality for admin panel

let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
  // Require admin authentication
  if (!auth.requireAdmin()) return;

  // Set default dates (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  document.getElementById('endDate').valueAsDate = today;
  document.getElementById('startDate').valueAsDate = thirtyDaysAgo;

  // Setup event listeners
  document.getElementById('generateReportBtn').addEventListener('click', generateReport);
  document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
  document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
});

/* ================== GENERATE REPORT ================== */

async function generateReport() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const status = document.getElementById('statusFilter').value;

  // Validate dates
  if (!startDate || !endDate) {
    showToast('Please select both start and end dates', 'error');
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    showToast('Start date cannot be after end date', 'error');
    return;
  }

  // Show loading state
  const btn = document.getElementById('generateReportBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';

  try {
    // Fetch report data from API
    const reportData = await api.getTripsReport(startDate, endDate, status);
    currentReportData = reportData;

    // Update statistics
    updateStatistics(reportData.summary);

    // Display trips table
    displayTripsTable(reportData.trips);

    // Show statistics and report sections
    document.getElementById('statisticsRow').style.display = 'flex';
    document.getElementById('reportRow').style.display = 'block';

    showToast('Report generated successfully', 'success');
  } catch (error) {
    console.error('Error generating report:', error);
    showToast('Failed to generate report: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/* ================== UPDATE STATISTICS ================== */

function updateStatistics(summary) {
  document.getElementById('totalTrips').textContent = summary.total_trips || 0;
  document.getElementById('totalMileage').textContent = summary.total_mileage || 0;
  document.getElementById('completedTrips').textContent = summary.completed_trips || 0;
  document.getElementById('completionRate').textContent = `${summary.completion_rate || 0}%`;
  document.getElementById('avgMileage').textContent = summary.average_mileage || 0;
}

/* ================== DISPLAY TRIPS TABLE ================== */

function displayTripsTable(trips) {
  const tbody = document.getElementById('reportsTableBody');

  if (!trips || trips.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <i class="fas fa-inbox fa-3x text-secondary mb-3"></i>
          <p class="text-secondary mb-0">No trips found for the selected criteria</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = trips.map(trip => {
    const statusConfig = {
      'pending': { class: 'secondary', icon: 'clock' },
      'matched': { class: 'info', icon: 'handshake' },
      'in_progress': { class: 'warning', icon: 'truck' },
      'completed': { class: 'success', icon: 'check-circle' },
      'cancelled': { class: 'danger', icon: 'times-circle' }
    };
    
    const config = statusConfig[trip.status] || statusConfig['pending'];
    
    return `
      <tr>
        <td>
          <p class="text-xs font-weight-bold mb-0 ps-3">#${trip.id}</p>
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0">${trip.pickup_date}</p>
          <p class="text-xs text-secondary mb-0">${trip.pickup_time}</p>
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0">${truncate(trip.client_name, 25)}</p>
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0">${truncate(trip.driver_name, 25)}</p>
          <p class="text-xs text-secondary mb-0">${truncate(trip.vehicle_info, 30)}</p>
        </td>
        <td>
          <p class="text-xs mb-0"><i class="fas fa-map-marker-alt text-success me-1"></i>${truncate(trip.pickup_address, 20)}</p>
          <p class="text-xs mb-0"><i class="fas fa-map-marker-alt text-danger me-1"></i>${truncate(trip.dropoff_address, 20)}</p>
        </td>
        <td class="align-middle text-center">
          <span class="text-xs font-weight-bold">${trip.total_mileage || 0} mi</span>
        </td>
        <td class="align-middle text-center">
          <span class="badge badge-sm bg-gradient-${config.class}">
            <i class="fas fa-${config.icon} me-1"></i>${trip.status.replace('_', ' ').toUpperCase()}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

/* ================== EXPORT TO EXCEL ================== */

function exportToExcel() {
  if (!currentReportData || !currentReportData.trips.length) {
    showToast('No data to export', 'error');
    return;
  }

  try {
    // Prepare data for Excel
    const excelData = currentReportData.trips.map(trip => ({
      'Trip ID': trip.id,
      'Date': trip.pickup_date,
      'Time': trip.pickup_time,
      'Client': trip.client_name,
      'Driver': trip.driver_name,
      'Vehicle': trip.vehicle_info,
      'Pickup Address': trip.pickup_address,
      'Dropoff Address': trip.dropoff_address,
      'Mileage (mi)': trip.total_mileage || 0,
      'Status': trip.status.replace('_', ' ').toUpperCase(),
      'Description': trip.description
    }));

    // Add summary at the end
    excelData.push({});
    excelData.push({
      'Trip ID': 'SUMMARY',
      'Date': '',
      'Time': '',
      'Client': '',
      'Driver': '',
      'Vehicle': '',
      'Pickup Address': '',
      'Dropoff Address': '',
      'Mileage (mi)': '',
      'Status': '',
      'Description': ''
    });
    excelData.push({
      'Trip ID': 'Total Trips',
      'Date': currentReportData.summary.total_trips,
      'Time': '',
      'Client': '',
      'Driver': '',
      'Vehicle': '',
      'Pickup Address': '',
      'Dropoff Address': '',
      'Mileage (mi)': '',
      'Status': '',
      'Description': ''
    });
    excelData.push({
      'Trip ID': 'Total Mileage',
      'Date': currentReportData.summary.total_mileage + ' mi',
      'Time': '',
      'Client': '',
      'Driver': '',
      'Vehicle': '',
      'Pickup Address': '',
      'Dropoff Address': '',
      'Mileage (mi)': '',
      'Status': '',
      'Description': ''
    });
    excelData.push({
      'Trip ID': 'Completed Trips',
      'Date': currentReportData.summary.completed_trips,
      'Time': '',
      'Client': '',
      'Driver': '',
      'Vehicle': '',
      'Pickup Address': '',
      'Dropoff Address': '',
      'Mileage (mi)': '',
      'Status': '',
      'Description': ''
    });
    excelData.push({
      'Trip ID': 'Completion Rate',
      'Date': currentReportData.summary.completion_rate + '%',
      'Time': '',
      'Client': '',
      'Driver': '',
      'Vehicle': '',
      'Pickup Address': '',
      'Dropoff Address': '',
      'Mileage (mi)': '',
      'Status': '',
      'Description': ''
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 10 },  // Trip ID
      { wch: 12 },  // Date
      { wch: 10 },  // Time
      { wch: 25 },  // Client
      { wch: 25 },  // Driver
      { wch: 30 },  // Vehicle
      { wch: 35 },  // Pickup
      { wch: 35 },  // Dropoff
      { wch: 12 },  // Mileage
      { wch: 15 },  // Status
      { wch: 40 }   // Description
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trips Report');

    // Generate filename
    const startDate = currentReportData.filters.start_date || 'all';
    const endDate = currentReportData.filters.end_date || 'all';
    const filename = `trips_report_${startDate}_to_${endDate}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
    
    showToast('Excel file exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    showToast('Failed to export to Excel', 'error');
  }
}

/* ================== EXPORT TO PDF ================== */

function exportToPDF() {
  if (!currentReportData || !currentReportData.trips.length) {
    showToast('No data to export', 'error');
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Flow Relay - Trips Report', 15, 15);

    // Add date range
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateRange = `Report Period: ${currentReportData.filters.start_date || 'All'} to ${currentReportData.filters.end_date || 'All'}`;
    doc.text(dateRange, 15, 22);

    // Add summary statistics
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text('Summary Statistics', 15, 32);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    const summaryY = 38;
    doc.text(`Total Trips: ${currentReportData.summary.total_trips}`, 15, summaryY);
    doc.text(`Total Mileage: ${currentReportData.summary.total_mileage} mi`, 70, summaryY);
    doc.text(`Completed: ${currentReportData.summary.completed_trips}`, 130, summaryY);
    doc.text(`Completion Rate: ${currentReportData.summary.completion_rate}%`, 180, summaryY);
    doc.text(`Average Mileage: ${currentReportData.summary.average_mileage} mi`, 230, summaryY);

    // Prepare table data
    const tableData = currentReportData.trips.map(trip => [
      `#${trip.id}`,
      trip.pickup_date,
      truncate(trip.client_name, 20),
      truncate(trip.driver_name, 20),
      truncate(trip.pickup_address, 25),
      truncate(trip.dropoff_address, 25),
      `${trip.total_mileage || 0} mi`,
      trip.status.replace('_', ' ').toUpperCase()
    ]);

    // Add table
    doc.autoTable({
      head: [['ID', 'Date', 'Client', 'Driver', 'Pickup', 'Dropoff', 'Mileage', 'Status']],
      body: tableData,
      startY: 45,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 15 },  // ID
        1: { cellWidth: 22 },  // Date
        2: { cellWidth: 35 },  // Client
        3: { cellWidth: 35 },  // Driver
        4: { cellWidth: 45 },  // Pickup
        5: { cellWidth: 45 },  // Dropoff
        6: { cellWidth: 20 },  // Mileage
        7: { cellWidth: 25 }   // Status
      }
    });

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        15,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    // Generate filename
    const startDate = currentReportData.filters.start_date || 'all';
    const endDate = currentReportData.filters.end_date || 'all';
    const filename = `trips_report_${startDate}_to_${endDate}.pdf`;

    // Download
    doc.save(filename);
    
    showToast('PDF exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    showToast('Failed to export to PDF', 'error');
  }
}