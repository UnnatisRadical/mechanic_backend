import express from "express";
import { addCustomer, getCustomers, updateCustomer, deleteCustomer } from "../controllers/customerController.js";

const routes = express.Router();

routes.post('/add-customer', addCustomer);
routes.get('/get-customers', getCustomers);
routes.put('/update-customer', updateCustomer);
routes.delete('/:id', deleteCustomer);

export default routes;