import db from "../db/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

export const googleSignIn = async (req, res) => {
  const { idToken, shop_name, contact } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, given_name: firstName, family_name: lastName, picture: profile_url } = payload;

    db.query("SELECT * FROM admins WHERE email = ?", [email], (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (results.length > 0) {
        const admin = results[0];

        db.query("UPDATE admins SET profile_url = ? WHERE id = ?", [profile_url, admin.id]);

        const token = jwt.sign({ id: admin.id }, process.env.SECRET_KEY, { expiresIn: "24h" });

        return res.json({
          success: true,
          isNewUser: false,
          token,
          admin: { ...admin, profile_url }
        });

      } else {
        if (shop_name && contact) {
          db.query(
            "INSERT INTO admins (shop_name, firstName, lastName, email, contact, profile_url, currency) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [shop_name, firstName, lastName, email, contact, profile_url, "USD"],
            (insertErr, insertResult) => {
              if (insertErr) return res.status(500).json({ message: insertErr.message });

              db.query("SELECT * FROM admins WHERE id = ?", [insertResult.insertId], (fetchErr, newAdmin) => {
                const adminData = newAdmin[0];
                const token = jwt.sign({ id: adminData.id }, process.env.SECRET_KEY, { expiresIn: "24h" });

                return res.json({
                  success: true,
                  isNewUser: false,
                  token,
                  admin: adminData
                });
              });
            }
          );
        } else {
          return res.json({
            success: true,
            isNewUser: true,
            userData: { email, firstName, lastName, profile_url }
          });
        }
      }
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid Google Token" });
  }
};

export const getAdminById = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: "Admin id required" });
  }

  const query = `SELECT * FROM admins WHERE id = ?`;

  db.query(query, [id], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const admin = result[0];

    if (admin.subscription_start_date) {
      admin.subscription_start_date = new Date(admin.subscription_start_date).toISOString();
    }
    if (admin.subscription_expiry_date) {
      admin.subscription_expiry_date = new Date(admin.subscription_expiry_date).toISOString();
    }
    if (admin.subscription_renewal_date) {
      admin.subscription_renewal_date = new Date(admin.subscription_renewal_date).toISOString();
    }
    if (admin.trial_started_at) {
      admin.trial_started_at = new Date(admin.trial_started_at).toISOString();
    }

    return res.json({
      success: true,
      data: admin,
    });
  });
};

export const updateAdmin = async (req, res) => {
  const adminId = req.params.id;
  const { shop_name, firstName, lastName, email, contact, country } = req.body;

  try {
    const emailCheck = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM admins WHERE email = ? AND id != ?",
        [email, adminId],
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        },
      );
    });

    if (emailCheck.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    db.query(
      "UPDATE admins SET shop_name = ?, firstName = ?, lastName = ?, email = ?, contact = ?, country = ? WHERE id = ?",
      [shop_name, firstName, lastName, email, contact, country, adminId],
      (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        if (result.affectedRows === 0)
          return res.status(404).json({ message: "Admin not found" });

        res.json({ message: "Profile updated successfully" });
      },
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const changeAdminPassword = async (req, res) => {
  const adminId = req.params.id;
  const { newPassword } = req.body;

  try {
    const admin = await new Promise((resolve, reject) => {
      db.query(
        "SELECT id FROM admins WHERE id = ?",
        [adminId],
        (err, results) => {
          if (err) reject(err);
          resolve(results[0]);
        },
      );
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    db.query(
      "UPDATE admins SET password = ? WHERE id = ?",
      [hashedNewPassword, adminId],
      (err, result) => {
        if (err) return res.status(500).json({ message: err.message });

        if (result.affectedRows === 0)
          return res.status(404).json({ message: "Admin not found" });

        res.json({ message: "Password updated successfully" });
      },
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminSettings = async (req, res) => {
  try {
    const adminId = req.params.id;
    db.query(
      "SELECT currency, country, country_code, invoice_format FROM admins WHERE id = ?",
      [adminId],
      (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0)
          return res.status(404).json({ message: "Admin not found" });
        res.json(results[0]);
      },
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAdminSettings = async (req, res) => {
  const adminId = req.params.id;
  const { currency, country, country_code } = req.body;

  try {
    const currentSettings = await new Promise((resolve, reject) => {
      db.query(
        "SELECT currency, country, country_code FROM admins WHERE id = ?",
        [adminId],
        (err, results) => {
          if (err) reject(err);
          resolve(results[0]);
        },
      );
    });

    if (!currentSettings) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const updateValues = {
      currency: currency || currentSettings.currency,
      country: country || currentSettings.country,
      country_code: country_code || currentSettings.country_code,
    };

    db.query(
      "UPDATE admins SET currency = ?, country = ?, country_code = ? WHERE id = ?",
      [
        updateValues.currency,
        updateValues.country,
        updateValues.country_code,
        adminId,
      ],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (result.affectedRows === 0)
          return res.status(404).json({ message: "Admin not found" });

        res.json({
          success: true,
          message: "Settings updated",
          ...updateValues,
        });
      },
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyAdminBeforeDelete = async (req, res) => {
  const adminId = req.params.id;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required for verification" });
  }

  try {
    db.query(
      "SELECT email FROM admins WHERE id = ?",
      [adminId],
      (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Database error during verification" });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "Admin not found" });
        }

        const admin = results[0];

        if (admin.email.toLowerCase() !== email.toLowerCase()) {
          return res.status(401).json({ message: "Email does not match this account" });
        }

        res.json({
          success: true,
          message: "Identity verified successfully. You can now proceed to delete your account."
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error during verification" });
  }
};

export const deleteAdminAccount = async (req, res) => {
  const adminId = req.params.id;

  db.query("SELECT id FROM admins WHERE id = ?", [adminId], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error during validation" });
    if (results.length === 0) return res.status(404).json({ message: "Admin not found" });

    db.getConnection((poolErr, connection) => {
      if (poolErr) {
        return res.status(500).json({ message: "Database connection pool error", error: poolErr.message });
      }

      connection.beginTransaction(async (transactionErr) => {
        if (transactionErr) {
          connection.release();
          return res.status(500).json({ message: "Could not start deletion transaction" });
        }

        try {
          const relatedTables = [
            "bills",
            "customers",
            "expenses",
            "services",
            "spare_parts",
            "tax_details",
            "vehicles"
          ];

          for (const table of relatedTables) {
            await new Promise((resolve, reject) => {
              connection.query(
                `DELETE FROM ${table} WHERE admin_id = ?`,
                [adminId],
                (deleteErr) => {
                  if (deleteErr) reject(deleteErr);
                  else resolve();
                }
              );
            });
          }

          await new Promise((resolve, reject) => {
            connection.query(
              "DELETE FROM admins WHERE id = ?",
              [adminId],
              (deleteErr, result) => {
                if (deleteErr) reject(deleteErr);
                else resolve(result);
              }
            );
          });

          connection.commit((commitErr) => {
            if (commitErr) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ message: "Transaction commit failed" });
              });
            }

            connection.release();
            res.json({
              success: true,
              message: "Account and all associated data deleted successfully."
            });
          });

        } catch (error) {
          connection.rollback(() => {
            connection.release();
            res.status(500).json({ message: "Error deleting data", error: error.message });
          });
        }
      });
    });
  });
};

export const updatePremiumStatus = (req, res) => {
  const {
    adminId,
    subscriptionStatus,
    subscriptionType,
    subscriptionExpiryDate,
    subscriptionStartDate,
    subscriptionRenewalDate,
    trialStartedAt,
    isPremium,
    orderId,
  } = req.body;

  if (!adminId) {
    return res.status(400).json({ success: false, message: "Admin id required" });
  }

  const VALID_STATUSES = [
    'none',
    'trial_active',
    'trial_expired',
    'premium_active',
    'premium_expired',
  ];

  const status = VALID_STATUSES.includes(subscriptionStatus)
    ? subscriptionStatus
    : 'none';

  const premiumFlag = status === 'trial_active' || status === 'premium_active' ? 1 : 0;

  const startDate = subscriptionStartDate
    ? new Date(subscriptionStartDate).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const expiryDate = subscriptionExpiryDate
    ? new Date(subscriptionExpiryDate).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const renewalDate = subscriptionRenewalDate
    ? new Date(subscriptionRenewalDate).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const trialDate = trialStartedAt
    ? new Date(trialStartedAt).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const query = `
    UPDATE admins SET
      is_premium = ?,
      subscription_status = ?,
      subscription_type = ?,
      subscription_start_date = ?,
      subscription_expiry_date = ?,
      subscription_renewal_date = ?,
      trial_started_at = ?,
      subscription_order_id = ?
    WHERE id = ?
  `;

  const params = [
    premiumFlag,
    status,
    subscriptionType || null,
    startDate,
    expiryDate,
    renewalDate,
    trialDate,
    orderId || null,
    adminId,
  ];

  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Premium update error:', err);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    return res.json({
      success: true,
      message: "Premium status updated",
      data: {
        subscriptionStatus: status,
        isPremium: premiumFlag,
        adminId,
        orderId
      },
    });
  });
};

export const updatePremiumStatusPUT = (req, res) => {
  return updatePremiumStatus(req, res);
};

export const updateInvoiceNumberFormat = (req, res) => {
  const { adminId, prefix, format, digits, resetType } = req.body;

  if (!adminId) {
    return res.status(400).json({ success: false, message: "Admin id required" });
  }

  const invoiceFormat = {
    prefix: prefix || "",
    format: format || "######",
    digits: digits || 6,
    resetType: resetType || "monthly"
  };

  const invoiceFormatJSON = JSON.stringify(invoiceFormat);

  try {
    db.query("UPDATE admins SET invoice_format = ? WHERE id = ?", [invoiceFormatJSON, adminId], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error" });
      }
      return res.json({ success: true, message: "Invoice format updated" });
    });
  } catch (error) {
    return res.json({ success: true, message: "Internal server error" });
  }
};

export const getSubscriptionAnalytics = (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN subscription_status = 'trial_active' THEN 1 ELSE 0 END) as active_trial_users,
      SUM(CASE WHEN subscription_status = 'premium_active' THEN 1 ELSE 0 END) as active_premium_users,
      SUM(CASE WHEN subscription_status = 'trial_expired' THEN 1 ELSE 0 END) as expired_trial_users,
      SUM(CASE WHEN subscription_status = 'premium_expired' THEN 1 ELSE 0 END) as expired_premium_users,
      SUM(CASE WHEN subscription_status = 'none' THEN 1 ELSE 0 END) as no_subscription_users
    FROM admins
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Analytics error:', err);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    return res.json({
      success: true,
      data: result[0],
    });
  });
};

export const getFreeTrialUsers = (req, res) => {
  const query = `
    SELECT 
      id,
      shop_name,
      email,
      contact,
      subscription_status,
      subscription_start_date,
      subscription_expiry_date,
      trial_started_at,
      created_at
    FROM admins 
    WHERE subscription_status = 'trial_active'
    ORDER BY trial_started_at DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Get trial users error:', err);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    const formattedResult = result.map(user => ({
      ...user,
      subscription_start_date: user.subscription_start_date
        ? new Date(user.subscription_start_date).toISOString()
        : null,
      subscription_expiry_date: user.subscription_expiry_date
        ? new Date(user.subscription_expiry_date).toISOString()
        : null,
      trial_started_at: user.trial_started_at
        ? new Date(user.trial_started_at).toISOString()
        : null,
    }));

    return res.json({
      success: true,
      count: result.length,
      data: formattedResult,
    });
  });
};

export const getPremiumUsers = (req, res) => {
  const query = `
    SELECT 
      id,
      shop_name,
      email,
      contact,
      subscription_status,
      subscription_type,
      subscription_start_date,
      subscription_expiry_date,
      subscription_renewal_date,
      created_at
    FROM admins 
    WHERE subscription_status = 'premium_active'
    ORDER BY subscription_start_date DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Get premium users error:', err);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    const formattedResult = result.map(user => ({
      ...user,
      subscription_start_date: user.subscription_start_date
        ? new Date(user.subscription_start_date).toISOString()
        : null,
      subscription_expiry_date: user.subscription_expiry_date
        ? new Date(user.subscription_expiry_date).toISOString()
        : null,
      subscription_renewal_date: user.subscription_renewal_date
        ? new Date(user.subscription_renewal_date).toISOString()
        : null,
    }));

    return res.json({
      success: true,
      count: result.length,
      data: formattedResult,
    });
  });
};

export const getExpiredSubscriptions = (req, res) => {
  const query = `
    SELECT 
      id,
      shop_name,
      email,
      contact,
      subscription_status,
      subscription_type,
      subscription_start_date,
      subscription_expiry_date,
      trial_started_at,
      created_at
    FROM admins 
    WHERE subscription_status IN ('trial_expired', 'premium_expired')
    ORDER BY subscription_expiry_date DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Get expired subscriptions error:', err);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    const formattedResult = result.map(user => ({
      ...user,
      subscription_start_date: user.subscription_start_date
        ? new Date(user.subscription_start_date).toISOString()
        : null,
      subscription_expiry_date: user.subscription_expiry_date
        ? new Date(user.subscription_expiry_date).toISOString()
        : null,
      trial_started_at: user.trial_started_at
        ? new Date(user.trial_started_at).toISOString()
        : null,
    }));

    return res.json({
      success: true,
      count: result.length,
      data: formattedResult,
    });
  });
};