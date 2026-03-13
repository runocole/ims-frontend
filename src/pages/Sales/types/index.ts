// src/pages/Sales/types/index.ts

export interface SerialNumbers {
  receiver?: string;
  receiver1?: string;
  receiver2?: string;
  data_logger?: string;
  external_radio?: string;
  [key: string]: any;
}

export interface SaleItem {
  id?: string;
  tool_id: string;
  equipment: string;
  equipment_type?: string;
  cost: string;
  category?: string;
  serial_set: string[];
  external_radio_serial?: string;
  datalogger_serial?: string;
  assigned_tool_id?: string;
  invoice_number?: string;
  import_invoice?: string;
}

export interface Sale {
  id: number;
  invoice_no?: string;
  customer_id?: number;
  name: string;
  phone: string;
  state: string;
  items: SaleItem[];
  total_cost: string;
  date_sold: string;
  invoice_number?: string;
  import_invoice?: string;
  payment_plan?: string;
  initial_deposit?: string;
  payment_months?: string;
  expiry_date?: string;
  payment_status?: string;
  status?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  state: string;
  user?: number;
}

export interface Tool {
  id: string | number;
  name: string;
  code: string;
  category: string;
  cost: string | number;
  stock: number;
  description?: string;
  supplier?: string;
  supplier_name?: string;
  invoice_number?: string;
  expiry_date?: string;
  date_added?: string;
  serials?: SerialNumbers | string[];
  available_serials?: string[];
  sold_serials?: any[];
  equipment_type?: string | null;
  equipment_type_id?: string | null;
  box_type?: string;
}

export interface GroupedTool {
  name: string;
  category: string;
  cost: string | number;
  total_stock: number;
  tool_count: number;
  description?: string;
  supplier_name?: string;
  group_id: string;
  invoice_number?: string;
}

export interface SoldSerialInfo {
  serial: string;
  sale_id: number;
  customer_name: string;
  date_sold: string;
  invoice_number?: string;
}

export interface AssignmentResult {
  open: boolean;
  toolName: string;
  serialSet: string[];
  serialCount: number;
  setType: string;
  assignedToolId: string;
  externalRadioSerial?: string | null;
  dataloggerSerial?: string;
  invoiceNumber?: string;
  importInvoice?: string;
}

export interface CurrentItem {
  selectedCategory: string;
  selectedEquipmentType: string;
  selectedTool: GroupedTool | null;
  cost: string;
  quantity: number;
}

export interface SaleDetails {
  payment_plan: string;
  initial_deposit: string;
  payment_months: string;
  expiry_date: string;
}

export const TOOL_CATEGORIES = [
  "Receiver",
  "Accessory",
  "Total Station",
  "Level",
  "Drones",
  "EchoSounder",
  "Laser Scanner",
  "Other",
];

export const RECEIVER_EQUIPMENT_TYPES = [
  "Base Only",
  "Rover Only", 
  "Base & Rover Combo",
  "Accessories"
];

export const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "installment",
  "failed",
  "cancelled"
];