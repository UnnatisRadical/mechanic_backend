import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import adminRoutes from "./routes/adminRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import workHistoryRoutes from "./routes/workHistoryRoutes.js";
import exportImportRoutes from "./routes/exportImportRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import profitRoutes from "./routes/profitRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import partRoutes from './routes/partRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';

dotenv.config();
const app = express();

app.use(express.json());

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("Hello Mechanic");
});

app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bills", billRoutes);
app.use("/api", taxRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/work-history", workHistoryRoutes);
app.use('/api', exportImportRoutes);
app.use('/api', expenseRoutes);
app.use('/api/profit', profitRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/vehicles', vehicleRoutes);

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
