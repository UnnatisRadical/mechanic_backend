import db from "../db/db.js";
import XLSX from 'xlsx';
import moment from 'moment';

function tryParseJSON(jsonString) {
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    }
    return jsonString;
  } catch (e) {
    console.error("JSON parse error:", e);
    return [];
  }
}

export const exportBills = async (req, res) => {
  try {
    const { adminId, startDate, endDate } = req.body;

    if (!adminId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        error: "Admin ID, start date, and end date are required" 
      });
    }

    const query = `
      SELECT 
        bill_id as id,
        customer_name,
        contact,
        service_taken,
        other_charges,
        discount,
        total_bill as amount,
        date,
        tax_rate,
        payment_method
      FROM bills
      WHERE admin_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `;

    db.query(query, [adminId, startDate, endDate], (err, results) => {
      if (err) {
        console.error("Database error in exportBills:", err);
        return res.status(500).json({ 
          success: false,
          error: "Database operation failed", 
          details: err.message 
        });
      }

      // Format data for Excel
      const formattedData = results.map(bill => ({
        'Bill ID': bill.id || '',
        'Date': bill.date ? moment(bill.date).format('YYYY-MM-DD') : '',
        'Customer Name': bill.customer_name || '',
        'Contact': bill.contact || '',
        'Services': tryParseJSON(bill.service_taken).map(s => s.name || '').join(', '),
        'Other Charges': parseFloat(bill.other_charges) || 0,
        'Discount': parseFloat(bill.discount) || 0,
        'Tax Rate': bill.tax_rate ? `${parseFloat(bill.tax_rate)}%` : '0%',
        'Total Amount': parseFloat(bill.amount) || 0,
        'Payment Method': bill.payment_method || 'cash'
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add worksheet
      const ws = XLSX.utils.json_to_sheet(formattedData);
      
      // Set column widths
      const wscols = [
        { wch: 10 }, // Bill ID
        { wch: 12 }, // Date
        { wch: 20 }, // Customer Name
        { wch: 15 }, // Contact
        { wch: 30 }, // Services
        { wch: 12 }, // Other Charges
        { wch: 10 }, // Discount
        { wch: 10 }, // Tax Rate
        { wch: 12 }, // Total Amount
        { wch: 15 }  // Payment Method
      ];
      ws['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(wb, ws, "Bills");

      // Generate buffer
      const buffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'buffer' 
      });

      // Set headers
      const filename = `bills_export_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send the file
      res.send(buffer);
    });
  } catch (error) {
    console.error("Server error in exportBills:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal Server Error", 
      details: error.message 
    });
  }
};