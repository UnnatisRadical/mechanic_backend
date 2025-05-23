import db from "../db/db.js";

export const getTaxDetails = (req, res) => {
  const { adminId } = req.params;
  
  if (!adminId) {
    return res.status(400).json({ 
      success: false, 
      message: "Admin ID is required" 
    });
  }

  db.query(
    `SELECT 
      tax_type as taxType,
      tax_number as taxNumber,
      tax_rate as taxRate,
      show_tax_rate as showTaxRate,
      show_tax_number as showTaxNumber
     FROM tax_details 
     WHERE admin_id = ? 
     LIMIT 1`, // Ensure only one row is returned
    [adminId], 
    (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ 
          success: false, 
          message: "Database operation failed" 
        });
      }
      
      if (results.length > 0) {
        res.status(200).json({
          success: true,
          data: results[0]
        });
      } else {
        // Return default structure if no record exists
        res.status(200).json({
          success: true,
          data: {
            taxType: "",
            taxNumber: "",
            taxRate: 0,
            showTaxRate: true,
            showTaxNumber: true
          }
        });
      }
    }
  );
};

export const saveTaxDetails = (req, res) => {
  const { adminId, taxType, taxNumber, taxRate, showTaxRate, showTaxNumber } = req.body;

  // Validation
  if (!adminId) {
    return res.status(400).json({ 
      success: false, 
      message: "Admin ID is required" 
    });
  }

  if (isNaN(taxRate) || taxRate < 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Tax rate must be a positive number" 
    });
  }

  const showTaxRateDB = showTaxRate !== false ? 1 : 0;
  const showTaxNumberDB = showTaxNumber !== false ? 1 : 0;

  // First delete any existing records for this admin to prevent duplicates
  db.query(
    "DELETE FROM tax_details WHERE admin_id = ?",
    [adminId],
    (deleteError, deleteResults) => {
      if (deleteError) {
        console.error("Error deleting existing tax details:", deleteError);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to clear existing tax details" 
        });
      }

      // Now insert the new record
      db.query(
        `INSERT INTO tax_details 
         (admin_id, tax_type, tax_number, tax_rate, show_tax_rate, show_tax_number)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          adminId, 
          taxType || "", 
          taxNumber || "", 
          parseFloat(taxRate) || 0, 
          showTaxRateDB, // Use converted value
          showTaxNumberDB // Use converted value
        ],
        (insertError, insertResult) => {
          if (insertError) {
            console.error("Tax details save error:", insertError);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to save tax details" 
            });
          }
          
          res.status(200).json({ 
            success: true, 
            message: "Tax details saved successfully",
            data: {
              taxType,
              taxNumber,
              taxRate: parseFloat(taxRate) || 0,
              showTaxRate: showTaxRate !== false, // Ensure boolean
              showTaxNumber: showTaxNumber !== false // Ensure boolean
            }
          });
        }
      );
    }
  );
};