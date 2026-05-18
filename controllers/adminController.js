import db from "../db/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

export const registerAdmin = async (req, res) => {
  const { shop_name, email, contact, country, currency, password } = req.body;

  try {
    const existingAdmin = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM admins WHERE email = ?",
        [email],
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        },
      );
    });

    if (existingAdmin.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO admins (shop_name, email, contact, country, currency, password) VALUES (?, ?, ?, ?, ?, ?)",
      [shop_name, email, contact, country, currency || "", hashedPassword],
      (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({
          message: "Admin registered successfully",
          adminId: result.insertId,
        });
      },
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const loginAdmin = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  db.query(
    "SELECT * FROM admins WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const admin = results[0];

      try {
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        if (!process.env.SECRET_KEY) {
          console.error("JWT Secret Key is missing");
          return res
            .status(500)
            .json({ message: "Server configuration error" });
        }

        const token = jwt.sign({ id: admin.id }, process.env.SECRET_KEY, {
          expiresIn: "24h",
        });

        res.json({
          message: "Login successful",
          token,
          admin: {
            id: admin.id,
            shop_name: admin.shop_name,
            email: admin.email,
            contact: admin.contact,
            country: admin.country,
            currency: admin.currency,
            country_code: admin.country_code,
          },
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login" });
      }
    },
  );
};

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
  const adminId = req.params.id;

  db.query(
    "SELECT * FROM admins WHERE id = ?",
    [adminId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (result.length === 0)
        return res.status(404).json({ message: "Admin not found" });

      res.json(result[0]);
    },
  );
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
    console.error("Password Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminSettings = async (req, res) => {
  try {
    const adminId = req.params.id;
    db.query(
      "SELECT currency, country, country_code FROM admins WHERE id = ?",
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
