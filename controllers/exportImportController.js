import db from "../db/db.js";
import XLSX from 'xlsx';
import moment from 'moment';

function tryParseJSON(jsonString) {
  try {
    // Guard against null/undefined
    if (jsonString == null) return [];

    if (typeof jsonString === 'string') {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    }

    // If already an object/array, normalize to array
    if (Array.isArray(jsonString)) return jsonString;
    return jsonString ? [jsonString] : [];
  } catch (e) {
    return [];
  }
}

export const exportBills = async (req, res) => {
  try {
    // UPDATE: Request body se deletedInvoices array bhi accept karenge
    const { adminId, startDate, endDate, customerName, deletedInvoices } = req.body;

    if (!adminId) {
      return res.status(400).json({ 
        success: false,
        error: "Admin ID is required" 
      });
    }

    // Parse deleted invoices IDs
    let excludedInvoiceIds = [];
    if (deletedInvoices) {
      try {
        const parsedTrash = typeof deletedInvoices === 'string' ? JSON.parse(deletedInvoices) : deletedInvoices;
        excludedInvoiceIds = parsedTrash.map(trash => Number(trash.bill_id || trash.invoiceid || trash));
      } catch (e) {
        console.error("Trash parsing error in export:", e);
      }
    }

    let query = `
      SELECT 
        bill_id as id,
        invoiceid,
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
      WHERE admin_id = ?`;

    const params = [adminId];

    if (customerName && customerName.trim() !== '') {
      query += ` AND (customer_name LIKE ? OR contact LIKE ?)`;
      const like = `%${customerName.trim()}%`;
      params.push(like, like);
    } else if (startDate && endDate) {
      query += ` AND date >= ? AND date <= ?`;
      params.push(startDate, endDate);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide either customerName (optional) or startDate and endDate to export',
      });
    }

    // UPDATE: Agar deletedInvoices maujood hain to query me exclude lagayein
    if (excludedInvoiceIds.length > 0) {
      query += ` AND bill_id NOT IN (?) AND invoiceid NOT IN (?)`;
      params.push(excludedInvoiceIds, excludedInvoiceIds);
    }

    query += ` ORDER BY date DESC`;

    db.query(query, params, (err, results) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: "Database operation failed", 
          details: err.message 
        });
      }

      const formattedData = results.map(bill => ({
        'Invoice ID': bill.invoiceid || '',
        'Date': bill.date ? moment(bill.date).format('YYYY-MM-DD') : '',
        'Customer Name': bill.customer_name || '',
        'Contact': bill.contact || '',
        'Services': (() => {
          const servicesArr = tryParseJSON(bill.service_taken);
          return servicesArr
            .map(item => (item && item.name) ? item.name : (typeof item === 'string' ? item : ''))
            .filter(Boolean)
            .join(', ');
        })(),
        'Other Charges': parseFloat(bill.other_charges) || 0,
        'Discount': parseFloat(bill.discount) || 0,
        'Tax Rate': bill.tax_rate ? `${parseFloat(bill.tax_rate)}%` : '0%',
        'Total Amount': parseFloat(bill.amount) || 0,
        'Payment Method': bill.payment_method || 'cash'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(formattedData);
      
      const wscols = [
        { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 30 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
      ];
      ws['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(wb, ws, "Bills");

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const filename = `bills_export_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      res.send(buffer);
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: "Internal Server Error", 
      details: error.message 
    });
  }
};