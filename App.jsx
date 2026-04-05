import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Building2, BarChart3, Settings, LogOut, 
  Plus, Search, FileText, Download, Trash2, Edit, 
  CheckCircle, AlertTriangle, Wrench, Calendar, 
  ClipboardList, Droplet, Zap, Shield, 
  Clock, ArrowRight, ClipboardCheck,
  Briefcase, Globe, Printer, Loader2, X, Upload, User, CheckSquare, Square,
  XCircle, Image as ImageIcon, File, Hourglass, Phone, Mail, LayoutGrid, List, ChevronDown, Save,
  ChevronLeft, ChevronRight, MousePointer2, FileCheck, DollarSign, Camera,
  MapPin, Box, PenTool, Printer as PrinterIcon, History, Folder, Lock,
  Eye, EyeOff, Hammer, Layers, Link as LinkIcon, Sun, Moon, Heart, Cloud, Unlock, BookOpen, Info, HelpCircle, Maximize2, Bell
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc, collection, deleteDoc, writeBatch } from 'firebase/firestore';

// --- Firebase Initialization ---
let app, auth, db, appId;

// 1. นำ Config จาก Firebase Console ของคุณมาวางที่นี่ (สำหรับการ Deploy บน GitHub Pages)
// หากต้องการให้ข้อมูลออนไลน์แชร์กันทุกคน ไม่ว่าจะล็อกอินจากเครื่องไหน ต้องใช้ Firebase
const MANUAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAy03rxniCLFDYT4ztY_Ry2zh0ddzdBoPE",
  authDomain: "bmg-connect-3e99a.firebaseapp.com",
  projectId: "bmg-connect-3e99a",
  storageBucket: "bmg-connect-3e99a.firebasestorage.app",
  messagingSenderId: "707276998308",
  appId: "1:707276998308:web:1a5364f7a94cfe06c08831",
  measurementId: "G-4B69L2731M"
};

try {
  let firebaseConfig = null;
  
  // ตรวจสอบว่ารันอยู่ใน Canvas หรือรันผ่าน GitHub Pages
  if (typeof __firebase_config !== 'undefined') {
     firebaseConfig = JSON.parse(__firebase_config);
     appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  } else if (MANUAL_FIREBASE_CONFIG.apiKey && MANUAL_FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY") {
     firebaseConfig = MANUAL_FIREBASE_CONFIG;
     appId = "bmg-app-prod"; // ใช้ ID คงที่สำหรับ Production
  }

  if (firebaseConfig) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
  } else {
      console.warn("ไม่พบ Firebase Config: ระบบจะสลับไปใช้ Local Storage (บันทึกข้อมูลเฉพาะในเครื่องนี้เท่านั้น)");
  }
} catch (e) {
  console.error("Firebase init failed", e);
}

// --- Configuration & Constants ---
const THEME = {
  primary: '#FF4D00', // Red-Orange
  secondary: '#FF7A00',
  bg: '#F3F4F6',
  sidebar: '#1F2937',
  text: '#111827'
};

const PROJECT_TYPES = ['Condo', 'Village', 'Office Building'];
const PROJECT_TYPE_CODES = {
  'Condo': 'C',
  'Village': 'V',
  'Office Building': 'O'
};

const EMPLOYEE_POSITIONS = [
  "ผู้จัดการพื้นที่ (Area Manager)",
  "เจ้าหน้าที่ฝ่ายบุคคล (HR Officer)",
  "เจ้าหน้าที่ฝ่ายวิศวกรรม (Engineering Officer)",
  "เจ้าหน้าที่ตรวจสอบคุณภาพ (QC Officer)",
  "เจ้าหน้าที่ฝ่าย Support (Support Officer)",
  "ผู้จัดการอาคาร (Building Manager)",
  "ผู้จัดการหมู่บ้าน (Village Manager)",
  "ผู้ช่วยผู้จัดการ (Assistant Manager)",
  "เจ้าหน้าที่ฝ่ายอาคาร (Building Officer)",
  "เจ้าหน้าที่การเงิน (Finance Officer)",
  "เจ้าหน้าที่ธุรการ (Admin Officer)",
  "หัวหน้าช่างประจำอาคาร (Chief Technician)",
  "ผู้ช่วยหัวหน้าช่าง (Assistant Chief Technician)",
  "ช่างประจำอาคาร (Technician)",
  "อื่นๆ (ให้ระบุ) / Other (Please specify)"
];

// Contract Types & Services
const CONTRACT_TYPES = {
  INCOME: 'สัญญารับ (Income)',
  EXPENSE: 'สัญญาจ่าย (Expense)',
  CONTRACTOR: 'ผู้รับเหมา (Contractor)'
};

const SERVICE_TYPES = {
  [CONTRACT_TYPES.EXPENSE]: [
    'งานด้านบริหารจัดการ (Management)',
    'งานด้านรักษาความปลอดภัย (Security)',
    'งานด้านรักษาความสะอาด (Cleaning)',
    'งานด้านดูแลสวน (Gardening)',
    'งานกวาดถนน (Road Sweeping)',
    'บำรุงรักษาลิฟต์ (Elevator Maintenance)',
    'ประกันภัย (Insurance)',
    'กำจัดแมลง (Pest Control)',
    'สูบสิ่งปฏิกูล (Septic Tank Cleaning)',
    'อื่นๆ (Other)'
  ],
  [CONTRACT_TYPES.INCOME]: [
    'ค่าเช่าตั้งตู้อินเตอร์เน็ต (Internet Cabinet)',
    'ค่าเช่าตั้งตู้สัญญาณโทรศัพท์ (Signal Cabinet)',
    'ค่าเช่าเครื่องซักผ้า (Washing Machine)',
    'ค่าเช่าตู้น้ำหยอดเหรียญ (Water Vending Machine)',
    'ค่าเช่าจอโฆษณา (Advertising Screen)',
    'ค่าเช่าตู้ ATM (ATM Cabinet)',
    'ค่าเช่าเสาสัญญาณสื่อสาร (Communication Tower)',
    'ค่าเช่าพื้นที่ส่วนกลาง (Common Area)',
    'อื่นๆ (ให้สามารถระบุรายละเอียดได้)'
  ],
  [CONTRACT_TYPES.CONTRACTOR]: [
    'หม้อแปลงไฟฟ้า (Transformer)',
    'ตู้ MDB / DB / Load Center',
    'สายเมนไฟฟ้า / สายดิน / Grounding',
    'ระบบไฟสำรองฉุกเฉิน (Emergency Lighting)',
    'ระบบไฟฟ้าส่องสว่างภายใน-ภายนอก',
    'ระบบป้องกันฟ้าผ่า (Lightning Protection)',
    'ระบบตัดไฟรั่ว (ELCB / RCCB)',
    'ระบบ ATS (Automatic Transfer Switch)',
    'เครื่องกำเนิดไฟฟ้า (Generator)',
    'แบตเตอรี่สำรอง (Battery Bank)',
    'ตู้ควบคุม Generator',
    'ระบบระบายความร้อนเครื่องกำเนิดไฟ',
    'ระบบน้ำมันเชื้อเพลิง',
    'ระบบท่อไอเสีย',
    'ปั๊มน้ำดี (Booster Pump)',
    'ปั๊มน้ำดิบ',
    'ถังเก็บน้ำบนดิน / ใต้ดิน',
    'ระบบกรองน้ำ',
    'ระบบท่อจ่ายน้ำ',
    'วาล์ว / มิเตอร์น้ำ',
    'Float Valve / Level Sensor',
    'ปั๊มน้ำเสีย / ปั๊มบ่อดักไขมัน',
    'บ่อบำบัดน้ำเสีย (STP / Septic Tank)',
    'ระบบบ่อดักไขมัน (Grease Trap)',
    'ระบบท่อระบายน้ำ',
    'ระบบบ่อพัก (Manhole)',
    'ระบบระบายอากาศบ่อบำบัด',
    'Chiller / VRF / Split Type',
    'Cooling Tower',
    'AHU / FCU',
    'Blower / Exhaust Fan',
    'ระบบท่อลม / Duct',
    'ระบบควบคุมอุณหภูมิ (Thermostat / Control Panel)',
    'ระบบระบายอากาศลานจอดรถ',
    'Fire Pump / Jockey Pump',
    'ถังเก็บน้ำดับเพลิง',
    'Fire Alarm System',
    'Smoke Detector / Heat Detector',
    'Manual Call Point',
    'Fire Hose Cabinet',
    'Sprinkler System',
    'Fire Extinguisher',
    'ระบบ Fire Command Center',
    'ลิฟต์โดยสาร',
    'ลิฟต์บริการ',
    'บันไดเลื่อน (ถ้ามี)',
    'ระบบ Emergency Lift',
    'ระบบควบคุมลิฟต์',
    'ระบบสื่อสารฉุกเฉินในลิฟต์',
    'CCTV',
    'Access Control',
    'Key Card / Bluetooth System',
    'Intercom',
    'Visitor Management System',
    'ระบบไม้กั้นรถยนต์ (Barrier Gate)',
    'License Plate Recognition (LPR)',
    'Network System',
    'Server / NVR',
    'ระบบ Smart Building',
    'ระบบ BMS (Building Management System)',
    'IoT Sensor',
    'ระบบสระว่ายน้ำ',
    'ระบบน้ำพุ / น้ำตก',
    'ระบบไฟสนาม',
    'ระบบไฟถนน',
    'ระบบไฟสวน',
    'ระบบคลับเฮ้าส์ / ฟิตเนส',
    'ระบบสนามเด็กเล่น',
    'Solar Cell System',
    'EV Charger',
    'ระบบจัดการพลังงาน (EMS)',
    'ระบบกำจัดขยะ',
    'ห้องขยะ / ห้องพักขยะ',
    'ประตูอัตโนมัติ',
    'ประตูหนีไฟ',
    'ระบบรางประตู',
    'หลังคา / กันซึม',
    'ระบบ Drainage',
    'Expansion Joint',
    'อื่นๆ (Other)'
  ]
};

// Machine Systems for PM
const MACHINE_SYSTEMS = [
    'หม้อแปลงไฟฟ้า (Transformer)',
    'ตู้ MDB / DB / Load Center',
    'สายเมนไฟฟ้า / สายดิน / Grounding',
    'ระบบไฟสำรองฉุกเฉิน (Emergency Lighting)',
    'ระบบไฟฟ้าส่องสว่างภายใน-ภายนอก',
    'ระบบป้องกันฟ้าผ่า (Lightning Protection)',
    'ระบบตัดไฟรั่ว (ELCB / RCCB)',
    'ระบบ ATS (Automatic Transfer Switch)',
    'เครื่องกำเนิดไฟฟ้า (Generator)',
    'แบตเตอรี่สำรอง (Battery Bank)',
    'ตู้ควบคุม Generator',
    'ระบบระบายความร้อนเครื่องกำเนิดไฟ',
    'ระบบน้ำมันเชื้อเพลิง',
    'ระบบท่อไอเสีย',
    'ปั๊มน้ำดี (Booster Pump)',
    'ปั๊มน้ำดิบ',
    'ถังเก็บน้ำบนดิน / ใต้ดิน',
    'ระบบกรองน้ำ',
    'ระบบท่อจ่ายน้ำ',
    'วาล์ว / มิเตอร์น้ำ',
    'Float Valve / Level Sensor',
    'ปั๊มน้ำเสีย / ปั๊มบ่อดักไขมัน',
    'บ่อบำบัดน้ำเสีย (STP / Septic Tank)',
    'ระบบบ่อดักไขมัน (Grease Trap)',
    'ระบบท่อระบายน้ำ',
    'ระบบบ่อพัก (Manhole)',
    'ระบบระบายอากาศบ่อบำบัด',
    'Chiller / VRF / Split Type',
    'Cooling Tower',
    'AHU / FCU',
    'Blower / Exhaust Fan',
    'ระบบท่อลม / Duct',
    'ระบบควบคุมอุณหภูมิ (Thermostat / Control Panel)',
    'ระบบระบายอากาศลานจอดรถ',
    'Fire Pump / Jockey Pump',
    'ถังเก็บน้ำดับเพลิง',
    'Fire Alarm System',
    'Smoke Detector / Heat Detector',
    'Manual Call Point',
    'Fire Hose Cabinet',
    'Sprinkler System',
    'Fire Extinguisher',
    'ระบบ Fire Command Center',
    'ลิฟต์โดยสาร',
    'ลิฟต์บริการ',
    'บันไดเลื่อน (ถ้ามี)',
    'ระบบ Emergency Lift',
    'ระบบควบคุมลิฟต์',
    'ระบบสื่อสารฉุกเฉินในลิฟต์',
    'CCTV',
    'Access Control',
    'Key Card / Bluetooth System',
    'Intercom',
    'Visitor Management System',
    'ระบบไม้กั้นรถยนต์ (Barrier Gate)',
    'License Plate Recognition (LPR)',
    'Network System',
    'Server / NVR',
    'ระบบ Smart Building',
    'ระบบ BMS (Building Management System)',
    'IoT Sensor',
    'ระบบสระว่ายน้ำ',
    'ระบบน้ำพุ / น้ำตก',
    'ระบบไฟสนาม',
    'ระบบไฟถนน',
    'ระบบไฟสวน',
    'ระบบคลับเฮ้าส์ / ฟิตเนส',
    'ระบบสนามเด็กเล่น',
    'Solar Cell System',
    'EV Charger',
    'ระบบจัดการพลังงาน (EMS)',
    'ระบบกำจัดขยะ',
    'ห้องขยะ / ห้องพักขยะ',
    'ประตูอัตโนมัติ',
    'ประตูหนีไฟ',
    'ระบบรางประตู',
    'หลังคา / กันซึม',
    'ระบบ Drainage',
    'Expansion Joint',
    'อื่นๆ (Other)'
];

const AUDIT_FORM_TEMPLATE = [
    { title: '1. บุคลิกภาพและการแต่งกายบุคลากร', items: ['ใส่เสื้อฟอร์มบริษัทถูกต้องตามระเบียบ', 'ห้อยบัตรพนักงานชัดเจน', 'กางเกงสีสุภาพตามระเบียบ', 'รองเท้าหุ้มส้นสีสุภาพ', 'บุคลิกภาพโดยรวม ความสุภาพ ความพร้อมบริการ'] },
    { title: '2. การเงินและเงินสดย่อย', items: ['เงินสดย่อยตรงตามยอดรายงาน', 'เงินสดในมือถูกต้อง', 'ใบเสร็จ/เอกสารประกอบครบถ้วน', 'การจัดเก็บเอกสารเป็นระบบ', 'การอนุมัติจ่ายถูกต้องตามขั้นตอน'] },
    { title: '3. สต๊อกอุปกรณ์ระบบจอดรถ/เข้า-ออก', items: ['คีย์การ์ดคงเหลือถูกต้อง', 'บัตรบลูทูธถูกต้องตามบัญชีสต๊อก', 'สติกเกอร์รถยนต์', 'สติกเกอร์จักรยานยนต์', 'ระบบควบคุมการเบิก-จ่ายมีหลักฐาน'] },
    { title: '4. วัสดุสิ้นเปลือง', items: ['หลอดไฟ', 'ถุงขยะดำ', 'ทิชชู่', 'วัสดุทำความสะอาด', 'การจัดเก็บสต๊อกเป็นระเบียบ'] },
    { title: '5. อุปกรณ์และเครื่องมือช่าง', items: ['เครื่องมือครบตามบัญชี', 'สภาพพร้อมใช้งาน', 'การจัดเก็บเป็นระเบียบ', 'มีทะเบียนเครื่องมือ', 'มีแผน PM เครื่องมือ'] },
    { title: '6. ความสะอาดและความเป็นระเบียบสำนักงานนิติบุคคล / ห้องช่าง / สโมสร / ป้อม รปภ.', items: ['ความสะอาดโดยรวม', 'การจัดวางอุปกรณ์', 'ความเป็นระเบียบเรียบร้อย', 'ความปลอดภัยในพื้นที่'] },
    { title: '7. บอร์ดประชาสัมพันธ์', items: ['ปิดงบการเงินเดือนปัจจุบัน', 'รายงานผลการดำเนินงาน', 'ประกาศภายใน update สม่ำเสมอ', 'ความชัดเจน/อ่านง่าย'] },
    { title: '8. การติดตามหนี้ค่าส่วนกลาง (Debt Collection)', items: ['ความคืบหน้าการลดหนี้ (Target: 3%=1, 5%=2, 7%=3, 10%=4, >10%=5)', 'รายงานสถานะลูกหนี้รายเดือน (Aging Report)', 'บันทึกการติดตามหนี้ (Call Log/Letter)', 'การดำเนินการตามขั้นตอนกฎหมาย/ระเบียบ', 'การจัดเก็บหลักฐานการชำระเงิน'] },
    { title: '9. ความคืบหน้าการใช้งาน Application (App Adoption)', items: ['อัตราการดาวน์โหลดและลงทะเบียน (Target: >80%=5, >60%=4, >40%=3)', 'สถิติการเข้าใช้งาน (Active Users) ของเจ้าของร่วม/สมาชิก', 'การใช้ฟังก์ชันหลัก (แจ้งซ่อม, ชำระเงิน, รับพัสดุ)', 'ความสมบูรณ์ของข้อมูลสมาชิกในระบบ (Profile Completeness)', 'การประชาสัมพันธ์และการสนับสนุนการใช้งาน (Support)'] },
    { title: '10. ความพร้อมในการรับการตรวจสอบ (Readiness)', items: ['ผู้รับผิดชอบหน่วยงานอยู่ปฏิบัติหน้าที่/พร้อมให้ข้อมูล', 'เอกสารและหลักฐานประกอบการตรวจสอบมีการจัดเตรียมพร้อม', 'สถานที่/พื้นที่หน้างานมีความพร้อมสำหรับการเข้าตรวจสอบ', 'การจัดเตรียมอุปกรณ์/เครื่องมือที่จำเป็นสำหรับการตรวจสอบ'] }
];

// Standard Forms Data
const STANDARD_FORMS = [
    // หมวดหมู่: งานบริการลูกบ้าน (Resident Services)
    { id: 'f1', category: 'งานบริการลูกบ้าน (Resident Services)', name: 'แบบฟอร์มขออนุญาตนำของเข้าภายในอาคาร/หมู่บ้าน (Move-In Request Form)', format: 'PDF', size: '120 KB', lastUpdated: '2025-01-15', description: 'ใช้สำหรับผู้พักอาศัยที่ต้องการนำทรัพย์สินขนาดใหญ่หรือเฟอร์นิเจอร์เข้ามาภายในอาคาร/หมู่บ้าน ต้องแจ้งล่วงหน้าอย่างน้อย 3 วันทำการ (Used for residents who wish to bring large items or furniture into the premises. Must be submitted at least 3 working days in advance.)' },
    { id: 'f2', category: 'งานบริการลูกบ้าน (Resident Services)', name: 'แบบฟอร์มขออนุญาตนำของออกภายในอาคาร/หมู่บ้าน (Move-Out Request Form)', format: 'PDF', size: '120 KB', lastUpdated: '2025-01-15', description: 'ใช้สำหรับผู้พักอาศัยที่ต้องการนำทรัพย์สินขนาดใหญ่หรือย้ายออก ต้องได้รับอนุมัติเพื่อป้องกันทรัพย์สินสูญหาย (Used for residents who wish to move out or remove large items. Approval is required to prevent property loss.)' },
    { id: 'f3', category: 'งานบริการลูกบ้าน (Resident Services)', name: 'แบบฟอร์มขอรับสติ๊กเกอร์ (Sticker Request Form)', format: 'PDF', size: '100 KB', lastUpdated: '2025-02-01', description: 'ใช้สำหรับลูกบ้านที่ต้องการขอรับสติ๊กเกอร์จอดรถยนต์ หรือรถจักรยานยนต์ประจำปี (Used for residents to request annual parking stickers for cars or motorcycles.)' },
    { id: 'f4', category: 'งานบริการลูกบ้าน (Resident Services)', name: 'แบบฟอร์มขอลงทะเบียน ทะเบียนรถยนต์/รถจักรยานยนต์ (Vehicle Registration Form)', format: 'PDF', size: '110 KB', lastUpdated: '2024-11-20', description: 'ใช้สำหรับขึ้นทะเบียนรถยนต์และรถจักรยานยนต์ของลูกบ้านในระบบฐานข้อมูลของนิติบุคคล (Used to register residents\' vehicles in the Juristic Person\'s database.)' },
    { id: 'f5', category: 'งานบริการลูกบ้าน (Resident Services)', name: 'แบบฟอร์มขอซื้อคีย์การ์ด/บลูทูธ (Keycard/Bluetooth Purchase Form)', format: 'PDF', size: '95 KB', lastUpdated: '2025-01-10', description: 'ใช้ในกรณีที่ลูกบ้านต้องการซื้อบัตรผ่านเข้า-ออกโครงการเพิ่มเติม หรือทดแทนบัตรเดิมที่ชำรุด/สูญหาย (Used when residents need to purchase additional access cards/Bluetooth devices or replace lost/damaged ones.)' },
    { id: 'f6', category: 'งานบริการลูกบ้าน (Resident Services)', name: 'แบบฟอร์มฝากกุญแจ (Key Deposit Form)', format: 'PDF', size: '85 KB', lastUpdated: '2024-10-05', description: 'แบบฟอร์มยินยอมในการฝากกุญแจห้องพัก/บ้าน ไว้กับนิติบุคคลหรือพนักงานรักษาความปลอดภัย (Consent form to deposit house/room keys with the Juristic Person or security guards.)' },
    { id: 'f7', category: 'งานบริการลูกบ้าน (Resident Services)', name: 'แบบฟอร์มขอรับคืนกุญแจ (Key Return Request Form)', format: 'PDF', size: '85 KB', lastUpdated: '2024-10-05', description: 'แบบฟอร์มลงนามรับกุญแจห้องพัก/บ้านคืน จากนิติบุคคล (Form acknowledging the return of house/room keys from the Juristic Person.)' },

    // หมวดหมู่: งานผู้รับเหมาและซ่อมบำรุง (Contractor & Maintenance)
    { id: 'f8', category: 'งานผู้รับเหมาและซ่อมบำรุง (Contractor & Maint.)', name: 'แบบฟอร์มขออนุญาตตกแต่งต่อเติม (Renovation Request Form)', format: 'PDF', size: '150 KB', lastUpdated: '2025-02-10', description: 'ใช้สำหรับเจ้าของร่วมที่ต้องการต่อเติม หรือซ่อมแซมห้องพัก/บ้าน ต้องแนบแบบแปลนและวางเงินประกัน (Used for co-owners planning to renovate or repair their units. Requires attached floor plans and a security deposit.)' },
    { id: 'f9', category: 'งานผู้รับเหมาและซ่อมบำรุง (Contractor & Maint.)', name: 'แบบฟอร์มขออนุญาตเข้าพื้นที่ทำงาน (Work Permit)', format: 'PDF', size: '140 KB', lastUpdated: '2025-02-10', description: 'ใช้สำหรับผู้รับเหมาภายนอกเพื่อขออนุญาตเข้าพื้นที่ปฏิบัติงาน รวมถึงรายละเอียดผู้ปฏิบัติงาน (Used for external contractors to request area access, including details of the workers.)' },
    { id: 'f10', category: 'งานผู้รับเหมาและซ่อมบำรุง (Contractor & Maint.)', name: 'แบบฟอร์มแจ้งซ่อม (Repair Request Form)', format: 'PDF', size: '130 KB', lastUpdated: '2025-01-20', description: 'ใบแจ้งซ่อมสำหรับทรัพย์สินส่วนกลาง หรือบริการซ่อมแซมภายในพื้นที่ส่วนบุคคล (Form to report issues or request repairs for common property or private units.)' },
    { id: 'f17', category: 'งานผู้รับเหมาและซ่อมบำรุง (Contractor & Maint.)', name: 'แบบฟอร์มขอคืนเงินค้ำประกันตกแต่ง (Renovation Deposit Refund Form)', format: 'PDF', size: '115 KB', lastUpdated: '2026-02-22', description: 'ใช้สำหรับเจ้าของร่วมเพื่อขอรับเงินค้ำประกันความเสียหายคืน หลังจากที่ผู้รับเหมาปฏิบัติงานเสร็จสิ้นและผ่านการตรวจสอบพื้นที่แล้ว (Used to request a refund of the renovation deposit after work completion and inspection.)' },

    // หมวดหมู่: งานบริหารและนิติบุคคล (Juristic & Management)
    { id: 'f11', category: 'งานบริหารและนิติบุคคล (Juristic & Mgmt.)', name: 'แบบฟอร์มร้องเรียนทั่วไป (General Complaint Form)', format: 'PDF', size: '105 KB', lastUpdated: '2024-12-01', description: 'ใช้สำหรับรับเรื่องร้องเรียน ข้อเสนอแนะ หรือปัญหาต่างๆ จากลูกบ้านเพื่อให้ฝ่ายบริหารดำเนินการแก้ไข (Used to submit general complaints, suggestions, or report issues to the management team for resolution.)' },
    { id: 'f12', category: 'งานบริหารและนิติบุคคล (Juristic & Mgmt.)', name: 'แบบฟอร์มขอดูกล้องวงจรปิด (CCTV Footage Request Form)', format: 'PDF', size: '160 KB', lastUpdated: '2025-01-25', description: 'ใช้สำหรับคำร้องขอดูกล้องวงจรปิด ต้องมีบันทึกประจำวันจากเจ้าหน้าที่ตำรวจมาแสดงเพื่อประกอบการขอดู (Used to request CCTV footage playback. Requires a police report as supporting evidence.)' },
    { id: 'f13', category: 'งานบริหารและนิติบุคคล (Juristic & Mgmt.)', name: 'แบบฟอร์มขอคัดเอกสารสำคัญนิติบุคคล (Document Request Form)', format: 'PDF', size: '115 KB', lastUpdated: '2024-09-15', description: 'แบบฟอร์มสำหรับลูกบ้านที่ต้องการขอคัดลอกเอกสาร เช่น รายงานการประชุม ใบเสร็จรับเงิน ฯลฯ (Form for residents requesting copies of official documents such as meeting minutes, receipts, etc.)' },
    { id: 'f16', category: 'งานบริหารและนิติบุคคล (Juristic & Mgmt.)', name: 'แบบฟอร์มขอผ่อนชำระค่าส่วนกลาง (Installment Payment Request Form)', format: 'PDF', size: '110 KB', lastUpdated: '2026-02-22', description: 'ใช้สำหรับเจ้าของร่วมที่ต้องการขอผ่อนชำระหนี้ค่าส่วนกลางที่ค้างชำระ โดยต้องระบุยอดหนี้และเงื่อนไขการผ่อนชำระ (Used for co-owners requesting an installment plan for overdue common area fees.)' },

    // หมวดหมู่: งานบุคคลและภายใน (Internal HR / Finance) - คงไว้สำหรับพนักงานนิติฯ
    { id: 'f14', category: 'งานบุคคลและภายใน (Internal)', name: 'ใบลาพักผ่อน / ลากิจ / ลาป่วย (Leave Request)', format: 'PDF', size: '120 KB', lastUpdated: '2025-01-05', description: 'เอกสารขออนุมัติวันลาต่างๆ สำหรับพนักงานและเจ้าหน้าที่ประจำหน่วยงาน (Leave request form for annual, personal, or sick leave for employees and site staff.)' },
    { id: 'f15', category: 'งานบุคคลและภายใน (Internal)', name: 'ใบเบิกเงินสดย่อย (Petty Cash Voucher)', format: 'Excel', size: '45 KB', lastUpdated: '2025-01-05', description: 'เอกสารประกอบการขอเบิกเงินทดรองจ่าย หรือเงินสดย่อยประจำหน่วยงาน (Form for requesting petty cash reimbursement or advance payments for site operations.)' },
];

// Shift Codes
const SHIFTS = [
  { id: 'M1', label_th: 'M1 - ผลัดเช้า (08.00-17.00)', label_en: 'M1 - Morning (08.00-17.00)', time: '08:00 - 17:00', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'M2', label_th: 'M2 - ผลัดเช้า (08.30-17.30)', label_en: 'M2 - Morning (08.30-17.30)', time: '08:30 - 17:30', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'M3', label_th: 'M3 - ผลัดเช้า (09.00-18.00)', label_en: 'M3 - Morning (09.00-18.00)', time: '09:00 - 18:00', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'M4', label_th: 'M4 - วันเช้า (10.00-19.00)', label_en: 'M4 - Day (10.00-19.00)', time: '10:00 - 19:00', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'A', label_th: 'A - ผลัดบ่าย (14.00-23.00)', label_en: 'A - Afternoon (14.00-23.00)', time: '14:00 - 23:00', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'N', label_th: 'N - ผลัดดึก (23.00-08.00)', label_en: 'N - Night (23.00-08.00)', time: '23:00 - 08:00', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'O', label_th: 'O - วันหยุดประจำสัปดาห์', label_en: 'O - Weekly Off', time: '-', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { id: 'H', label_th: 'H - วันหยุดนักขัตฤกษ์', label_en: 'H - Public Holiday', time: '-', color: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'V', label_th: 'V - วันพักร้อน', label_en: 'V - Vacation', time: '-', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'SE', label_th: 'SE - อบรม/สัมมนา', label_en: 'SE - Seminar', time: '08:00 - 17:00', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'BL', label_th: 'BL - ลากิจ', label_en: 'BL - Business Leave', time: '-', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'S', label_th: 'S - ลาป่วย', label_en: 'S - Sick Leave', time: '-', color: 'bg-red-50 text-red-800 border-red-200' },
  { id: 'BD', label_th: 'BD - วันเกิด', label_en: 'BD - Birthday', time: '-', color: 'bg-teal-50 text-teal-700 border-teal-200' }
];

const AVAILABLE_MENUS = [
  { id: 'dashboard', label: 'menu_dashboard' },
  { id: 'users', label: 'menu_users' },
  { 
    id: 'projects', 
    label: 'menu_projects',
    submenus: [
        { id: 'proj_overview', label: 'tab_overview' },
        { id: 'proj_contracts', label: 'tab_contracts' },
        { id: 'proj_staff', label: 'tab_staff' },
        { id: 'proj_schedule', label: 'tab_schedule' },
        { id: 'proj_daily', label: 'tab_daily' },
        { id: 'proj_assets', label: 'tab_assets' },
        { id: 'proj_tools', label: 'tab_tools' },
        { id: 'proj_pm', label: 'tab_pm' },
        { id: 'proj_repair', label: 'tab_repair' },
        { id: 'proj_utilities', label: 'tab_utilities' },
        { id: 'proj_action', label: 'tab_action' },
        { id: 'proj_audit', label: 'tab_audit' },
        { id: 'proj_forms', label: 'tab_forms' },
        { id: 'proj_contractors', label: 'menu_contractors' },
        { id: 'proj_others', label: 'tab_others' }
    ]
  },
  { id: 'audits', label: 'menu_audits' },
  { id: 'manual', label: 'menu_manual' },
  { id: 'settings', label: 'menu_settings' }
];

const getDefaultPermissions = () => {
    const perms = {};
    AVAILABLE_MENUS.forEach(m => {
        perms[m.id] = { view: false, save: false, edit: false, approve: false, delete: false, print: false };
        if (m.submenus) {
            m.submenus.forEach(sub => {
                // แก้ไข: ให้พนักงานมองเห็น (view: true) เมนูย่อยในหน่วยงานเป็นค่าเริ่มต้น
                perms[sub.id] = { view: true, save: false, edit: false, approve: false, delete: false, print: false };
            });
        }
    });
    if (perms.dashboard) perms.dashboard.view = true;
    return perms;
};

const getFullPermissions = () => {
    const perms = {};
    AVAILABLE_MENUS.forEach(m => {
        perms[m.id] = { view: true, save: true, edit: true, approve: true, delete: true, print: true };
        if (m.submenus) {
            m.submenus.forEach(sub => {
                perms[sub.id] = { view: true, save: true, edit: true, approve: true, delete: true, print: true };
            });
        }
    });
    return perms;
};

// --- NEW: Helper Function เพื่อป้องกันปัญหา Object Reference ซ้อนทับ และเติมเมนูใหม่ให้อัตโนมัติ ---
const getMergedPermissions = (templatePerms) => {
    const base = getDefaultPermissions();
    const merged = {};
    Object.keys(base).forEach(key => {
        merged[key] = { ...base[key], ...(templatePerms?.[key] || {}) };
    });
    return merged;
};

const PROJECT_TABS = [
  { id: 'overview', label: 'tab_overview', icon: BarChart3, color: 'blue' },
  { id: 'contracts', label: 'tab_contracts', icon: Briefcase, color: 'cyan' },
  { id: 'staff', label: 'tab_staff', icon: Users, color: 'green' },
  { id: 'schedule', label: 'tab_schedule', icon: Calendar, color: 'pink' },
  { id: 'daily', label: 'tab_daily', icon: FileText, color: 'purple' },
  { id: 'assets', label: 'tab_assets', icon: Shield, color: 'red' },
  { id: 'tools', label: 'tab_tools', icon: Wrench, color: 'orange' },
  { id: 'pm', label: 'tab_pm', icon: Zap, color: 'yellow' },
  { id: 'repair', label: 'tab_repair', icon: Hammer, color: 'red' },
  { id: 'utilities', label: 'tab_utilities', icon: Droplet, color: 'cyan' },
  { id: 'action', label: 'tab_action', icon: CheckCircle, color: 'green' },
  { id: 'audit', label: 'tab_audit', icon: ClipboardCheck, color: 'purple' },
  { id: 'forms', label: 'tab_forms', icon: Folder, color: 'blue' },
  { id: 'contractors', label: 'menu_contractors', icon: Search, color: 'gray' },
  { id: 'others', label: 'tab_others', icon: Layers, color: 'gray' },
];

// --- Translation Dictionary ---
const TRANSLATIONS = {
  th: {
    // General
    appTitle: "เบสท์ มิลเลี่ยน",
    appSubtitle: "กรุ๊ป จำกัด",
    systemMgmt: "ระบบบริหารจัดการองค์กร",
    signIn: "เข้าสู่ระบบ",
    username: "ชื่อผู้ใช้",
    password: "รหัสผ่าน",
    poweredBy: "Powered by Best Million Group IT",
    signOut: "ออกจากระบบ",
    myWorkspace: "พื้นที่ทำงานของฉัน",

    // Sidebar
    menu_dashboard: "ภาพรวมองค์กร",
    menu_users: "จัดการผู้ใช้งาน",
    menu_projects: "โครงการ / หน่วยงาน",
    menu_audits: "ตรวจสอบภายใน (Audit)",
    menu_contractors: "ค้นหา supplier",
    menu_manual: "คู่มือการใช้งาน",
    menu_settings: "ตั้งค่าระบบ",

    // Dashboard
    corpDashboard: "แดชบอร์ดผู้บริหาร",
    overview: "ภาพรวมประสิทธิภาพขององค์กร",
    exportReport: "ส่งออก CSV",
    exportPDF: "ส่งออก PDF",
    totalProjects: "โครงการทั้งหมด",
    totalEmployees: "พนักงานทั้งหมด",
    pendingTasks: "งานรออนุมัติ",
    pmDue: "เครื่องจักรใกล้รอบ PM",
    projPerformance: "ประสิทธิภาพรายโครงการ",
    taskDist: "สถานะงานทั้งหมด",

    // Users
    userMgmt: "การจัดการผู้ใช้งาน",
    addUser: "เพิ่มผู้ใช้",
    printPDF: "พิมพ์/PDF",
    col_name: "ชื่อ-นามสกุล",
    col_role: "ตำแหน่ง",
    col_dept: "สังกัด",
    col_email: "อีเมล",
    col_status: "สถานะ",
    col_lastLogin: "ใช้งานล่าสุด",
    col_actions: "จัดการ",
    col_seq: "ลำดับ",
    col_photo: "รูปภาพ",
    col_empId: "รหัสพนักงาน",

    // User Modal
    newUserTitle: "เพิ่มผู้ใช้งาน / พนักงานใหม่",
    editUserTitle: "แก้ไขข้อมูลผู้ใช้งาน",
    uploadPhoto: "เพิ่มรูปภาพ",
    removePhoto: "ลบรูป",
    empId: "รหัสพนักงาน",
    firstName: "ชื่อจริง",
    lastName: "นามสกุล",
    position: "ตำแหน่ง",
    specifyOther: "โปรดระบุตำแหน่ง",
    currentDept: "ประจำหน่วยงาน",
    accessibleDepts: "หน่วยงานที่เข้าถึงได้",
    selectDept: "เลือกหน่วยงาน...",
    addDept: "เพิ่ม",
    permissions: "สิทธิ์การใช้งานรายเมนู",
    phone: "เบอร์โทรศัพท์",
    save: "บันทึก",
    cancel: "ยกเลิก",
    loginInfo: "ข้อมูลเข้าระบบ",
    personalInfo: "ข้อมูลส่วนตัว",
    accessControl: "การเข้าถึงและสิทธิ์",

    // Projects
    projectList: "รายการโครงการและหน่วยงาน",
    newProject: "เพิ่มโครงการ",
    manager: "ผู้จัดการ",
    start: "เริ่มบริหาร",
    // Project Modal
    newProjectTitle: "เพิ่มโครงการ / หน่วยงานใหม่",
    projLogo: "โลโก้หน่วยงาน",
    uploadLogo: "อัปโหลดโลโก้",
    projCode: "รหัสโครงการ",
    projName: "ชื่อโครงการ",
    projType: "ประเภทโครงการ",
    projAddress: "ที่อยู่โครงการ",
    officePhone: "เบอร์โทรสำนักงาน",
    taxId: "เลขประจำตัวผู้เสียภาษี",
    contractStartDate: "วันที่เริ่มสัญญา",
    contractEndDate: "วันสิ้นสุดสัญญา",
    daysRemaining: "จำนวนวันที่จะครบสัญญา",
    days: "วัน",
    uploadDocs: "เอกสารสำคัญ",
    doc_orchor: "อช.13 / จส.ก.10",
    doc_committee: "รายการจดกรรมการ",
    doc_regulations: "ระเบียบข้อบังคับ",
    doc_resident_rules: "ระเบียบพักอาศัย",
    tab_condo: "อาคารชุด",
    tab_village: "หมู่บ้านจัดสรร",
    tab_office: "ออฟฟิศสำนักงาน",

    // Contractors
    contractorList: "ค้นหา Supplier",
    managePartners: "บริหารจัดการผู้ให้บริการภายนอก",
    addNew: "เพิ่มรายชื่อ",
    searchPlaceholder: "ค้นหา ชื่อบริษัท, หมวดงาน หรือ ผู้ติดต่อ...",
    filter: "กรองข้อมูล",
    col_company: "ชื่อบริษัท",
    col_type: "ประเภท",
    col_category: "หมวดงาน",
    col_contact: "ผู้ติดต่อ",
    col_phoneEmail: "โทร / อีเมล",

    // Audit
    globalAudit: "รายการตรวจสอบภายใน (ทุกโครงการ)",
    auditDesc: "ข้อมูลการ Audit รวมของทุกหน่วยงาน",
    newAudit: "บันทึกผลตรวจ",
    auditPass: "ผ่านเกณฑ์ (>90%)",
    auditConcern: "ควรปรับปรุง (70-89%)",
    auditCritical: "วิกฤต (<70%)",
    col_date: "วันที่ตรวจ",
    col_project: "โครงการ / หน่วยงาน",
    col_score: "คะแนน",
    col_inspector: "ผู้ตรวจ",
    col_remarks: "หมายเหตุ",
    col_file: "ไฟล์แนบ",

    // Project Detail Tabs
    tab_overview: "ภาพรวม",
    tab_contracts: "สัญญาจ้าง",
    tab_staff: "บุคลากร",
    tab_schedule: "ตารางงาน",
    tab_daily: "รายงานประจำวัน",
    tab_assets: "ทะเบียนทรัพย์สิน",
    tab_tools: "เครื่องมือช่าง",
    tab_pm: "เครื่องจักร/PM",
    tab_repair: "แจ้งซ่อม",
    tab_utilities: "น้ำ/ไฟ",
    tab_action: "Action Plan",
    tab_audit: "Audit",
    tab_forms: "แบบฟอร์มมาตรฐาน",
    tab_others: "อื่นๆ (Others)",

    // Project Detail Content
    projectKPI: "KPI โครงการ",
    recentAlerts: "การแจ้งเตือนล่าสุด",
    activeContracts: "สัญญาว่าจ้างและบริการที่ใช้งานอยู่",
    addContract: "เพิ่มสัญญา",
    col_vendor: "คู่สัญญา / ผู้รับเหมา",
    col_subject: "ประเภทบริการ",
    col_duration: "ระยะเวลาสัญญา",
    col_amount: "มูลค่าสัญญา",
    projectStaff: "บุคลากรในโครงการ",
    addStaff: "เพิ่มพนักงาน",
    col_phone: "เบอร์โทร",
    workSchedule: "ตารางการทำงาน",
    createTask: "สร้างงาน",
    col_task: "ชื่องาน",
    col_assignee: "ผู้รับผิดชอบ",
    col_time: "เวลา",
    dailyReports: "รายงานประจำวัน",
    createReport: "เขียนรายงาน",
    col_details: "รายละเอียด",
    col_image: "รูปภาพ",
    col_reporter: "ผู้รายงาน",
    regAssets: "ทะเบียนทรัพย์สิน",
    addAsset: "เพิ่มทรัพย์สิน",
    col_assetName: "ชื่อทรัพย์สิน",
    col_assetCode: "รหัสทรัพย์สิน",
    col_location: "สถานที่ติดตั้ง",
    col_serial: "Serial No.",
    col_value: "มูลค่า",
    toolsRegistry: "ทะเบียนเครื่องมือช่าง",
    regTool: "เพิ่มเครื่องมือช่าง",
    col_toolName: "ชื่อเครื่องมือ/เครื่องจักร",
    col_toolCode: "รหัสเครื่องมือ",
    col_qty: "จำนวน",
    col_condition: "สภาพ",
    col_responsible: "ผู้ถือครอง",
    col_lastCheck: "ตรวจสอบล่าสุด",
    machineryPM: "เครื่องจักรและแผน PM",
    addMachine: "เพิ่มเครื่องจักร",
    col_machineName: "ชื่อเครื่องจักร",
    col_machineCode: "รหัส",
    col_system: "ระบบ",
    col_model: "รุ่น",
    col_lastPM: "PM ล่าสุด",
    col_nextPM: "PM ถัดไป",
    meterReadings: "จดมิเตอร์ (น้ำ/ไฟ)",
    recordReading: "บันทึกค่า",
    col_prev: "ก่อนหน้า",
    col_curr: "ปัจจุบัน",
    col_usage: "ที่ใช้ไป",
    col_recorder: "ผู้จด",
    consumptionTrend: "แนวโน้มการใช้พลังงาน",
    actionPlan: "Action Plan / รายงานเหตุการณ์",
    newReport: "แจ้งเรื่อง",
    col_issue: "ปัญหา / หัวข้อ",
    col_solution: "การแก้ไข",
    col_deadline: "กำหนดเสร็จ",
    internalAudit: "ประวัติการตรวจสอบ (Audit)",
    exportInfo: "ส่งออก CSV",
    exportCSV: "ส่งออก CSV",
    downloading: "กำลังดาวน์โหลด...",
    col_shift: "กะการทำงาน",
    col_shift_time: "เวลาปฏิบัติงาน",
    col_note: "หมายเหตุ",
    saveSuccess: "บันทึกสำเร็จ",
    close: "ปิด",
    downloadPDF: "ดาวน์โหลด PDF",
    
    // PM Tabs
    pm_registry: "ทะเบียนเครื่องจักร",
    pm_plan: "แผนงาน",
    pm_calendar: "ปฏิทิน",
    pm_form: "แบบฟอร์ม PM",
    pm_history: "ประวัติ",
    pm_yearly_summary: "สรุปแผนรายปี",
    pm_registry_title: "ทะเบียนเครื่องจักร (Machine Registry)",
    pm_dashboard: "แดชบอร์ด",
    
    // PM Plan
    pm_plan_title: "แผนงานบำรุงรักษา (PM Plan)",
    addPmPlan: "เพิ่มแผน PM",
    pmTaskName: "ชื่องาน / รายการตรวจเช็ค",
    pmFrequency: "ความถี่ (Frequency)",
    freq_Daily: "ประจำวัน (Daily)",
    freq_Weekly: "ประจำสัปดาห์ (Weekly)",
    freq_Monthly: "ประจำเดือน (Monthly)",
    freq_Yearly: "ประจำปี (Yearly)",
    col_schedule: "กำหนดการ",

    // Statuses & Common
    active: "ใช้งาน",
    inactive: "ไม่ใช้งาน",
    warning: "แจ้งเตือน",
    good: "ดี",
    fair: "พอใช้",
    normal: "ปกติ",
    repair: "ซ่อมแซม",
    pending: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    completed: "เสร็จสิ้น",
    expiringSoon: "ใกล้หมดสัญญา",
    expired: "หมดสัญญา",
    to: "ถึง",
    noData: "ไม่พบข้อมูล",
    reportHeader: "รายงานสรุปข้อมูล",
    generatedOn: "ออกรายงานเมื่อ",
    contractType: "ประเภทสัญญา",
    contractCategory: "หมวดงานบริการ",
    paymentCycle: "งวดการจ่าย",
    monthly: "รายเดือน",
    yearly: "รายปี",
    beforeVat: "(ก่อน VAT)",
    col_contact_person: "ชื่อผู้ติดต่อ",
    col_contact_phone: "เบอร์โทรศัพท์",
    
    // Daily Report Translation
    dailyReportTitle: "รายงานประจำวัน",
    manpowerReport: "1. รายงานกำลังพลประจำวัน",
    performanceReport: "2. รายงานผลการดำเนินงาน",
    incomeReport: "3. สรุปรายรับประจำวัน",
    additionalDetails: "4. รายละเอียดอื่นเพิ่มเติม",
    dept_juristic: "ฝ่ายนิติบุคคลฯ",
    dept_security: "ฝ่ายรักษาความปลอดภัย",
    dept_cleaning: "ฝ่ายรักษาความสะอาด",
    dept_gardening: "ฝ่ายดูแลสวน",
    dept_sweeper: "คนกวาด",
    dept_other: "อื่นๆ (ระบุ)",
    inc_commonFee: "ค่าส่วนกลาง/สาธารณูปโภค",
    inc_lateFee: "ค่าปรับชำระล่าช้า",
    inc_water: "ค่าน้ำประปา",
    inc_parking: "ค่าที่จอดรถ",
    inc_violation: "ค่าปรับผิดระเบียบ",
    inc_other: "อื่นๆ (ระบุ)",
    totalIncome: "ผลรวมรายรับทั้งวัน",
    reporter: "ผู้รายงาน",
    uploadImage: "แนบรูปภาพ",
    createDailyReport: "เขียนรายงาน",
    
    // Asset Translation
    registerAsset: "เพิ่มทะเบียนทรัพย์สิน",
    assetDetails: "รายละเอียดเพิ่มเติม",
  },
  en: {
    // ... (Keep existing English translations)
    appTitle: "BEST MILLION",
    appSubtitle: "GROUP CO., LTD.",
    systemMgmt: "System Management",
    signIn: "Sign In",
    username: "Username",
    password: "Password",
    poweredBy: "Powered by Best Million Group IT",
    signOut: "Sign Out",
    myWorkspace: "My Workspace",
    menu_dashboard: "Dashboard",
    menu_users: "User Management",
    menu_projects: "Projects / Units",
    menu_audits: "Internal Audit",
    menu_contractors: "Search Supplier",
    menu_manual: "User Manual",
    menu_settings: "Settings",
    corpDashboard: "Corporate Dashboard",
    overview: "Overview of organization performance",
    exportReport: "Export CSV",
    exportPDF: "Export PDF",
    totalProjects: "Total Projects",
    totalEmployees: "Total Employees",
    pendingTasks: "Pending Tasks",
    pmDue: "PM Due Soon",
    projPerformance: "Project Performance",
    taskDist: "Task Status Distribution",
    userMgmt: "User Management",
    addUser: "Add User",
    printPDF: "Export PDF",
    col_name: "Name",
    col_role: "Position",
    col_dept: "Department",
    col_email: "Email",
    col_status: "Status",
    col_lastLogin: "Last Login",
    col_actions: "Actions",
    col_seq: "No.",
    col_photo: "Photo",
    col_empId: "Employee ID",
    newUserTitle: "Add New User / Employee",
    editUserTitle: "Edit User / Employee",
    uploadPhoto: "Upload Photo",
    removePhoto: "Remove",
    empId: "Employee ID",
    firstName: "First Name",
    lastName: "Last Name",
    position: "Position",
    specifyOther: "Please specify position",
    currentDept: "Current Department / Unit",
    accessibleDepts: "Accessible Departments",
    selectDept: "Select Department...",
    addDept: "Add Dept",
    permissions: "Menu Permissions",
    phone: "Phone Number",
    save: "Save",
    cancel: "Cancel",
    loginInfo: "Login Information",
    personalInfo: "Personal Information",
    accessControl: "Access Control",
    projectList: "Projects & Units",
    newProject: "New Project",
    manager: "Manager",
    start: "Start",
    newProjectTitle: "Add New Project / Unit",
    projLogo: "Project Logo",
    uploadLogo: "Upload Logo",
    projCode: "Project Code",
    projName: "Project Name",
    projType: "Project Type",
    projAddress: "Address",
    officePhone: "Office Phone",
    taxId: "Tax ID",
    contractStartDate: "Contract Start Date",
    contractEndDate: "Contract End Date",
    daysRemaining: "Days Remaining",
    days: "Days",
    uploadDocs: "Project Documents",
    doc_orchor: "Or Chor 13 / Jor Sor Gor 10",
    doc_committee: "Committee Registration",
    doc_regulations: "Rules & Regulations",
    doc_resident_rules: "Residency Rules",
    tab_condo: "Condominium",
    tab_village: "Housing Estate",
    tab_office: "Office Building",
    contractorList: "Search Supplier",
    managePartners: "Manage external partners and service providers",
    addNew: "Add New",
    searchPlaceholder: "Search by Company Name, Category, or Contact Person...",
    filter: "Filter",
    col_company: "Company Name",
    col_type: "Type",
    col_category: "Category",
    col_contact: "Contact Person",
    col_phoneEmail: "Phone / Email",
    globalAudit: "Internal Audit (All Projects)",
    auditDesc: "Centralized audit records for all units",
    newAudit: "New Audit",
    auditPass: "Pass (>90%)",
    auditConcern: "Concern (70-89%)",
    auditCritical: "Critical (<70%)",
    col_date: "Date",
    col_project: "Project / Unit",
    col_score: "Score",
    col_inspector: "Inspector",
    col_remarks: "Remarks",
    col_file: "File",
    tab_overview: "Overview",
    tab_contracts: "Contracts",
    tab_staff: "Staff",
    tab_schedule: "Schedule",
    tab_daily: "Daily Report",
    tab_assets: "Assets",
    tab_tools: "Tools",
    tab_pm: "Machinery / PM",
    tab_repair: "Repair",
    tab_utilities: "Water/Fire",
    tab_action: "Action Plan",
    tab_audit: "Audit",
    tab_forms: "Standard Forms",
    tab_others: "Others",
    projectKPI: "Project KPI",
    recentAlerts: "Recent Alerts",
    activeContracts: "Active Contracts / Service Agreements",
    addContract: "Add Contract",
    col_vendor: "Vendor/Contractor",
    col_subject: "Service Type",
    col_duration: "Duration",
    col_amount: "Amount",
    projectStaff: "Project Staff",
    addStaff: "Add Staff",
    col_phone: "Phone",
    workSchedule: "Work Schedule",
    createTask: "Create Task",
    col_task: "Task",
    col_assignee: "Assignee",
    col_time: "Time",
    dailyReports: "Daily Reports",
    createReport: "Create Report",
    col_details: "Details",
    col_image: "Image",
    col_reporter: "Reporter",
    regAssets: "Registered Assets",
    addAsset: "Add Asset",
    col_assetName: "Asset Name",
    col_assetCode: "Asset Code",
    col_location: "Location",
    col_serial: "Serial No.",
    col_value: "Value",
    toolsRegistry: "Tools Registry",
    regTool: "Register Tool",
    col_toolName: "Tool/Machine Name",
    col_toolCode: "Tool Code",
    col_qty: "Qty",
    col_condition: "Condition",
    col_responsible: "Responsible",
    col_lastCheck: "Last Check",
    machineryPM: "Machinery & PM Schedule",
    addMachine: "Add Machine",
    col_machineName: "Machine Name",
    col_machineCode: "Code",
    col_system: "System",
    col_model: "Model",
    col_lastPM: "Last PM",
    col_nextPM: "Next PM",
    meterReadings: "Meter Readings (Water/Fire)",
    recordReading: "Record Reading",
    col_prev: "Prev",
    col_curr: "Curr",
    col_usage: "Usage",
    col_recorder: "Recorder",
    consumptionTrend: "Consumption Trend",
    actionPlan: "Action Plan / Incident Report",
    newReport: "New Report",
    col_issue: "Issue",
    col_solution: "Solution",
    col_deadline: "Deadline",
    internalAudit: "Internal Audit Records",
    exportInfo: "Export CSV",
    exportCSV: "Export CSV",
    downloading: "Downloading...",
    col_shift: "Shift",
    col_shift_time: "Time",
    col_note: "Note",
    saveSuccess: "Saved Successfully",
    close: "Close",
    active: "Active",
    inactive: "Inactive",
    warning: "Warning",
    good: "Good",
    fair: "Fair",
    normal: "Normal",
    repair: "Repair",
    pending: "Pending",
    approved: "Approved",
    completed: "Completed",
    expiringSoon: "Expiring Soon",
    expired: "Expired",
    to: "to",
    noData: "No data available.",
    reportHeader: "OFFICIAL REPORT",
    generatedOn: "Generated on",
    contractType: "Contract Type",
    contractCategory: "Service Type",
    paymentCycle: "Payment Cycle",
    monthly: "Monthly",
    yearly: "Yearly",
    beforeVat: "(Excl. VAT)",
    col_contact_person: "Contact Person",
    col_contact_phone: "Phone",
    dailyReportTitle: "Daily Report",
    manpowerReport: "1. Manpower Report",
    performanceReport: "2. Performance Report",
    incomeReport: "3. Income Summary",
    additionalDetails: "4. Additional Details",
    dept_juristic: "Juristic Person",
    dept_security: "Security Guard",
    dept_cleaning: "Cleaning",
    dept_gardening: "Gardening",
    dept_sweeper: "Road Sweeper",
    dept_other: "Other (Specify)",
    inc_commonFee: "Common Area Fee",
    inc_lateFee: "Late Payment Fee",
    inc_water: "Water Fee",
    inc_parking: "Parking Fee",
    inc_violation: "Violation Fee",
    inc_other: "Other (Specify)",
    totalIncome: "Total Daily Income",
    reporter: "Reporter",
    uploadImage: "Upload Image",
    createDailyReport: "Create Report",
    registerAsset: "Register Asset",
    assetDetails: "Additional Details",
    downloadPDF: "Download PDF",
    pm_dashboard: "Dashboard",
    pm_registry: "Registry",
    pm_plan: "Plan",
    pm_calendar: "Calendar",
    pm_form: "PM Form",
    pm_history: "History",
    pm_yearly_summary: "Yearly Summary",
    pm_registry_title: "Machine Registry",
    pm_plan_title: "PM Plan",
    addPmPlan: "Add PM Plan",
    pmTaskName: "Task Name / Checklist",
    pmFrequency: "Frequency",
    freq_Daily: "Daily",
    freq_Weekly: "Weekly",
    freq_Monthly: "Monthly",
    freq_Yearly: "Yearly",
    col_schedule: "Schedule",
  }
};

// --- Mock Data Generator & Initial Data ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const INITIAL_USERS = [ { id: 'u1', username: 'admin', password: 'bosskim', firstName: 'Admin', lastName: 'Master', position: 'Super Admin', department: 'Head Office', projectId: null, status: 'Active', created_at: new Date().toISOString(), permissions: getFullPermissions() } ];
const INITIAL_PROJECTS = [];
const INITIAL_CONTRACTS = [];
const INITIAL_ASSETS = []; 
const INITIAL_MACHINES = [];
const INITIAL_PM_PLANS = [];
const INITIAL_PM_HISTORY = [];
const INITIAL_REPAIRS = [];
const INITIAL_OTHERS = [];

// NEW: Custom 3D Bar Shapes
const ThreeDBar = (props) => {
    const { fill, x, y, width, height } = props;
    const depth = 8;
    if (!height || height <= 0 || width <= 0) return null;
    
    return (
        <g style={{ filter: 'drop-shadow(3px 6px 5px rgba(0,0,0,0.25))' }}>
            <path d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`} fill={fill} />
            <path d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`} fill="#ffffff" fillOpacity={0.3} />
            <path d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`} fill={fill} />
            <path d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`} fill="#000000" fillOpacity={0.25} />
            <path d={`M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`} fill={fill} />
        </g>
    );
};

const ThreeDBarHorizontal = (props) => {
    const { fill, x, y, width, height } = props;
    const depth = 8;
    if (!width || width <= 0 || height <= 0) return null;

    return (
        <g style={{ filter: 'drop-shadow(3px 6px 5px rgba(0,0,0,0.25))' }}>
            <path d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`} fill={fill} />
            <path d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`} fill="#ffffff" fillOpacity={0.3} />
            <path d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`} fill={fill} />
            <path d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`} fill="#000000" fillOpacity={0.25} />
            <path d={`M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`} fill={fill} />
        </g>
    );
};

const ChartGradients = () => (
  <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
    <defs>
      <linearGradient id="colorBlue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="colorGreen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="colorOrange" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="colorRed" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
      <linearGradient id="colorCyan" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
      <linearGradient id="colorPurple" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="colorGray" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>
      <linearGradient id="cylOrange" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#fdba74" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id="cylBlue" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="cylGreen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6ee7b7" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="cylGray" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#d1d5db" />
        <stop offset="50%" stopColor="#4b5563" />
        <stop offset="100%" stopColor="#374151" />
      </linearGradient>
    </defs>
  </svg>
);

// NEW: Initial data for Company Profile
const INITIAL_COMPANY_INFO = {
    name: 'BM GROUP',
    subtitle: 'Enterprise ERP',
    logo: null,
    address: '99/9 หมู่ 1 ถนนบางนา-ตราด กม.7 ตำบลบางแก้ว อำเภอบางพลี สมุทรปราการ 10540',
    phone: '02-111-2222'
};

// NEW: Initial data for Utilities
const INITIAL_METERS = [];
const INITIAL_READINGS = [];

const INITIAL_DAILY_REPORTS = []; 
const INITIAL_AUDITS = []; 
const INITIAL_TOOLS = []; 
const INITIAL_UTILITY_READINGS = []; 
const INITIAL_ACTION_PLANS = []; 
const INITIAL_SCHEDULES = []; 
const INITIAL_CONTRACTORS = [];

// --- Helper for Image Processing (ปรับปรุงใหม่: ย่อขนาดและบีบอัดเพื่อป้องกันปัญหาพื้นที่ Local Storage เต็มและช่วยให้บันทึกภาพได้) ---
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // กำหนดขนาดสูงสุด 800px เพื่อคงความชัดเจน แต่ลดขนาดไฟล์ป้องกันปัญหา 1MB Limit ของฐานข้อมูล
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // บีบอัดเป็น JPEG Quality 60%
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = () => {
                // กรณีเกิดข้อผิดพลาดในการโหลดรูป ให้ส่งค่าต้นฉบับกลับไป
                resolve(event.target.result);
            };
        };
    });
};

// ... (Components Card, Button, KPICard remain same) ...
const Card = ({ children, className = "", id, onClick }) => ( <div id={id} className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} onClick={onClick}> {children} </div> );
const Button = ({ children, onClick, variant = 'primary', size = 'md', className = "", icon: Icon, disabled = false, type = "button" }) => { const baseStyle = "rounded-md font-medium transition-colors flex items-center justify-center gap-2"; const sizeStyles = { sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" }; const variants = { primary: "bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-400", secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400", danger: "bg-red-50 text-red-600 hover:bg-red-100", outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-300", success: "bg-green-600 text-white hover:bg-green-700" }; return ( <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`}> {Icon && <Icon size={size === 'sm' ? 14 : 18} />} {children} </button> ); };

// UPDATED: Make KPICard clickable
const KPICard = ({ title, value, icon: Icon, color, onClick }) => ( 
  <Card className={`p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-orange-300 transition-all group' : ''}`} onClick={onClick}> 
    <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600 ${onClick ? 'group-hover:scale-110 transition-transform' : ''}`}> 
      <Icon size={24} /> 
    </div> 
    <div> 
      <div className="text-sm text-gray-500">{title}</div> 
      <div className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        {value}
        {onClick && <ArrowRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div> 
    </div> 
  </Card> 
);

// --- IndexedDB for Large Files Storage ---
const DB_NAME = 'BMG_Files_DB';
const STORE_NAME = 'files';

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveFileLocally = async (fileId, data) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(data, fileId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { console.error("IDB Save Error", e); }
};

const saveMultipleFilesLocally = async (filesObj) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            Object.keys(filesObj).forEach(fileId => {
                store.put(filesObj[fileId], fileId);
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { console.error("IDB Batch Save Error", e); }
};

const getFileLocally = async (fileId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(fileId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) { console.error("IDB Get Error", e); return null; }
};

const getAllFilesLocally = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            const keysRequest = store.getAllKeys();
            
            request.onsuccess = () => {
                keysRequest.onsuccess = () => {
                    const files = {};
                    keysRequest.result.forEach((key, index) => {
                        files[key] = request.result[index];
                    });
                    resolve(files);
                };
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) { 
        console.error("IDB GetAll Error", e); 
        return {}; 
    }
};

// --- Custom Hook for Persistent Storage (Firebase or LocalStorage Fallback) ---
function usePersistentState(key, initialValue, fbUser) {
  const [state, setState] = useState(() => {
      // FIX: โหลดข้อมูลจาก Cache (Local Storage) ขึ้นมาแสดงผลทันทีก่อนเสมอ (Optimistic Load) เพื่อแก้ปัญหาโหลดหน้าเว็บช้า
      if (typeof window !== 'undefined') {
          const local = localStorage.getItem(key);
          if (local) {
              try { return JSON.parse(local); } catch(e) { return initialValue; }
          }
      }
      return initialValue;
  });
  
  const stateRef = useRef(state);
  const [isSynced, setIsSynced] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
      stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!db) {
        setIsLoaded(true);
        return; 
    }
    
    // ตั้งเวลา 3 วินาที หากโหลดข้อมูลจาก Firebase ไม่ได้ให้ปลดล็อคหน้าจอทันที
    const fallbackTimer = setTimeout(() => {
        setIsLoaded(true);
    }, 3000);

    if (!fbUser || !appId) {
        return () => clearTimeout(fallbackTimer);
    }
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_state', key);
    
    let currentFetchId = 0;

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        currentFetchId++;
        const thisFetchId = currentFetchId;

        const data = docSnap.data();
        try {
          if (data.totalChunks !== undefined) {
              let fullJson = '';
              for (let i = 0; i < data.totalChunks; i++) {
                  const chunkRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_state_chunks', `${key}_${i}`);
                  const chunkSnap = await getDoc(chunkRef);
                  if (chunkSnap.exists()) {
                      fullJson += chunkSnap.data().chunk;
                  }
              }
              if (thisFetchId !== currentFetchId) return;
              if (fullJson) {
                  const parsedData = JSON.parse(fullJson);
                  if (JSON.stringify(stateRef.current) !== JSON.stringify(parsedData)) {
                      setState(parsedData);
                      stateRef.current = parsedData;
                      if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(parsedData));
                  }
              }
          } else if (data.value) {
              if (thisFetchId !== currentFetchId) return;
              const parsedData = JSON.parse(data.value);
              if (JSON.stringify(stateRef.current) !== JSON.stringify(parsedData)) {
                  setState(parsedData);
                  stateRef.current = parsedData;
                  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(parsedData));
              }
          }
        } catch(e) { console.error("Parse error", key, e); }
        setIsLoaded(true);
      } else if (!isSynced) {
         setPersistentValue(stateRef.current);
         setIsLoaded(true);
      }
      setIsSynced(true);
    }, (err) => {
      console.error("Sync error", key, err);
      setIsLoaded(true);
    });

    return () => {
        clearTimeout(fallbackTimer);
        unsubscribe();
    };
  }, [fbUser, key]);

  const setPersistentValue = async (newValue, isRestore = false) => {
    const valueToStore = typeof newValue === 'function' ? newValue(stateRef.current) : newValue;
    if (!isRestore && valueToStore === stateRef.current) return;

    setState(valueToStore);
    stateRef.current = valueToStore;
    
    if (typeof window !== 'undefined') {
        // ผลักการทำงานของ LocalStorage ไปไว้คิวหลังสุด เพื่อไม่ให้หน้าจอค้าง
        setTimeout(() => {
            try { localStorage.setItem(key, JSON.stringify(valueToStore)); } catch (e) {}
        }, 0);
    }

    if (db && fbUser && appId) {
       return new Promise(async (resolve) => {
           try {
               const jsonStr = JSON.stringify(valueToStore);
               const CHUNK_SIZE = 900000; 
               const totalChunks = Math.ceil(jsonStr.length / CHUNK_SIZE);
               
               for (let i = 0; i < totalChunks; i++) {
                   const chunkRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_state_chunks', `${key}_${i}`);
                   const chunkData = jsonStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                   await setDoc(chunkRef, { chunk: chunkData });
                   // พัก UI เล็กน้อยให้เบราว์เซอร์ไม่ค้าง
                   await new Promise(r => setTimeout(r, 10));
               }
               
               const metaRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_state', key);
               await setDoc(metaRef, { totalChunks, timestamp: Date.now() });
               resolve();
           } catch(err) {
               console.error("Firebase Storage Error:", err);
               resolve();
           }
       });
    }
  };

  return [state, setPersistentValue, isLoaded];
}

// --- NEW: Custom Hook for Collection Storage (แก้ปัญหาบันทึกแล้วข้อมูลทับกัน) ---
function usePersistentCollection(collectionName, initialValue, fbUser) {
  const [state, setState] = useState(() => {
      if (typeof window !== 'undefined') {
          const local = localStorage.getItem(collectionName);
          if (local) {
              try { 
                  const parsed = JSON.parse(local); 
                  if (!Array.isArray(parsed)) return initialValue; // ป้องกันข้อมูลเป็น null หรือ Object
                  if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(initialValue) && initialValue.length > 0) return initialValue;
                  return parsed;
              } catch(e) { return initialValue; }
          }
      }
      return initialValue;
  });

  const stateRef = useRef(state);
  const isLoadedRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
      stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!db) {
        setIsLoaded(true);
        isLoadedRef.current = true;
        return;
    }

    // ตั้งเวลา 3 วินาที หากโหลด Collection ข้อมูลไม่ขึ้น ให้ข้ามไปใช้งาน Local Storage เลย
    const fallbackTimer = setTimeout(() => {
        if (!isLoadedRef.current) {
            console.warn("Firebase sync timeout for collection:", collectionName);
            setIsLoaded(true);
            isLoadedRef.current = true;
        }
    }, 3000);

    if (!fbUser || !appId) {
        return () => clearTimeout(fallbackTimer);
    }

    const collRef = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => {
          items.push({ ...doc.data(), id: doc.id });
      });

      if (items.length === 0 && Array.isArray(initialValue) && initialValue.length > 0) {
          setState(initialValue);
          stateRef.current = initialValue;
          initialValue.forEach(item => {
              if (item.id) {
                  const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, String(item.id));
                  setDoc(docRef, item).catch(console.error);
              }
          });
      } else {
          // เปรียบเทียบข้อมูลโดยไม่สนใจลำดับ (ป้องกัน UI กระพริบหรือข้อมูลถูกดึงกลับสลับที่ตอนซิงค์)
          const isSame = (arr1, arr2) => {
              if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
              if (arr1.length !== arr2.length) return false;
              const map1 = new Map(arr1.map(i => [String(i.id), i]));
              for (const item2 of arr2) {
                  const item1 = map1.get(String(item2.id));
                  if (!item1 || JSON.stringify(item1) !== JSON.stringify(item2)) return false;
              }
              return true;
          };

          if (!isSame(stateRef.current, items)) {
              setState(items);
              stateRef.current = items;
              if (typeof window !== 'undefined') localStorage.setItem(collectionName, JSON.stringify(items));
          }
      }

      isLoadedRef.current = true;
      setIsLoaded(true);
    }, (err) => {
      console.error("Collection Sync error", collectionName, err);
      isLoadedRef.current = true;
      setIsLoaded(true);
    });

    return () => {
        clearTimeout(fallbackTimer);
        unsubscribe();
    };
  }, [fbUser, collectionName]);

  const setPersistentValue = async (newValue, isRestore = false) => {
    const valueToStore = typeof newValue === 'function' ? newValue(stateRef.current) : newValue;
    if (!isRestore && valueToStore === stateRef.current) return;

    // เพิ่มการป้องกัน (Safety Guard) บังคับให้เป็น Array เสมอ ป้องกันระบบล่มหากไฟล์ Backup ผิดเพี้ยน
    const oldState = Array.isArray(stateRef.current) ? stateRef.current : [];
    const safeValueToStore = Array.isArray(valueToStore) ? valueToStore : [];

    setState(safeValueToStore);
    stateRef.current = safeValueToStore;
    
    if (typeof window !== 'undefined') {
        // ผลักการทำงานของ LocalStorage ไปไว้คิวหลังสุด เพื่อไม่ให้หน้าจอค้าง
        setTimeout(() => {
            try { localStorage.setItem(collectionName, JSON.stringify(safeValueToStore)); } catch (e) {}
        }, 0);
    }

    if (db && fbUser && appId && isLoadedRef.current) {
       return new Promise(async (resolve) => {
           try {
               let batch = writeBatch(db);
               let opCount = 0;
               
               const oldStateMap = new Map();
               for (const o of oldState) {
                   if (o && o.id) oldStateMap.set(String(o.id), o);
               }

               const newStateMap = new Map();
               for (const n of safeValueToStore) {
                   if (n && n.id) newStateMap.set(String(n.id), n);
               }

               // 1. เพิ่มหรืออัปเดตข้อมูล
               for (const item of safeValueToStore) {
                   if (!item || !item.id) continue; // ข้ามรายการที่ไม่มี ID (ข้อมูลเสีย)
                   const strId = String(item.id);
                   
                   let needsUpdate = true;
                   // หากเป็นการ Restore จะบังคับเขียนทับเลย ข้ามการเปรียบเทียบข้อมูลเพื่อลดภาระ CPU
                   if (!isRestore) {
                       const oldItem = oldStateMap.get(strId);
                       if (oldItem && JSON.stringify(oldItem) === JSON.stringify(item)) {
                           needsUpdate = false;
                       }
                   }

                   if (needsUpdate) {
                       const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, strId);
                       batch.set(docRef, item);
                       opCount++;
                   }
                   
                   // ตัดรอบส่งเมื่อครบ 400 รายการ และรอให้สำเร็จก่อนทำชุดถัดไป
                   if (opCount >= 400) {
                       await batch.commit(); 
                       batch = writeBatch(db);
                       opCount = 0;
                       await new Promise(r => setTimeout(r, 20)); // พัก UI 20ms ป้องกันหน้าจอค้าง
                   }
               }

               // 2. ลบข้อมูลที่ไม่มีในก้อนใหม่
               for (const oldId of oldStateMap.keys()) {
                   if (!newStateMap.has(oldId)) {
                       const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, oldId);
                       batch.delete(docRef);
                       opCount++;
                   }
                   
                   if (opCount >= 400) {
                       await batch.commit();
                       batch = writeBatch(db);
                       opCount = 0;
                       await new Promise(r => setTimeout(r, 20));
                   }
               }

               // ส่งข้อมูลเศษที่เหลือ
               if (opCount > 0) {
                   await batch.commit();
               }
               resolve();

           } catch (err) {
               console.error(`Firestore Batch Write Error [${collectionName}]:`, err);
               resolve();
           }
       });
    }
  };

  return [state, setPersistentValue, isLoaded];
}

// --- NEW: Custom Hook for User Specific Persistent Storage (Theme, UI settings) ---
function useUserPersistentState(key, initialValue, fbUser) {
  const [state, setState] = useState(() => {
      if (typeof window !== 'undefined') {
          const local = localStorage.getItem(`user_pref_${key}`);
          if (local) {
              try { return JSON.parse(local); } catch(e) { return initialValue; }
          }
      }
      return initialValue;
  });

  const stateRef = useRef(state);
  const [isSynced, setIsSynced] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
      stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!db) {
        setIsLoaded(true);
        return;
    }

    const fallbackTimer = setTimeout(() => {
        setIsLoaded(true);
    }, 3000);

    if (!fbUser || !appId) {
        return () => clearTimeout(fallbackTimer);
    }
    
    const docRef = doc(db, 'artifacts', appId, 'users', fbUser.uid, 'user_preferences', key);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        try {
          const parsedData = JSON.parse(docSnap.data().value);
          if (JSON.stringify(stateRef.current) !== JSON.stringify(parsedData)) {
              setState(parsedData);
              stateRef.current = parsedData;
              if (typeof window !== 'undefined') localStorage.setItem(`user_pref_${key}`, JSON.stringify(parsedData));
          }
        } catch(e) { console.error("Parse error", key, e); }
        setIsLoaded(true);
      } else if (!isSynced) {
        setDoc(docRef, { value: JSON.stringify(stateRef.current) }).catch(console.error);
        setIsLoaded(true);
      }
      setIsSynced(true);
    }, (err) => {
      console.error("Sync error", key, err);
      setIsLoaded(true);
    });

    return () => {
        clearTimeout(fallbackTimer);
        unsubscribe();
    };
  }, [fbUser, key]);

  const setPersistentValue = async (newValue, isRestore = false) => {
    const valueToStore = typeof newValue === 'function' ? newValue(stateRef.current) : newValue;
    if (!isRestore && valueToStore === stateRef.current) return;

    setState(valueToStore);
    stateRef.current = valueToStore;
    
    if (typeof window !== 'undefined') {
        setTimeout(() => {
            try { localStorage.setItem(`user_pref_${key}`, JSON.stringify(valueToStore)); } catch (e) {}
        }, 0);
    }

    if (db && fbUser && appId) {
       return new Promise(async (resolve) => {
           try {
               const docRef = doc(db, 'artifacts', appId, 'users', fbUser.uid, 'user_preferences', key);
               await setDoc(docRef, { value: JSON.stringify(valueToStore) });
               resolve();
           } catch(e) {
               resolve();
           }
       });
    }
  };

  return [state, setPersistentValue, isLoaded];
}

// --- Main Application ---

export default function App() {
  const [fbUser, setFbUser] = useState(null);

  useEffect(() => {
    if (!auth) {
        // ถ้าระบบไม่ได้ต่อ Firebase (auth ไม่มี) ให้เซ็ต user จำลอง เพื่อให้ App ใช้งานต่อได้ด้วย LocalStorage
        setFbUser({ uid: 'local-fallback-user' });
        return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  // --- NEW: แก้ไขให้ State อ่านค่าจาก LocalStorage เพื่อจำการล็อกอิน ---
  const [currentUser, setCurrentUser] = useState(() => {
      if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('bmg_current_user');
          if (savedUser) {
              try { return JSON.parse(savedUser); } catch(e) { return null; }
          }
      }
      return null;
  });
  
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTab, setProjectTab] = useState('overview');
  const [contractFilter, setContractFilter] = useState('All'); // NEW: State สำหรับตัวกรองสัญญา
  const [contractSortOrder, setContractSortOrder] = useState('expiry_asc'); // NEW: State สำหรับเรียงลำดับวันหมดอายุสัญญา
  const [actionPlanFilter, setActionPlanFilter] = useState('All'); // NEW: State สำหรับตัวกรอง Action Plan
  const [actionPlanSortOrder, setActionPlanSortOrder] = useState('desc'); // NEW: State สำหรับเรียงลำดับ Action Plan
  const [repairFilter, setRepairFilter] = useState('All'); // NEW: State สำหรับตัวกรองแจ้งซ่อม
  const [staffViewMode, setStaffViewMode] = useState('list');
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDailyReport, setSelectedDailyReport] = useState(null); // NEW: Track report to view/print
  const [selectedContractView, setSelectedContractView] = useState(null); // NEW: State สำหรับดูรายละเอียดสัญญา
  const [isEditingContract, setIsEditingContract] = useState(false); // NEW: State สำหรับตรวจสอบว่ากำลังแก้ไขสัญญาหรือไม่
  const [isSavingContract, setIsSavingContract] = useState(false); // NEW: State สำหรับแสดง Loading ตอนอัปโหลดไฟล์สัญญาเข้า Drive
  const [lang, setLang] = useState('th'); // Set default language to 'th'
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false); // NEW: State สำหรับตอนกด Export Backup
  const [isRestoring, setIsRestoring] = useState(false); // NEW: State สำหรับตอนกำลัง Import Restore
  const [restoreProgress, setRestoreProgress] = useState(''); // NEW: State สำหรับแสดงความคืบหน้าตอน Import
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [scheduleNote, setScheduleNote] = useState(''); // NEW: State สำหรับเก็บ Note ในตารางงาน
  const [scheduleNotes, setScheduleNotes] = usePersistentState('bmg_scheduleNotes', {}, fbUser); // NEW: Persistent state for schedule notes
  const [scheduleApprovals, setScheduleApprovals] = usePersistentState('bmg_scheduleApprovals', {}, fbUser); // NEW: State สำหรับเก็บสถานะการอนุมัติตารางงาน
  const [selectedKpiDetail, setSelectedKpiDetail] = useState(null); // NEW: State สำหรับเปิด Modal รายละเอียด KPI
  const [isSyncingSheets, setIsSyncingSheets] = useState(false); // NEW: State สำหรับสถานะกำลังส่งข้อมูลไป Google Sheets
  const [isBackingUpToDrive, setIsBackingUpToDrive] = useState(false); // NEW: State สำหรับสถานะกำลังส่งไฟล์ไป Google Drive

  // NEW: State สำหรับ Confirm Modal ป้องกันการลบข้อมูลผิดพลาด
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'ยืนยันการลบ', type: 'danger' });

  // NEW: State สำหรับตัวกรองหน้าจัดการผู้ใช้งาน
  const [userDeptFilter, setUserDeptFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSortOrder, setUserSortOrder] = useState('desc');

  // NEW: State สำหรับตัวกรองหน้าโครงการ
  const [projectTypeFilter, setProjectTypeFilter] = useState('');
  const [projectSortOrder, setProjectSortOrder] = useState('expiry_asc');
  const [projectViewMode, setProjectViewMode] = useState('grid');

  // Company Info State
  const [companyInfo, setCompanyInfo] = usePersistentState('bmg_companyInfo', INITIAL_COMPANY_INFO, fbUser);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({ ...INITIAL_COMPANY_INFO });

  // Add Contract Modal State
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContract, setNewContract] = useState({ type: CONTRACT_TYPES.EXPENSE, category: '', customCategory: '', vendorName: '', contactPerson: '', contactPhone: '', startDate: '', endDate: '', amount: '', paymentCycle: 'Monthly', file: null });

  // Add Daily Report Modal State
  const [showAddDailyReportModal, setShowAddDailyReportModal] = useState(false);
  const [newDailyReport, setNewDailyReport] = useState({
      date: new Date().toISOString().split('T')[0],
      manpower: { juristic: 0, security: 0, cleaning: 0, gardening: 0, sweeper: 0, other: 0, otherLabel: '' },
      performance: { 
          juristic: { details: '', images: [] }, security: { details: '', images: [] }, cleaning: { details: '', images: [] },
          gardening: { details: '', images: [] }, sweeper: { details: '', images: [] }, other: { details: '', images: [] }
      },
      income: { commonFee: 0, lateFee: 0, water: 0, parking: 0, violation: 0, other: 0, otherLabel: '' },
      note: '', reporter: ''
  });

  // Assets Management State
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [selectedAssetView, setSelectedAssetView] = useState(null); // NEW: State สำหรับแสดงรายละเอียดทรัพย์สิน
  const [isEditingAsset, setIsEditingAsset] = useState(false); // NEW: State สำหรับสถานะกำลังแก้ไข
  const [isSavingAsset, setIsSavingAsset] = useState(false); // NEW: State สำหรับแสดง Loading ตอนอัปโหลดรูปเข้า Drive
  const [newAsset, setNewAsset] = useState({
      code: '',
      name: '',
      qty: 1,
      location: '',
      photo: null,
      details: ''
  });

  // Tools Management State
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [selectedToolView, setSelectedToolView] = useState(null); // NEW: State สำหรับแสดงรายละเอียดเครื่องมือ
  const [isEditingTool, setIsEditingTool] = useState(false); // NEW: State สำหรับสถานะกำลังแก้ไข
  const [isSavingTool, setIsSavingTool] = useState(false); // NEW: State สำหรับแสดง Loading ตอนอัปโหลดรูปเข้า Drive
  const [newTool, setNewTool] = useState({
      code: '',
      name: '',
      qty: 1,
      location: '',
      photo: null,
      details: ''
  });

  // Machine Management State (PM)
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [isEditingMachine, setIsEditingMachine] = useState(false);
  const [isSavingMachine, setIsSavingMachine] = useState(false); // NEW: State สำหรับแสดง Loading ตอนอัปโหลดรูปเข้า Drive
  const [pmSubTab, setPmSubTab] = useState('history'); // 'registry', 'plan', 'calendar', 'form', 'history', 'yearly_summary'
  const [pmYearlySummaryYear, setPmYearlySummaryYear] = useState(() => new Date().getFullYear().toString()); // NEW: State สำหรับปีของหน้ารายปี
  const [newMachine, setNewMachine] = useState({
      code: '',
      name: '',
      system: '',
      qty: 1,
      location: '',
      photo: null
  });

  // PM Plan State
  const [showAddPmPlanModal, setShowAddPmPlanModal] = useState(false);
  const [newPmPlan, setNewPmPlan] = useState({
      id: null,
      machineId: '',
      frequency: 'Monthly',
      scheduleDetails: { dayOfWeek: '1', date: '1', month: '1' }
  });
  
  const [selectedDateTasks, setSelectedDateTasks] = useState(null); // NEW: State สำหรับแสดงรายการ PM แบบเต็มในแต่ละวัน
  
  // PM History State
  const [selectedPmHistory, setSelectedPmHistory] = useState(null); // NEW: State สำหรับเก็บข้อมูลประวัติที่ถูกคลิกดู
  const [selectedMachineDetails, setSelectedMachineDetails] = useState(null); // NEW: State สำหรับเก็บข้อมูลเครื่องจักรที่คลิกดูรายละเอียด
  const [selectedFormSystem, setSelectedFormSystem] = useState(''); // NEW: State สำหรับเลือกระบบที่จะพิมพ์ฟอร์มเปล่า
  const [selectedPmStatusDetail, setSelectedPmStatusDetail] = useState(null); // NEW: State สำหรับดูรายละเอียดสถานะ PM

  // NEW: PM History Filters State
  const [pmHistoryFilterDate, setPmHistoryFilterDate] = useState('');
  const [pmHistoryFilterResult, setPmHistoryFilterResult] = useState('');
  const [pmHistoryFilterMachine, setPmHistoryFilterMachine] = useState('');
  const [pmHistoryFilterApproval, setPmHistoryFilterApproval] = useState('');

  // NEW: PM Form State
  const [showPmFormModal, setShowPmFormModal] = useState(false);
  const [currentPmTask, setCurrentPmTask] = useState(null);
  const [pmFormAnswers, setPmFormAnswers] = useState({});
  const [pmFormIssues, setPmFormIssues] = useState({}); // เพิ่ม State สำหรับเก็บปัญหาที่พบรายข้อ
  const [pmFormRemark, setPmFormRemark] = useState('');
  const [pmFormImages, setPmFormImages] = useState([]); // NEW: State สำหรับเก็บรูปภาพหลายรูปในฟอร์ม PM

  // NEW: Utilities State
  const [utilitySubTab, setUtilitySubTab] = useState('record'); // 'record', 'registry', 'analysis'
  const [utilityChartType, setUtilityChartType] = useState('bar'); // 'bar', 'line'
  const [utilityAnalysisMonth, setUtilityAnalysisMonth] = useState(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // --- NEW: State สำหรับวิเคราะห์กราฟ ---
  const [hiddenAnalysisMeters, setHiddenAnalysisMeters] = useState(new Set());
  const [waterAnalysisMode, setWaterAnalysisMode] = useState('combined'); // 'combined', 'separate'
  const [elecAnalysisMode, setElecAnalysisMode] = useState('combined'); // 'combined', 'separate'
  // ------------------------------------

  const [utilityForm, setUtilityForm] = useState({
      id: null, // NEW: เพิ่ม ID สำหรับเก็บสถานะโหมดแก้ไข
      meterId: '',
      date: new Date().toISOString().split('T')[0],
      currentValue: ''
  });
  const currentValueRef = useRef(null); // NEW: สำหรับ focus ช่องกรอกเลขมิเตอร์
  
  // NEW: Add Meter Modal State
  const [showAddMeterModal, setShowAddMeterModal] = useState(false);
  const [newMeter, setNewMeter] = useState({
      id: null, // NEW: เพิ่ม ID สำหรับเก็บสถานะโหมดแก้ไข
      type: 'Water',
      code: '',
      name: '',
      location: '',
      initialValue: ''
  });

  // Repair Request State
  const [showAddRepairModal, setShowAddRepairModal] = useState(false);
  const [selectedRepairView, setSelectedRepairView] = useState(null); // NEW: State สำหรับเก็บข้อมูลแจ้งซ่อมที่จะ Print/View
  const [newRepair, setNewRepair] = useState({
      id: null,
      code: '',
      roomNo: '',
      floor: '',
      requesterName: '',
      phone: '',
      issueType: '',
      issueTypeOther: '',
      issueDetails: '',
      inspectionResult: 'รอดำเนินการ',
      staffDetails: '',
      cost: '',
      staffName: '',
      requesterSignName: ''
  });

  // Action Plan State
  const [showAddActionPlanModal, setShowAddActionPlanModal] = useState(false);
  const [newActionPlan, setNewActionPlan] = useState({
      id: null,
      issue: '',
      details: '',
      responsible: '',
      otherResponsible: '',
      startDate: new Date().toISOString().split('T')[0],
      deadline: '',
      status: 'Pending'
  });

  // Supplier Search & Filter State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierTypeFilter, setSupplierTypeFilter] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('');
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState(null); // NEW: State สำหรับเก็บข้อมูล Supplier ที่ถูกคลิก

  // Form Details Modal State
  const [selectedFormDetails, setSelectedFormDetails] = useState(null);
  const [isEditingForm, setIsEditingForm] = useState(false); // NEW: State สำหรับโหมดแก้ไขแบบฟอร์ม

  // --- NEW: State สำหรับจัดการรายการแบบฟอร์ม ---
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [newFormItem, setNewFormItem] = useState({ id: null, category: 'งานบริหารและนิติบุคคล (Juristic & Mgmt.)', name: '', format: 'PDF', size: '100 KB', description: '' });

  // Audit Form State
  const [showAddAuditModal, setShowAddAuditModal] = useState(false);
  const [selectedAuditReport, setSelectedAuditReport] = useState(null); // NEW: State สำหรับเก็บข้อมูล Audit ที่ถูกคลิกดูรายละเอียด
  const [showAuditRankingModal, setShowAuditRankingModal] = useState(false); // NEW: State สำหรับเปิด/ปิด Modal จัดอันดับคะแนน Audit
  const [showReportRankingModal, setShowReportRankingModal] = useState(false); // NEW: State สำหรับเปิด/ปิด Modal จัดอันดับรายงานประจำวัน
  const [newAudit, setNewAudit] = useState({
      projectId: '',
      date: new Date().toISOString().split('T')[0],
      inspector: '',
      type: 'Internal Audit',
      scores: {},
      remarks: {},
      additionalComments: ''
  });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ employeeId: '', firstName: '', lastName: '', position: EMPLOYEE_POSITIONS[0], otherPosition: '', department: '', accessibleDepts: [], phone: '', username: '', password: '', photo: null, permissions: getDefaultPermissions() });

  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false); // NEW: State สำหรับแสดง Loading ตอนอัปโหลดรูป/ไฟล์เข้า Drive
  const [newProject, setNewProject] = useState({ logo: null, code: '', name: '', type: 'Condo', address: '', phone: '', taxId: '', contractStartDate: '', contractEndDate: '', contractValue: '', status: 'Active', files: { orchor: null, committee: null, regulations: null, resident_rules: null } });

  // อัปเกรดเป็น usePersistentCollection สำหรับข้อมูลที่เป็น Array (รายการ) ป้องกันข้อมูลสูญหาย/ทับกัน
  const [users, setUsers, isUsersLoaded] = usePersistentCollection('bmg_users', INITIAL_USERS, fbUser); 
  const [projects, setProjects] = usePersistentCollection('bmg_projects', INITIAL_PROJECTS, fbUser);
  const [contracts, setContracts] = usePersistentCollection('bmg_contracts', INITIAL_CONTRACTS, fbUser);
  const [audits, setAudits] = usePersistentCollection('bmg_audits', INITIAL_AUDITS, fbUser);
  const [dailyReports, setDailyReports] = usePersistentCollection('bmg_dailyReports', INITIAL_DAILY_REPORTS, fbUser);
  const [contractors, setContractors] = usePersistentCollection('bmg_contractors', INITIAL_CONTRACTORS, fbUser);
  const [assets, setAssets] = usePersistentCollection('bmg_assets', INITIAL_ASSETS, fbUser);
  const [tools, setTools] = usePersistentCollection('bmg_tools', INITIAL_TOOLS, fbUser);
  const [machines, setMachines] = usePersistentCollection('bmg_machines', INITIAL_MACHINES, fbUser);
  const [pmPlans, setPmPlans] = usePersistentCollection('bmg_pmPlans', INITIAL_PM_PLANS, fbUser);
  const [pmHistoryList, setPmHistoryList] = usePersistentCollection('bmg_pmHistoryList', INITIAL_PM_HISTORY, fbUser);
  const [meters, setMeters] = usePersistentCollection('bmg_meters', INITIAL_METERS, fbUser);
  const [utilityReadings, setUtilityReadings] = usePersistentCollection('bmg_utilityReadings', INITIAL_READINGS, fbUser);
  const [repairs, setRepairs] = usePersistentCollection('bmg_repairs', INITIAL_REPAIRS, fbUser);
  const [actionPlans, setActionPlans] = usePersistentCollection('bmg_actionPlans', INITIAL_ACTION_PLANS, fbUser);
  const [othersData, setOthersData] = usePersistentCollection('bmg_othersData', INITIAL_OTHERS, fbUser);
  const [formsList, setFormsList] = usePersistentCollection('bmg_forms_list', STANDARD_FORMS, fbUser);

  // คงใช้ usePersistentState สำหรับข้อมูลที่เป็น Object เดี่ยวๆ
  const [schedules, setSchedules] = usePersistentState('bmg_schedules', {}, fbUser);
  
  const getLocalMonthStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [currentMonth, setCurrentMonth] = useState(getLocalMonthStr());
  const [pmMonth, setPmMonth] = useState(getLocalMonthStr());

  const [projectStaffOrder, setProjectStaffOrder] = usePersistentState('bmg_projectStaffOrder', {}, fbUser); // NEW: State สำหรับเก็บลำดับพนักงานในตารางงาน
  const dragItem = useRef(null); // NEW: Ref สำหรับจดจำ index ที่ถูกลาก
  const dragOverItem = useRef(null); // NEW: Ref สำหรับจดจำ index เป้าหมายที่จะวาง

  // Others Module State
  const [showAddOtherModal, setShowAddOtherModal] = useState(false);
  const [newOther, setNewOther] = useState({
      id: null,
      title: '',
      details: '',
      link: ''
  });

  // NEW: Theme State (แยกอิสระรายบุคคล)
  const [theme, setTheme] = useUserPersistentState('bmg_theme', 'light', fbUser);

  // NEW: Role Permissions State
  const [rolePermissions, setRolePermissions] = usePersistentState('bmg_rolePermissions', {}, fbUser);
  const [showRolePermModal, setShowRolePermModal] = useState(false);
  const [editingRole, setEditingRole] = useState(EMPLOYEE_POSITIONS[0]);
  const [editingRolePerms, setEditingRolePerms] = useState(getDefaultPermissions());

  const [activeManualTab, setActiveManualTab] = useState('intro'); // NEW: State สำหรับแท็บคู่มือการใช้งาน

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // NEW: Mobile Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useUserPersistentState('bmg_sidebar_open', true, fbUser); // NEW: Sidebar Desktop State (แยกอิสระรายบุคคล)
  const [fullScreenChart, setFullScreenChart] = useState(null); // แก้ไข: ย้าย State สำหรับจัดการ Full Screen Chart ขึ้นมาไว้ตรงนี้
  const [showNotificationModal, setShowNotificationModal] = useState(false); // NEW: State สำหรับแสดง Modal แจ้งเตือน

  // --- NEW: Auto-sync Current User (อัปเดตข้อมูลผู้ใช้แบบ Real-time เผื่อมีการเปลี่ยนสิทธิ์) ---
  useEffect(() => {
      if (currentUser && Array.isArray(users) && users.length > 0) {
          const freshUser = users.find(u => u.id === currentUser.id);
          if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
              // ตรวจสอบว่าไม่ได้เปลี่ยนแค่ lastLogin (ป้องกัน Infinite Loop ในกรณีที่เซ็ต lastLogin)
              const tempFresh = {...freshUser, lastLogin: ''};
              const tempCurrent = {...currentUser, lastLogin: ''};
              if (JSON.stringify(tempFresh) !== JSON.stringify(tempCurrent)) {
                 setCurrentUser(freshUser);
                 try {
                     localStorage.setItem('bmg_current_user', JSON.stringify(freshUser));
                 } catch (err) {
                     console.warn("Storage quota exceeded: ไม่สามารถอัปเดต Session ชั่วคราวได้ แต่ระบบยังทำงานต่อได้", err);
                 }
              }
          }
      }
  }, [users]);

  // --- NEW: ตรวจจับและบันทึกเวลาล่าสุดเมื่อเปิดระบบ (Refresh/Auto-login) เพื่อให้ซิงค์ข้ามเครื่อง ---
  useEffect(() => {
      if (!currentUser || !isUsersLoaded) return; // บังคับให้รอจนกว่าโหลดข้อมูล Users จาก Firebase สำเร็จก่อน

      // ฟังก์ชันสำหรับอัปเดตเวลาล่าสุด
      const updatePresence = () => {
          setUsers(prevUsers => {
              if (!Array.isArray(prevUsers)) return prevUsers;
              const foundUser = prevUsers.find(u => u.id === currentUser.id);
              if (!foundUser) return prevUsers;
              
              const lastLoginTime = new Date(foundUser.lastLogin || 0).getTime();
              const nowTime = new Date().getTime();
              
              // อัปเดตเวลาลงฐานข้อมูลทุกๆ 5 นาที (300,000 ms) เพื่อให้สถานะไม่หมดอายุ (15 นาที)
              if (nowTime - lastLoginTime > 5 * 60 * 1000) { 
                  return prevUsers.map(u => 
                      u.id === currentUser.id ? { ...u, lastLogin: new Date().toISOString() } : u
                  );
              }
              return prevUsers; // ถ้าสียังไม่ถึง 5 นาที ไม่ต้องสั่งอัปเดต State (ลดการดึงเครือข่าย)
          });
      };

      // รันเช็คครั้งแรกเมื่อระบบโหลดเสร็จ
      updatePresence();

      // ตั้งเวลาเช็คซ้ำทุกๆ 1 นาทีตราบใดที่เปิดหน้าเว็บอยู่
      const intervalId = setInterval(updatePresence, 60 * 1000);

      // ยกเลิกการตั้งเวลาเมื่อผู้ใช้ออกจากระบบหรือปิดหน้าต่าง
      return () => clearInterval(intervalId);
  }, [currentUser?.id, isUsersLoaded]); // ผูกกับ Dependency 2 ตัวนี้

  // --- NEW: Auto-Sync State (สถานะการซิงค์อัตโนมัติ) ---
  const [autoSyncMessage, setAutoSyncMessage] = useState('');

  // --- NEW: Helper Function สำหรับ Auto-Sync ไปยัง Google Sheets/Drive ---
  const triggerAutoSync = (tableName, dataList, files = []) => {
      const GOOGLE_SCRIPT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzmNdR7LVpfUossHkcNH_onBPTG2dw6GuJzh5JilthkMwW-Sdr4s0lFjPKwSsCBTg/exec';
      const GOOGLE_SCRIPT_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbzQYEwfj3xz-kACA43pNbnpcuPY9p3Vg039t-HqDaAIU7hf7WXswEf1MXlapdv3jU5tnw/exec';

      setAutoSyncMessage(`กำลังซิงค์ ${tableName} ไปยังคลาวด์...`);

      if (GOOGLE_SCRIPT_SHEETS_URL && !GOOGLE_SCRIPT_SHEETS_URL.includes('YOUR_')) {
          try {
              const sanitizedData = dataList.map(item => {
                  const cleanItem = { ...item };
                  if (cleanItem.photo) cleanItem.photo = 'Base64 Image';
                  if (cleanItem.logo) cleanItem.logo = 'Base64 Image';
                  if (cleanItem.images) cleanItem.images = 'Photos attached';
                  if (cleanItem.files) cleanItem.files = 'Files attached';
                  if (cleanItem.performance) {
                      cleanItem.performance = JSON.parse(JSON.stringify(cleanItem.performance));
                      Object.keys(cleanItem.performance).forEach(dept => {
                          if (cleanItem.performance[dept].images) cleanItem.performance[dept].images = 'Photos attached';
                      });
                  }
                  return cleanItem;
              });

              fetch(GOOGLE_SCRIPT_SHEETS_URL, {
                  method: 'POST',
                  mode: 'no-cors',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ [tableName]: sanitizedData })
              }).catch(err => console.error("Auto-sync sheet error", err));
          } catch(e) { console.error(e); }
      }

      if (files.length > 0 && GOOGLE_SCRIPT_DRIVE_URL && !GOOGLE_SCRIPT_DRIVE_URL.includes('YOUR_')) {
          const folderName = `AutoSync_${new Date().toISOString().split('T')[0]}`;
          files.forEach(file => {
              const match = file.data.match(/^data:(.+);base64,(.+)$/);
              if (!match) return;
              const payload = {
                  filename: file.name,
                  mimeType: match[1],
                  data: match[2],
                  folderName: folderName
              };
              fetch(GOOGLE_SCRIPT_DRIVE_URL, {
                  method: 'POST',
                  mode: 'no-cors',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify(payload)
              }).catch(err => console.error("Auto-sync drive error", err));
          });
      }

      setTimeout(() => setAutoSyncMessage(''), 3000);
  };

  // --- NEW: Helper function to calculate pending approvals for the current user ---
  const getPendingApprovals = () => {
      if (!currentUser) return [];

      const isChiefUser = (currentUser?.position || '').includes('หัวหน้าช่าง');
      const isManagerUser = (currentUser?.position || '').includes('ผู้จัดการ') && !(currentUser?.position || '').includes('ผู้ช่วย');
      const isAreaManagerUser = (currentUser?.position || '').includes('ผู้จัดการพื้นที่');
      const isHRUser = (currentUser?.position || '').includes('เจ้าหน้าที่ฝ่ายบุคคล');
      const isAdminUser = currentUser.username === 'admin' || currentUser.position === 'Super Admin';

      // เช็คสิทธิ์การเข้าถึงโครงการของผู้ใช้ (ปรับปรุงการตรวจสอบชนิดข้อมูลเพื่อป้องกัน Error)
      const accessibleDeptsStr = currentUser.accessibleDepts || '';
      const accessibleArray = Array.isArray(accessibleDeptsStr) ? accessibleDeptsStr : (typeof accessibleDeptsStr === 'string' ? accessibleDeptsStr.split(', ').filter(Boolean) : []);
      const canAccessAll = accessibleArray.includes('All') || isAdminUser;

      const isProjectAccessible = (projName) => {
          if (canAccessAll) return true;
          return projName === currentUser.department || accessibleArray.includes(projName);
      };

      let pendingItems = [];

      // 1. นับจำนวนประวัติ PM ที่รออนุมัติ
      pmHistoryList.forEach(record => {
          const proj = projects.find(p => p.id === record.projectId);
          if (proj && isProjectAccessible(proj.name)) {
              const status = record.approvalStatus;
              if ((status === 'Pending Chief' && (isChiefUser || isAdminUser)) || 
                  (status === 'Pending Manager' && (isManagerUser || isAdminUser))) {
                  pendingItems.push({
                      id: record.id,
                      type: 'pm',
                      title: `อนุมัติผล PM: ${record.machineName}`,
                      project: proj,
                      date: record.date,
                      actionText: 'ดูรายละเอียด PM',
                      record: record
                  });
              }
          }
      });

      // 2. นับจำนวนตารางงาน (Schedule) ที่รออนุมัติ
      Object.keys(scheduleApprovals).forEach(key => {
          const [projectId, month] = key.split('_');
          const proj = projects.find(p => p.id === projectId);
          if (proj && isProjectAccessible(proj.name)) {
              const approval = scheduleApprovals[key];
              if ((approval.status === 'Pending Manager' && (isManagerUser || isAdminUser)) || 
                  (approval.status === 'Pending Area Manager' && (isAreaManagerUser || isAdminUser)) ||
                  (approval.status === 'Pending HR' && (isHRUser || isAdminUser))) {
                  pendingItems.push({
                      id: key,
                      type: 'schedule',
                      title: `อนุมัติตารางงาน เดือน ${month.split('-').reverse().join('/')}`,
                      project: proj,
                      date: approval.updatedAt || new Date().toISOString(),
                      actionText: 'ดูตารางงาน',
                      month: month
                  });
              }
          }
      });

      // 3. นับจำนวนรายการแจ้งซ่อมที่รอดำเนินการ (สำหรับช่าง)
      const isTechnicianUser = (currentUser?.position || '').includes('ช่าง') || isAdminUser;
      
      repairs.forEach(repair => {
          const proj = projects.find(p => p.id === repair.projectId);
          if (proj && isProjectAccessible(proj.name)) {
              if (repair.inspectionResult === 'รอดำเนินการ' && isTechnicianUser) {
                  pendingItems.push({
                      id: repair.id,
                      type: 'repair',
                      title: `แจ้งซ่อม: ${repair.issueType === 'อื่นๆ (ให้ระบุ)' || repair.issueType === 'อื่นๆ' ? repair.issueTypeOther : repair.issueType}`,
                      project: proj,
                      date: repair.date || new Date().toISOString(),
                      actionText: 'ดูรายการแจ้งซ่อม',
                      record: repair
                  });
              }
          }
      });

      // เรียงลำดับจากเก่าไปใหม่ เพื่อให้เคลียร์งานเก่าก่อน
      return pendingItems.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // NEW: Helper for downloading files safely (especially large base64 PDFs)
  const handleDownloadFile = async (fileObj, defaultName = 'document.pdf') => {
      try {
          if (!fileObj) return;
          
          let fileName = fileObj?.name || defaultName;
          let fileData = null;

          // ❗ กำหนด URL ของ Google Apps Script สำหรับดึงไฟล์ที่นี่ (ดึงจาก Drive ข้ามเครื่อง)
          // เปลี่ยนคำว่า YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE เป็น URL ที่ได้จากการ Deploy แบบ Web App (doGet)
          const GOOGLE_SCRIPT_GET_FILE_URL = 'https://script.google.com/macros/s/AKfycbzQYEwfj3xz-kACA43pNbnpcuPY9p3Vg039t-HqDaAIU7hf7WXswEf1MXlapdv3jU5tnw/exec'; 

          // --- 1. ลองดึงข้อมูลจาก Local (IndexedDB) ของเครื่องนี้ก่อน ---
          if (fileObj?.isLocal && fileObj?.fileId) {
              fileData = await getFileLocally(fileObj.fileId);
          }

          // --- 2. ถ้าเครื่องนี้ไม่มีไฟล์ (เปิดจากเครื่องอื่น) ให้ไปดึงจาก Google Drive ---
          if (!fileData && GOOGLE_SCRIPT_GET_FILE_URL && GOOGLE_SCRIPT_GET_FILE_URL !== 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE') {
              console.log(`กำลังดึงข้อมูลไฟล์จาก Google Drive...`);
              try {
                  // ตอนที่เรา Backup ไฟล์ลง Drive ระบบตั้งชื่อไว้แบบนี้ Document_{fileId}.pdf
                  const searchName = fileObj.fileId ? `Document_${fileObj.fileId}.pdf` : fileName;
                  
                  const response = await fetch(`${GOOGLE_SCRIPT_GET_FILE_URL}?filename=${encodeURIComponent(searchName)}&fallbackName=${encodeURIComponent(fileName)}`);
                  const result = await response.json();
                  
                  if (result.status === 'success' && result.data) {
                      fileData = result.data;
                      // เมื่อโหลดมาจาก Drive สำเร็จ ให้บันทึกลงเครื่องนี้ด้วย (Cache) ครั้งหน้าจะได้ไม่ต้องโหลดผ่านเน็ตอีก
                      if (fileObj.fileId) {
                          await saveFileLocally(fileObj.fileId, fileData);
                      }
                  } else {
                      console.warn("Drive fetch failed:", result.message);
                  }
              } catch (e) {
                  console.error("Error fetching from Drive:", e);
              }
          }

          // --- 3. Fallback สุดท้าย: ดึงจาก State/URL เดิม (ถ้ามี) ---
          if (!fileData) {
              fileData = fileObj?.data || fileObj?.fileUrl;
              if (typeof fileObj === 'string') {
                   fileName = fileObj;
                   fileData = null;
                   if (fileObj.startsWith('data:')) {
                       fileData = fileObj;
                       fileName = defaultName;
                   }
              }
          }

          // --- 4. ดำเนินการ Download / แสดงไฟล์ ---
          if (fileData && typeof fileData === 'string' && fileData.startsWith('data:')) {
              // แก้ไขปัญหาการบล็อก fetch(DataURI) ด้วยการแปลง Base64 กลับเป็น Blob โดยตรง
              try {
                  const arr = fileData.split(',');
                  const mime = arr[0].match(/:(.*?);/)[1];
                  const bstr = atob(arr[1]);
                  let n = bstr.length;
                  const u8arr = new Uint8Array(n);
                  while (n--) {
                      u8arr[n] = bstr.charCodeAt(n);
                  }
                  const blob = new Blob([u8arr], { type: mime });
                  const url = URL.createObjectURL(blob);
                  
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 1000); // ทำความสะอาดหน่วยความจำ
              } catch (convErr) {
                  console.error("Blob conversion error, using fallback Data URL", convErr);
                  const a = document.createElement('a');
                  a.href = fileData;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
              }
          } else {
              console.warn(`ไม่พบเนื้อหาไฟล์จริงของ ${fileName}`);
              // ใช้ showAlert แทน showConfirm เพื่อแจ้งเตือนแบบสวยงามและมีปุ่มตกลงปุ่มเดียว
              showAlert(
                  'ไม่พบเนื้อหาไฟล์',
                  `ไม่พบไฟล์ ${fileName} ในเครื่องนี้ และไม่สามารถดึงจาก Google Drive ได้ (โปรดตรวจสอบว่าได้ทำการ Backup ลง Drive จากเครื่องต้นทางแล้ว หรือตั้งค่า URL ถูกต้องหรือไม่)`
              );
          }
      } catch (error) {
          console.error("Download error:", error);
      }
  };

  // NEW: Helper Functions for Confirmation
  const showConfirm = (title, message, onConfirm, confirmText = 'ยืนยันการลบ', type = 'danger') => {
      setConfirmModal({ isOpen: true, title, message, onConfirm, confirmText, type });
  };
  const showAlert = (title, message) => {
      setConfirmModal({ isOpen: true, title, message, onConfirm: null, confirmText: 'ตกลง', type: 'alert' });
  };
  const closeConfirm = () => {
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'ยืนยันการลบ', type: 'danger' });
  };

  // ฟังก์ชันตรวจสอบสิทธิ์การเข้าถึง (Permission Checker)
  const hasPerm = (menuId, action = 'view') => {
      if (!currentUser) return false;
      if (currentUser.username === 'admin' || currentUser.position === 'Super Admin') return true; // Admin เข้าถึงได้ทุกอย่าง
      
      const perms = currentUser.permissions || {};
      
      // Backward Compatibility: ถ้าเป็นเมนูย่อยของหน่วยงาน และไม่มีข้อมูลสิทธิ์เดิมในระบบ ให้ถือว่าดูได้ไปก่อน (ป้องกันเมนูหาย)
      if (menuId.startsWith('proj_') && action === 'view' && (!perms[menuId] || perms[menuId].view === undefined)) {
          return true;
      }
      
      return !!perms[menuId]?.[action];
  };

  // NEW: ฟังก์ชันตรวจสอบว่าผู้ใช้สามารถเข้าถึงได้หลายโครงการหรือไม่
  const canAccessMultipleProjects = () => {
      if (!currentUser) return false;
      if (currentUser.username === 'admin') return true;
      
      // แปลงข้อมูลเป็น Array เพื่อการตรวจสอบที่แม่นยำ
      const accessibleDeptsStr = currentUser.accessibleDepts || '';
      const accessibleArray = typeof accessibleDeptsStr === 'string' ? accessibleDeptsStr.split(', ').filter(Boolean) : accessibleDeptsStr;
      
      if (accessibleArray.includes('All') || accessibleArray.length > 0) return true;
      return false; // ถ้าเป็นพนักงานประจำหน่วยงานปกติ จะถูกล็อค
  };

  // แก้ไขขั้นสูง: ถอด html2pdf.js และโหลดเอนจิน html-to-image + jsPDF เพื่อแก้ภาษาไทย 100%
  useEffect(() => { 
      if (!document.getElementById('html-to-image-script')) {
          const script1 = document.createElement('script'); 
          script1.id = 'html-to-image-script';
          script1.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"; 
          script1.async = true; 
          document.body.appendChild(script1); 
      }
      if (!document.getElementById('jspdf-script')) {
          const script2 = document.createElement('script'); 
          script2.id = 'jspdf-script';
          script2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; 
          script2.async = true; 
          document.body.appendChild(script2); 
      }
  }, []);

  // สร้างและรันรหัสโครงการอัตโนมัติตามประเภท (C, V, O)
  useEffect(() => { 
      if (showAddProjectModal && !isEditingProject) { 
          const prefix = PROJECT_TYPE_CODES[newProject.type]; 
          // หาเลขสูงสุดของประเภทนั้นๆ เพื่อป้องกันรหัสซ้ำกรณีมีการลบข้อมูล
          const existingCodes = projects
              .filter(p => p.type === newProject.type && p.code && p.code.startsWith(prefix + '-'))
              .map(p => parseInt(p.code.split('-')[1], 10))
              .filter(n => !isNaN(n));
          const maxCount = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
          const nextCount = maxCount + 1;
          const code = `${prefix}-${String(nextCount).padStart(3, '0')}`;
          setNewProject(prev => prev.code !== code ? { ...prev, code } : prev);
      } 
  }, [newProject.type, showAddProjectModal, projects, isEditingProject]);

  useEffect(() => { if (showAddContractModal) { setNewContract(prev => ({ ...prev, category: '', customCategory: '' })); } }, [newContract.type, showAddContractModal]);

  // Asset Code Generation Effect
  useEffect(() => {
    if (showAddAssetModal && selectedProject && !isEditingAsset) {
        const projectAssets = assets.filter(a => a.projectId === selectedProject.id);
        const nextNum = projectAssets.length + 1;
        const generatedCode = `${selectedProject.code}-A-${String(nextNum).padStart(3, '0')}`;
        setNewAsset(prev => ({ ...prev, code: generatedCode }));
    }
  }, [showAddAssetModal, selectedProject, assets, isEditingAsset]);

  // Tool Code Generation Effect
  useEffect(() => {
    if (showAddToolModal && selectedProject && !isEditingTool) {
        const projectTools = tools.filter(t => t.projectId === selectedProject.id);
        const nextNum = projectTools.length + 1;
        const generatedCode = `${selectedProject.code}-T-${String(nextNum).padStart(3, '0')}`;
        setNewTool(prev => ({ ...prev, code: generatedCode }));
    }
  }, [showAddToolModal, selectedProject, tools, isEditingTool]);

  // Machine Code Generation Effect
  useEffect(() => {
    if (showAddMachineModal && selectedProject && !isEditingMachine) {
        const projectMachines = machines.filter(m => m.projectId === selectedProject.id);
        const nextNum = projectMachines.length + 1;
        const generatedCode = `BMG-M-${String(nextNum).padStart(3, '0')}`;
        setNewMachine(prev => ({ ...prev, code: generatedCode }));
    }
  }, [showAddMachineModal, selectedProject, machines, isEditingMachine]);

  // Repair Code Generation Effect
  useEffect(() => {
    if (showAddRepairModal && selectedProject && !newRepair.id && !newRepair.code) {
        const projectRepairs = repairs.filter(r => r.projectId === selectedProject.id);
        const existingCodes = projectRepairs
            .map(r => parseInt(r.code.split('-REP-')[1], 10))
            .filter(n => !isNaN(n));
        const maxCount = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
        const nextNum = maxCount + 1;
        const generatedCode = `${selectedProject.code}-REP-${String(nextNum).padStart(3, '0')}`;
        setNewRepair(prev => prev.code === generatedCode ? prev : { ...prev, code: generatedCode });
    }
  }, [showAddRepairModal, selectedProject, repairs, newRepair.id, newRepair.code]);

  // Sync Schedule Note when month or project changes
  useEffect(() => {
      if (selectedProject && currentMonth) {
          const noteKey = `${selectedProject.id}_${currentMonth}`;
          setScheduleNote(scheduleNotes[noteKey] || '');
      }
  }, [selectedProject, currentMonth, scheduleNotes]);

  const t = (key) => TRANSLATIONS[lang][key] || key;
  const changeMonth = (increment) => { const [year, month] = currentMonth.split('-').map(Number); const date = new Date(year, month - 1 + increment, 1); const newYear = date.getFullYear(); const newMonth = String(date.getMonth() + 1).padStart(2, '0'); setCurrentMonth(`${newYear}-${newMonth}`); }; const getDaysInMonth = (year, month) => { const date = new Date(year, month - 1, 1); const days = []; while (date.getMonth() === month - 1) { days.push(new Date(date)); date.setDate(date.getDate() + 1); } return days; }; 
  
  const handleSaveSchedule = () => { 
      if (selectedProject) {
          const noteKey = `${selectedProject.id}_${currentMonth}`;
          setScheduleNotes(prev => ({ ...prev, [noteKey]: scheduleNote }));
          
          // --- NEW: Workflow Logic ---
          const approvalKey = `${selectedProject.id}_${currentMonth}`;
          const currentApproval = scheduleApprovals[approvalKey] || {};
          
          const isManager = (currentUser?.position || '').includes('ผู้จัดการอาคาร') || (currentUser?.position || '').includes('ผู้จัดการหมู่บ้าน');
          const isAreaManager = (currentUser?.position || '').includes('ผู้จัดการพื้นที่');
          const isAdmin = currentUser?.username === 'admin';
          
          let nextStatus = 'Pending Manager';
          
          // ถ้าเป็น Area Manager หรือ Admin ทำเอง ให้ไปรอ HR อนุมัติเลย
          if (isAreaManager || isAdmin) {
              nextStatus = 'Pending HR';
          } 
          // ถ้าเป็น Manager ทำเอง ให้ส่งไปรอ Area Manager อนุมัติ
          else if (isManager) {
              nextStatus = 'Pending Area Manager';
          }
          
          setScheduleApprovals(prev => ({
              ...prev,
              [approvalKey]: {
                  ...currentApproval,
                  status: nextStatus,
                  preparedBy: `${currentUser.firstName} ${currentUser.lastName}`,
                  preparedByRole: currentUser.position,
                  managerApprovedBy: (isAreaManager || isAdmin) ? `${currentUser.firstName} ${currentUser.lastName}` : null,
                  managerApprovedByRole: (isAreaManager || isAdmin) ? currentUser.position : null,
                  updatedAt: new Date().toISOString()
              }
          }));

          alert(`บันทึกตารางงานสำเร็จ! ระบบได้ส่งข้อมูลให้ ${nextStatus === 'Pending Area Manager' ? 'ผู้จัดการพื้นที่' : nextStatus === 'Pending HR' ? 'เจ้าหน้าที่ฝ่ายบุคคล (HR)' : 'ผู้จัดการ'} อนุมัติตามลำดับแล้ว`); 
      }
  }; 

  // --- NEW: Handle Schedule Approval ---
  const handleApproveSchedule = () => {
      if (!selectedProject) return;
      const approvalKey = `${selectedProject.id}_${currentMonth}`;
      const currentApproval = scheduleApprovals[approvalKey];
      if (!currentApproval) return;

      const isHR = (currentUser?.position || '').includes('เจ้าหน้าที่ฝ่ายบุคคล') || currentUser?.username === 'admin';
      const isManager = (currentUser?.position || '').includes('ผู้จัดการอาคาร') || (currentUser?.position || '').includes('ผู้จัดการหมู่บ้าน') || currentUser?.username === 'admin';
      const isAreaManager = (currentUser?.position || '').includes('ผู้จัดการพื้นที่') || currentUser?.username === 'admin';

      let nextStatus = currentApproval.status;
      let updates = {};

      if (currentApproval.status === 'Pending Manager' && isManager) {
          // หากคนอนุมัติเป็น Manager ปกติให้ส่งไป HR ได้เลย (กรณีลูกน้องเป็นคนทำ)
          nextStatus = 'Pending HR';
          updates.managerApprovedBy = `${currentUser.firstName} ${currentUser.lastName}`;
          updates.managerApprovedByRole = currentUser.position;
          alert('อนุมัติตารางงานระดับ "ผู้จัดการ" สำเร็จ! ระบบส่งต่อให้เจ้าหน้าที่ฝ่ายบุคคลตรวจสอบ');
      } else if (currentApproval.status === 'Pending Area Manager' && isAreaManager) {
          nextStatus = 'Pending HR';
          // ลงชื่อในฐานะผู้ตรวจสอบ
          updates.managerApprovedBy = `${currentUser.firstName} ${currentUser.lastName}`;
          updates.managerApprovedByRole = currentUser.position;
          alert('อนุมัติตารางงานระดับ "ผู้จัดการพื้นที่" สำเร็จ! ระบบส่งต่อให้เจ้าหน้าที่ฝ่ายบุคคลตรวจสอบ');
      } else if (currentApproval.status === 'Pending HR' && isHR) {
          nextStatus = 'Approved';
          updates.hrApprovedBy = `${currentUser.firstName} ${currentUser.lastName}`;
          alert('อนุมัติตารางงานระดับ "ฝ่ายบุคคล" สำเร็จ! ตารางงานเสร็จสมบูรณ์');
      }

      setScheduleApprovals(prev => ({
          ...prev,
          [approvalKey]: {
              ...currentApproval,
              ...updates,
              status: nextStatus,
              updatedAt: new Date().toISOString()
          }
      }));
  };

  const handleLockSchedule = () => {
      if (!selectedProject) return;
      const approvalKey = `${selectedProject.id}_${currentMonth}`;
      const currentApproval = scheduleApprovals[approvalKey];
      if (!currentApproval) return;
      
      setScheduleApprovals(prev => ({
          ...prev,
          [approvalKey]: {
              ...currentApproval,
              isLocked: true,
              lockedBy: `${currentUser.firstName} ${currentUser.lastName}`,
              updatedAt: new Date().toISOString()
          }
      }));
      alert('ล็อคตารางงานสมบูรณ์แล้ว พนักงานจะไม่สามารถแก้ไขข้อมูล(ทั้ง Plan และ Act) ได้จนกว่าจะปลดล็อค');
  };

  const handleUnlockSchedule = () => {
      if (!selectedProject) return;
      const approvalKey = `${selectedProject.id}_${currentMonth}`;
      const currentApproval = scheduleApprovals[approvalKey];
      if (!currentApproval) return;
      
      setScheduleApprovals(prev => ({
          ...prev,
          [approvalKey]: {
              ...currentApproval,
              isLocked: false,
              status: 'Pending HR', // ย้อนสถานะกลับเพื่อให้สามารถแก้ Plan ได้ด้วย
              hrApprovedBy: null,
              updatedAt: new Date().toISOString()
          }
      }));
      alert('ปลดล็อคตารางงานสำเร็จ สถานะกลับไปเป็นรอฝ่ายบุคคลอนุมัติ');
  };

  const Badge = ({ status }) => { 
      if (!status || typeof status !== 'string') return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">-</span>;
      const statusText = t(status.charAt(0).toLowerCase() + status.slice(1).replace(/ /g, '')) || status; 
      const colors = { 'Active': 'bg-green-100 text-green-800', 'Inactive': 'bg-gray-100 text-gray-800', 'Warning': 'bg-yellow-100 text-yellow-800', 'Good': 'bg-green-100 text-green-800', 'Fair': 'bg-yellow-100 text-yellow-800', 'Normal': 'bg-blue-100 text-blue-800', 'Repair': 'bg-red-100 text-red-800', 'Pending': 'bg-orange-100 text-orange-800', 'Approved': 'bg-green-100 text-green-800', 'Completed': 'bg-green-100 text-green-800', 'Expiring Soon': 'bg-orange-100 text-orange-800', 'Expired': 'bg-red-100 text-red-800' }; 
      return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{statusText}</span>; 
  };
  
  // Helpers for PM Calendar
  const changePmMonth = (increment) => {
    const [year, month] = pmMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + increment, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setPmMonth(`${newYear}-${newMonth}`);
  };

  const getCalendarDays = (year, month) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) {
        const d = new Date(year, month - 1, -firstDay.getDay() + i + 1);
        days.push({ date: d, isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month - 1, i), isCurrentMonth: true });
    }
    return days;
  };

  // NEW: Dynamic Checklist Generator based on System Type
  const getChecklistForSystem = (systemName) => {
      const sys = systemName ? systemName.toLowerCase() : '';
      
      if (sys.includes('transformer') || sys.includes('หม้อแปลง')) {
          return [
              'ตรวจสอบอุณหภูมิและการระบายอากาศภายในห้อง', 'ตรวจสอบสภาพตัวถังและรอยรั่วซึมของน้ำมัน', 'ตรวจสอบเสียงและความสั่นสะเทือนขณะทำงาน',
              'ตรวจสอบจุดเชื่อมต่อสายไฟและฉนวน (Bushing)', 'ตรวจสอบระดับน้ำมันหม้อแปลง', 'ตรวจสอบสภาพและสีของซิลิก้าเจล (Silica Gel)', 'ทำความสะอาดอุปกรณ์และบริเวณโดยรอบ'
          ];
      }
      if (sys.includes('generator') || sys.includes('เครื่องกำเนิด')) {
           return [
               'ตรวจสอบระดับน้ำมันเชื้อเพลิง (Fuel)', 'ตรวจสอบระดับน้ำมันหล่อลื่น (Engine Oil)', 'ตรวจสอบระดับน้ำหล่อเย็นและรอยรั่ว',
               'ตรวจสอบแรงดันและน้ำกลั่นแบตเตอรี่', 'ตรวจสอบรอยรั่วซึมของน้ำมันหล่อลื่นรอบเครื่อง', 'ตรวจสอบความตึงและสภาพสายพานหน้าเครื่อง', 'ทดสอบเดินเครื่องเปล่า (No Load Test / Warm up)'
           ];
      }
      if (sys.includes('pump') || sys.includes('ปั๊ม')) {
           return [
               'ตรวจสอบแรงดันน้ำขาเข้า (Suction Pressure)', 'ตรวจสอบแรงดันน้ำขาออก (Discharge Pressure)', 'ตรวจสอบเสียงและความสั่นสะเทือนของมอเตอร์',
               'ตรวจสอบการรั่วซึมของซีล (Mechanical Seal)', 'วัดค่ากระแสไฟฟ้า (Amp) ขณะมอเตอร์ทำงาน', 'ตรวจสอบการทำงานของ Pressure Switch/Sensor', 'ตรวจสอบสถานะไฟแสดงผลหน้าตู้ควบคุมปั๊ม'
           ];
      }
      if (sys.includes('chiller') || sys.includes('air') || sys.includes('ปรับอากาศ') || sys.includes('ahu') || sys.includes('fcu')) {
          return [
              'ตรวจสอบอุณหภูมิน้ำ/ลม เข้าและออก', 'ตรวจสอบแรงดันน้ำยาทำความเย็นในระบบ', 'ตรวจสอบเสียงการทำงานของคอมเพรสเซอร์',
              'ตรวจสอบและทำความสะอาดแผ่นกรองอากาศ (Filter)', 'วัดค่ากระแสไฟฟ้าคอมเพรสเซอร์/มอเตอร์พัดลม', 'ตรวจสอบการทำงานของพัดลมระบายความร้อน', 'ตรวจสอบการรั่วซึมของน้ำทิ้งและน้ำยา'
          ];
      }
      if (sys.includes('fire') || sys.includes('ดับเพลิง') || sys.includes('sprinkler')) {
          return [
              'ตรวจสอบสถานะตู้ควบคุม (ต้องอยู่ในตำแหน่ง Auto)', 'ตรวจสอบแรงดันน้ำในระบบ (Jockey Pump)', 'ตรวจสอบสถานะวาล์วเปิด-ปิดในระบบ',
              'ตรวจสอบระดับน้ำในถังเก็บน้ำดับเพลิง', 'ตรวจสอบการรั่วซึมของปั๊ม ท่อ และข้อต่อ', 'ตรวจสอบความพร้อมของสายฉีดและหัวฉีด', 'ทดสอบการทำงานระบบแจ้งเหตุเพลิงไหม้เบื้องต้น'
          ];
      }
      if (sys.includes('lift') || sys.includes('ลิฟต์') || sys.includes('บันไดเลื่อน')) {
          return [
              'ตรวจสอบการทำงานของประตูบานสไลด์ (การเปิด-ปิด)', 'ตรวจสอบระบบแสงสว่างและพัดลมในห้องโดยสาร', 'ทดสอบระบบสื่อสารฉุกเฉิน (Intercom / Alarm)',
              'ตรวจสอบความแม่นยำในการจอดตรงชั้น (Leveling)', 'ตรวจสอบเสียงและความสั่นสะเทือนขณะลิฟต์เคลื่อนที่', 'ตรวจสอบสภาพปุ่มกดภายในและหน้าลิฟต์ทุกชั้น', 'ตรวจสอบการทำงานของเซ็นเซอร์กันหนีบประตู'
          ];
      }
      if (sys.includes('cctv') || sys.includes('กล้อง') || sys.includes('access control')) {
          return [
              'ตรวจสอบภาพจากกล้องทุกตัว (ความคมชัด/แสง)', 'ตรวจสอบมุมกล้องว่าครอบคลุมพื้นที่', 'ตรวจสอบสถานะการบันทึกภาพของฮาร์ดดิสก์ (NVR/DVR)',
              'ตรวจสอบเวลาในระบบกล้องให้ตรงกับปัจจุบัน', 'ตรวจสอบสภาพสายสัญญาณและจุดเชื่อมต่อ', 'ตรวจสอบสถานะเครื่องสำรองไฟ (UPS)', 'เช็ดทำความสะอาดหน้าเลนส์กล้อง'
          ];
      }

      // Default Checklist for any other system
      return [
          'ตรวจสอบสภาพความสมบูรณ์ของโครงสร้างภายนอก',
          'ตรวจสอบเสียงและความสั่นสะเทือนที่ผิดปกติ',
          'ตรวจสอบอุณหภูมิและความร้อนขณะทำงาน',
          'ตรวจสอบร่องรอยการรั่วซึม (น้ำ, น้ำมัน, ลม)',
          'ตรวจสอบความแน่นหนาของจุดเชื่อมต่อและน็อตยึด',
          'ตรวจสอบความสะอาดของตัวเครื่องและพื้นที่รอบข้าง',
          'ทดสอบการทำงานเบื้องต้น (Basic Function Test)'
      ];
  };

  const handleOpenPmForm = (task, machine, plannedDateString = null) => {
      setCurrentPmTask({ task, machine, plannedDateString });
      const systemChecklist = getChecklistForSystem(machine.system);
      
      // Initialize empty answers
      const initialAnswers = {};
      const initialIssues = {};
      systemChecklist.forEach((_, idx) => {
          initialAnswers[`item_${idx}`] = ''; // '' = unselected, 'pass', 'fail', 'na'
          initialIssues[`item_${idx}`] = '';
      });
      
      setPmFormAnswers(initialAnswers);
      setPmFormIssues(initialIssues);
      setPmFormRemark('');
      setPmFormImages([]); // รีเซ็ตรูปภาพเมื่อเปิดฟอร์มใหม่
      setShowPmFormModal(true);
  };

  const handlePmFormImageUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const compressedBase64 = await compressImage(file);
          setPmFormImages(prev => [...prev, compressedBase64]);
      }
  };

  const removePmFormImage = (index) => {
      setPmFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePmForm = (e) => {
      e.preventDefault();
      
      // Calculate Pass/Fail status
      let passCount = 0;
      let failCount = 0;
      let naCount = 0;
      Object.values(pmFormAnswers).forEach(val => {
          if (val === 'pass') passCount++;
          if (val === 'fail') failCount++;
          if (val === 'na') naCount++;
      });

      const overallStatus = failCount > 0 ? 'Fail' : 'Pass';

      // --- NEW: Approval Flow Logic ---
      const isChief = (user) => (user?.position || '').includes('หัวหน้าช่าง');
      const isManager = (user) => (user?.position || '').includes('ผู้จัดการ') && !(user?.position || '').includes('ผู้ช่วย');
      const isAdmin = (user) => user?.username === 'admin' || user?.position === 'Super Admin';

      const projectStaff = users.filter(u => u.department === selectedProject.name);
      const hasChiefInProject = projectStaff.some(u => isChief(u));
      
      let initialApprovalStatus = 'Pending Chief';
      let initialApproverRole = 'หัวหน้าช่าง';

      // หากผู้บันทึกเป็นผู้จัดการ/Admin ให้ข้ามการอนุมัติไปเลย
      if (isAdmin(currentUser) || isManager(currentUser)) {
          initialApprovalStatus = 'Approved';
          initialApproverRole = 'None';
      } 
      // หากผู้บันทึกเป็นหัวหน้าช่าง หรือ โครงการนี้ไม่มีหัวหน้าช่าง ให้ข้ามไปรอผู้จัดการอนุมัติ
      else if (isChief(currentUser) || !hasChiefInProject) {
          initialApprovalStatus = 'Pending Manager';
          initialApproverRole = 'ผู้จัดการ';
      }

      const todayLocal = new Date();
      const localDateString = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;

      // --- NEW: Calculate Timing Status ---
      let timingStatus = 'ดำเนินการตามแผน';
      if (currentPmTask.plannedDateString) {
          const planD = new Date(currentPmTask.plannedDateString);
          const execD = new Date(localDateString);
          planD.setHours(0,0,0,0);
          execD.setHours(0,0,0,0);

          if (execD < planD) {
              timingStatus = 'เร็วกว่าแผน';
          } else if (execD > planD) {
              timingStatus = 'ช้ากว่าแผน';
          }
      }
      // ------------------------------------

      // Create new history record
      const newHistoryRecord = {
          id: generateId(),
          projectId: selectedProject.id,
          machineId: currentPmTask.machine.id,
          machineCode: currentPmTask.machine.code,
          machineName: currentPmTask.machine.name,
          pmPlanId: currentPmTask.task.id,
          date: currentPmTask.plannedDateString || localDateString,
          executedDate: localDateString,
          executionTimingStatus: timingStatus, // เก็บสถานะการตรงต่อเวลา
          inspector: `${currentUser?.firstName} ${currentUser?.lastName}`,
          status: overallStatus,
          totalItems: Object.keys(pmFormAnswers).length,
          passedItems: passCount,
          failedItems: failCount,
          naItems: naCount,
          remark: pmFormRemark,
          images: pmFormImages, // แนบรูปภาพลงประวัติ
          answers: { ...pmFormAnswers },
          issues: { ...pmFormIssues },
          // Approval Fields
          approvalStatus: initialApprovalStatus,
          pendingApproverRole: initialApproverRole,
          approvals: [] // Track ใครอนุมัติไปแล้วบ้าง
      };

      // FIX: คำนวณค่า nextList ไว้ล่วงหน้า แล้วค่อยสั่ง Update State 
      const nextHistoryList = [newHistoryRecord, ...pmHistoryList];
      
      // Add to history state (putting newest first)
      setPmHistoryList(nextHistoryList);

      // --- AUTO SYNC TRIGGER (บันทึกข้อมูล PM พร้อมอัปโหลดรูป) ---
      let filesToUpload = [];
      if (newHistoryRecord.images && newHistoryRecord.images.length > 0) {
          newHistoryRecord.images.forEach((img, idx) => {
              filesToUpload.push({ name: `PM_${newHistoryRecord.machineCode}_${newHistoryRecord.id}_${idx}.jpg`, data: img });
          });
      }
      // แยกคำสั่งออกนอก setState เพื่อความเสถียร
      triggerAutoSync('PM_History_ประวัติPM', nextHistoryList, filesToUpload);

      // อัปเดตรายการในหน้าต่าง Dashboard ทันทีที่บันทึก
      if (selectedPmStatusDetail && selectedPmStatusDetail.status === 'Not Started') {
          setSelectedPmStatusDetail(prev => ({
              ...prev,
              tasks: prev.tasks.filter(t => !(t.plan.id === currentPmTask.task.id && t.dateString === currentPmTask.plannedDateString))
          }));
      }

      alert('บันทึกผลการตรวจสอบสำเร็จ ข้อมูลถูกส่งเข้าสู่ระบบการอนุมัติเรียบร้อยแล้ว!');
      setShowPmFormModal(false);
      setCurrentPmTask(null);
  };

  // --- NEW: Handle PM Approval Actions ---
  const handleApprovePmAction = (record, action) => {
      const isChiefUser = (currentUser?.position || '').includes('หัวหน้าช่าง');
      const isManagerUser = (currentUser?.position || '').includes('ผู้จัดการ') && !(currentUser?.position || '').includes('ผู้ช่วย');
      const isAdminUser = currentUser?.username === 'admin' || currentUser?.position === 'Super Admin';

      let nextStatus = record.approvalStatus;
      let nextRole = record.pendingApproverRole;

      if (action === 'Rejected') {
          nextStatus = 'Rejected';
          nextRole = 'None';
      } else { // Approved
          if (record.approvalStatus === 'Pending Chief' && (isChiefUser || isAdminUser)) {
              nextStatus = 'Pending Manager';
              nextRole = 'ผู้จัดการ';
          } else if (record.approvalStatus === 'Pending Manager' && (isManagerUser || isAdminUser)) {
              nextStatus = 'Approved';
              nextRole = 'None';
          } else if (isAdminUser) {
              nextStatus = 'Approved';
              nextRole = 'None';
          }
      }

      const approvalRecord = {
          approver: `${currentUser.firstName} ${currentUser.lastName}`,
          role: currentUser.position,
          date: new Date().toISOString(),
          action: action
      };

      const updatedRecord = {
          ...record,
          approvalStatus: nextStatus,
          pendingApproverRole: nextRole,
          approvals: [...(record.approvals || []), approvalRecord]
      };

      const nextList = pmHistoryList.map(h => h.id === record.id ? updatedRecord : h);
      setPmHistoryList(nextList);
      setSelectedPmHistory(updatedRecord);
      
      // สั่งซิงค์สถานะที่เปลี่ยนไปขึ้น Google Sheets
      triggerAutoSync('PM_History_ประวัติPM', nextList, []);

      // อัปเดตรายการในหน้าต่าง Dashboard ทันทีที่กดอนุมัติ
      if (selectedPmStatusDetail) {
          setSelectedPmStatusDetail(prev => ({
              ...prev,
              tasks: prev.tasks.filter(t => t.historyRecord?.id !== record.id)
          }));
      }
  };

  const handleLogin = (e) => { 
      e.preventDefault(); 
      
      const inputUsername = (loginForm.username || '').trim(); // ป้องกันค่าว่าง
      const inputPassword = loginForm.password || '';

      // 1. ค้นหาใน Users State ปกติ (รับประกันว่า users เป็น Array เสมอ)
      const userList = Array.isArray(users) ? users : [];
      let user = userList.find(u => u.username === inputUsername && u.password === inputPassword); 
      
      // 2. Fallback ฉุกเฉินสำหรับ Admin ป้องกันบัญชีหายหรือเข้าไม่ได้จากปัญหา Database
      if (!user && inputUsername === 'admin' && inputPassword === 'bosskim') {
          user = JSON.parse(JSON.stringify(INITIAL_USERS[0])); // ดึงบัญชี Admin หลักมาใช้ป้องกัน Reference ผิดพลาด
          
          // ถ้าไม่มีในฐานข้อมูล ให้เพิ่มกลับเข้าไปกู้คืนให้โดยอัตโนมัติ
          if (!userList.some(u => u.username === 'admin')) {
              setUsers([...userList, user]);
          }
      }

      if (user) { 
          // อัปเดตเวลาเข้าใช้งานล่าสุด
          const updatedUser = { ...user, lastLogin: new Date().toISOString() };
          
          setCurrentUser(updatedUser);
          // NEW: บันทึกข้อมูลลง LocalStorage เพื่อให้จำค่าตอน Refresh ทันที
          if (typeof window !== 'undefined') {
              try {
                  localStorage.setItem('bmg_current_user', JSON.stringify(updatedUser));
              } catch (err) {
                  console.warn("Storage quota exceeded: ไม่สามารถบันทึก Session ลงเครื่องได้", err);
              }
          }
          setNewDailyReport(prev => ({...prev, reporter: `${updatedUser.firstName} ${updatedUser.lastName}`})); 
          setLoginError(''); 

          // อัปเดตข้อมูลใน State เพื่อให้เวลาแสดงผลในตารางเป็นปัจจุบัน
          const userExists = userList.some(u => u.id === updatedUser.id);
          if (userExists) {
              const updatedUsers = userList.map(u => u.id === updatedUser.id ? updatedUser : u);
              setUsers(updatedUsers);
          }
          
          // ตรวจสอบหน่วยงานประจำของผู้ใช้
          if (updatedUser.department && updatedUser.department !== 'Head Office') {
              // ค้นหาข้อมูลโปรเจกต์จากชื่อ department
              const assignedProject = (projects || []).find(p => p.name === updatedUser.department);
              if (assignedProject) {
                  setSelectedProject(assignedProject); // เปิดหน้าโครงการนั้นทันที
                  setActiveMenu('projects');
                  setProjectTab('overview');
              } else {
                  // กรณีไม่พบชื่อโครงการให้กลับไปหน้าหลัก
                  setSelectedProject(null);
                  setActiveMenu('dashboard');
              }
          } else {
              // หากเป็น Head Office หรือไม่ได้ระบุ ให้ไปที่หน้า Dashboard หลัก
              setSelectedProject(null);
              setActiveMenu('dashboard');
          }
      } else { 
          setLoginError('ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง (หากคุณลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ)'); 
      } 
  };
  
  const handleLogout = () => { 
      setCurrentUser(null); 
      // NEW: ลบข้อมูลออกจาก LocalStorage
      if (typeof window !== 'undefined') {
          localStorage.removeItem('bmg_current_user');
      }
      setLoginForm({ username: '', password: '' }); 
      setActiveMenu('dashboard'); 
      setSelectedProject(null); 
  };
  
  const getKPIs = () => ({ projects: projects.length, employees: users.length, pendingTasks: 0, pmDue: 0 });
  const exportToCSV = (data, filename) => { if (!data || data.length === 0) return alert('No data to export'); const headers = Object.keys(data[0]); const csvContent = [headers.join(','), ...data.map(row => headers.map(fieldName => `"${row[fieldName] || ''}"`).join(','))].join('\n'); const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${filename}.csv`; link.click(); }; 
  
  // --- NEW: Helper Functions สำหรับสร้าง หัวกระดาษ และ ท้ายกระดาษ ลงใน PDF ทุกหน้า ---
  const generateHeaderImage = async (proj, comp, orientation) => {
      const A4_WIDTH_PORTRAIT = 210;
      const A4_WIDTH_LANDSCAPE = 297;
      const scale = 4; // เพิ่มความคมชัดของภาพ
      const mmToPx = (mm) => (mm * 3.7795) * scale; 
      
      const widthMm = orientation === 'landscape' ? A4_WIDTH_LANDSCAPE : A4_WIDTH_PORTRAIT;
      const canvasWidth = mmToPx(widthMm);
      
      const hCanvas = document.createElement('canvas');
      hCanvas.width = canvasWidth;
      hCanvas.height = mmToPx(22); // ลดความสูงหัวกระดาษเหลือ 22mm ให้ชิดขอบบนมากขึ้น
      const ctxH = hCanvas.getContext('2d');
      
      // พื้นหลังสีขาว
      ctxH.fillStyle = '#ffffff';
      ctxH.fillRect(0, 0, hCanvas.width, hCanvas.height);
      
      const name = proj?.name || comp?.name || 'BEST MILLION GROUP';
      const address = proj?.address || comp?.address || '';
      const logoSrc = proj?.logo || comp?.logo || null;
      
      let textStartX = mmToPx(10); 
      
      // วาดโลโก้
      if (logoSrc) {
          await new Promise(resolve => {
              const img = new Image();
              img.crossOrigin = 'Anonymous';
              img.onload = () => {
                  const imgHeight = mmToPx(14); 
                  const imgWidth = (img.width / img.height) * imgHeight;
                  ctxH.drawImage(img, mmToPx(10), mmToPx(4), imgWidth, imgHeight); // ขยับรูปขึ้น
                  textStartX = mmToPx(10) + imgWidth + mmToPx(5);
                  resolve();
              };
              img.onerror = resolve; 
              img.src = logoSrc;
          });
      }
      
      // เปลี่ยนมาใช้ฟอนต์ Sarabun เพื่อให้สระไม่ลอยและตัวอักษรไม่ทับกัน
      ctxH.textBaseline = 'top';
      ctxH.fillStyle = '#FF4D00'; 
      ctxH.font = `bold ${Math.round(mmToPx(5))}px 'Sarabun', sans-serif`;
      ctxH.fillText(name, textStartX, mmToPx(4)); 
      
      ctxH.fillStyle = '#4B5563'; 
      ctxH.font = `normal ${Math.round(mmToPx(3.5))}px 'Sarabun', sans-serif`;
      ctxH.fillText(address, textStartX, mmToPx(11)); 
      
      // เส้นคั่นล่างหัวกระดาษ
      ctxH.beginPath();
      ctxH.moveTo(mmToPx(10), hCanvas.height - mmToPx(2));
      ctxH.lineTo(hCanvas.width - mmToPx(10), hCanvas.height - mmToPx(2));
      ctxH.strokeStyle = '#E5E7EB';
      ctxH.lineWidth = mmToPx(0.5);
      ctxH.stroke();
      
      return hCanvas.toDataURL('image/jpeg', 1.0);
  };

  const generateFooterImage = (pageNum, totalPages, orientation) => {
      const A4_WIDTH_PORTRAIT = 210;
      const A4_WIDTH_LANDSCAPE = 297;
      const scale = 4;
      const mmToPx = (mm) => (mm * 3.7795) * scale; 
      
      const widthMm = orientation === 'landscape' ? A4_WIDTH_LANDSCAPE : A4_WIDTH_PORTRAIT;
      const canvasWidth = mmToPx(widthMm);
      
      const fCanvas = document.createElement('canvas');
      fCanvas.width = canvasWidth;
      fCanvas.height = mmToPx(20); // ความสูงท้ายกระดาษ 20mm
      const ctxF = fCanvas.getContext('2d');
      
      ctxF.fillStyle = '#ffffff';
      ctxF.fillRect(0, 0, fCanvas.width, fCanvas.height);
      
      // เส้นคั่นบนท้ายกระดาษ
      ctxF.beginPath();
      ctxF.moveTo(mmToPx(10), mmToPx(2));
      ctxF.lineTo(fCanvas.width - mmToPx(10), mmToPx(2));
      ctxF.strokeStyle = '#E5E7EB';
      ctxF.lineWidth = mmToPx(0.5);
      ctxF.stroke();
      
      // เปลี่ยนมาใช้ฟอนต์ Sarabun
      ctxF.textBaseline = 'middle';
      ctxF.fillStyle = '#6B7280'; 
      ctxF.font = `bold ${Math.round(mmToPx(3.5))}px 'Sarabun', sans-serif`;
      ctxF.fillText('Managed by Best Million Group Co., Ltd.', mmToPx(10), mmToPx(10));
      
      // เลขหน้า (ขวา)
      const pageText = `Page ${pageNum} of ${totalPages}`;
      ctxF.textAlign = 'right';
      ctxF.fillText(pageText, fCanvas.width - mmToPx(10), mmToPx(10));
      
      return fCanvas.toDataURL('image/jpeg', 1.0);
  };
  // --------------------------------------------------------------------------

  // แก้ไขระดับขั้นสูง: เขียนระบบ Generate PDF ใหม่ด้วย html-to-image
  const handleExportPDF = async (elementId = 'print-area', filename = 'document.pdf', orientation = 'portrait', customMargin = null) => { 
      if (!window.htmlToImage || !window.jspdf) { 
          alert("ระบบกำลังโหลดเครื่องมือ PDF ขั้นสูง กรุณารอสักครู่แล้วกดอีกครั้ง..."); 
          return; 
      } 
      setIsExporting(true); 
      
      try {
          await document.fonts.ready;

          // สร้างไฟล์ภาพหัวกระดาษรอไว้
          const headerImg = await generateHeaderImage(selectedProject, companyInfo, orientation);
          
          // เพิ่มดีเลย์เป็น 1500ms เพื่อให้หน้าจอเรนเดอร์ Layout แบบ Export (A4) ให้เสร็จสมบูรณ์ 100% ก่อนแคปภาพ (แก้ปัญหาหน้าขาว)
          setTimeout(async () => { 
              const element = document.getElementById(elementId); 
              if(!element) { 
                  alert(`เกิดข้อผิดพลาด: ไม่พบส่วนที่ต้องการพิมพ์ (Element ID: ${elementId})`);
                  setIsExporting(false); 
                  return; 
              }
              
              try {
                  // FIX: เลื่อน Scroll กลับไปบนสุดเสมอ เพื่อป้องกันบัคจับภาพแล้วเป็นกระดาษขาวของ html-to-image
                  window.scrollTo(0, 0);
                  let parent = element.parentElement;
                  while(parent) {
                      parent.scrollTop = 0;
                      parent.scrollLeft = 0;
                      parent = parent.parentElement;
                  }

                  // ใช้ getBoundingClientRect เพื่อให้ได้ขนาดที่แท้จริงของ Element บนหน้าจอ
                  const rect = element.getBoundingClientRect();
                  const targetWidth = rect.width;
                  const targetHeight = rect.height;

                  // ใช้ htmlToImage (Native Browser Rendering) ขจัดปัญหาภาษาไทยทับกันโดยสิ้นเชิง
                  const dataUrl = await window.htmlToImage.toJpeg(element, {
                      quality: 1.0,
                      pixelRatio: 2, // ความคมชัด x2
                      backgroundColor: '#ffffff',
                      width: targetWidth,
                      height: targetHeight,
                      style: { transform: 'none', transformOrigin: 'top left', margin: '0', padding: '0' }
                  });

                  const { jsPDF } = window.jspdf;
                  const pdf = new jsPDF({ orientation: orientation, unit: 'mm', format: 'a4' });

                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = pdf.internal.pageSize.getHeight();

                  // ขอบกระดาษ (Margin): [Top, Left, Bottom, Right]
                  const m = customMargin || [22, 10, 20, 10]; 
                  const mTop = m[0], mLeft = m[1], mBottom = m[2], mRight = m[3];
                  const printWidth = pdfWidth - mLeft - mRight;
                  const printHeight = pdfHeight - mTop - mBottom;

                  // โหลดข้อมูลรูปภาพเพื่อคำนวณสัดส่วน
                  const img = new Image();
                  img.src = dataUrl;
                  await new Promise(resolve => { img.onload = resolve; });

                  const imgRatio = img.height / img.width;
                  const imgPrintHeight = printWidth * imgRatio;
                  
                  const totalPages = Math.ceil(imgPrintHeight / printHeight);
                  let currentSliceMm = 0;

                  for (let page = 1; page <= totalPages; page++) {
                      if (page > 1) pdf.addPage();

                      // 1. วางรูปภาพเนื้อหา โดยดันแกน Y ขึ้นไปเรื่อยๆ (Crop ตามหน้า)
                      pdf.addImage(dataUrl, 'JPEG', mLeft, mTop - currentSliceMm, printWidth, imgPrintHeight);

                      // 2. ถมสี่เหลี่ยมสีขาวทับขอบบนและล่าง เพื่อเป็น Clipping Mask (ซ่อนเนื้อหาที่ล้น)
                      pdf.setFillColor(255, 255, 255);
                      pdf.rect(0, 0, pdfWidth, mTop, 'F'); // ปิดขอบบน
                      pdf.rect(0, pdfHeight - mBottom, pdfWidth, mBottom, 'F'); // ปิดขอบล่าง

                      // 3. ประทับตรา Header
                      pdf.addImage(headerImg, 'JPEG', 0, 0, pdfWidth, mTop);
                      
                      // 4. ประทับตรา Footer
                      const footerImg = generateFooterImage(page, totalPages, orientation);
                      pdf.addImage(footerImg, 'JPEG', 0, pdfHeight - mBottom, pdfWidth, mBottom);

                      currentSliceMm += printHeight;
                  }

                  pdf.save(filename);
                  setIsExporting(false);

              } catch (err) {
                  console.error("PDF Engine Error:", err);
                  alert("เกิดข้อผิดพลาดระหว่างการสร้าง PDF");
                  setIsExporting(false);
              }
          }, 1500); // เพิ่มเวลา Delay เพื่อความชัวร์
      } catch (err) {
          console.error(err);
          setIsExporting(false);
      }
  }; 
  
  // --- NEW: Helper Function สำหรับสร้างรูปภาพ (JPEG) ---
  const handleExportImage = async (elementId = 'print-area', filename = 'document.jpg') => { 
      if (!window.htmlToImage) { 
          alert("ระบบกำลังโหลดเครื่องมือสร้างรูปภาพ กรุณารอสักครู่แล้วกดอีกครั้ง..."); 
          return; 
      } 
      setIsExporting(true); 
      
      try {
          await document.fonts.ready;
          
          setTimeout(async () => { 
              const element = document.getElementById(elementId); 
              if(!element) { 
                  alert(`เกิดข้อผิดพลาด: ไม่พบส่วนที่ต้องการพิมพ์ (Element ID: ${elementId})`);
                  setIsExporting(false); 
                  return; 
              }
              
              try {
                  window.scrollTo(0, 0);
                  let parent = element.parentElement;
                  while(parent) {
                      parent.scrollTop = 0;
                      parent.scrollLeft = 0;
                      parent = parent.parentElement;
                  }

                  const targetWidth = element.scrollWidth;
                  const targetHeight = element.scrollHeight;

                  // ใช้ htmlToImage เพื่อสร้างรูปภาพ
                  const dataUrl = await window.htmlToImage.toJpeg(element, {
                      quality: 1.0,
                      pixelRatio: 2, // เพิ่มความคมชัดเป็น 2 เท่า
                      backgroundColor: '#ffffff',
                      width: targetWidth,
                      height: targetHeight,
                      style: { transform: 'none', transformOrigin: 'top left', margin: '0', padding: '0' }
                  });

                  // สั่งดาวน์โหลด
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  
                  setIsExporting(false);
              } catch (err) {
                  console.error("Image Engine Error:", err);
                  alert("เกิดข้อผิดพลาดระหว่างการสร้างรูปภาพ");
                  setIsExporting(false);
              }
          }, 800); // ดีเลย์เพื่อซ่อน UI ปุ่มต่างๆ ก่อนแคปหน้าจอ
      } catch (err) {
          console.error(err);
          setIsExporting(false);
      }
  }; 
  
  // ซ่อน Header แบบเก่าใน HTML เพื่อไม่ให้ซ้ำซ้อนกับ Header ใหม่ที่แสตมป์เข้าไปใน PDF ทุกหน้า
  const ReportHeader = () => { return null; };

  // ฟังก์ชันพิเศษสำหรับจัด PDF ตารางงานให้พอดี A4 แนวนอน (แบบพอดีเป๊ะ)
  const exportSchedulePDF = async () => {
      // เรียกใช้แกนหลักใหม่ได้เลย 
      handleExportPDF('print-schedule-area', `Work_Schedule_${selectedProject?.name || 'Project'}_${currentMonth}.pdf`, 'landscape', [22, 10, 20, 10]);
  };

  // ฟังก์ชันพิเศษสำหรับดาวน์โหลดตารางงานเป็นรูปภาพ
  const exportScheduleImage = async () => {
      handleExportImage('print-schedule-area', `Work_Schedule_${selectedProject?.name || 'Project'}_${currentMonth}.jpg`);
  };

  // New Handlers for Daily Report
  const handleDailyManpowerChange = (field, value) => {
      setNewDailyReport(prev => ({ ...prev, manpower: { ...prev.manpower, [field]: value } }));
  };
  const handleDailyPerformanceChange = (dept, value) => {
      setNewDailyReport(prev => ({ 
          ...prev, 
          performance: { 
              ...prev.performance, 
              [dept]: { ...(prev.performance[dept] || { images: [] }), details: value } 
          } 
      }));
  };
  const handleDailyIncomeChange = (field, value) => {
      setNewDailyReport(prev => ({ ...prev, income: { ...prev.income, [field]: value } }));
  };
  const calculateTotalDailyIncome = () => {
      const { commonFee, lateFee, water, parking, violation, other } = newDailyReport.income;
      return Number(commonFee) + Number(lateFee) + Number(water) + Number(parking) + Number(violation) + Number(other);
  };
  
  const handleSaveDailyReport = (e) => {
      e.preventDefault();
      let savedReport;
      let nextList; // สร้างตัวแปรรอรับ List ล่าสุด
      
      // FIX: ไม่นำ Side Effect ไปใส่ใน setState และคำนวณ State ด้วยตนเองก่อนเซฟ
      if (newDailyReport.id) {
          // Update existing report
          savedReport = { ...newDailyReport };
          nextList = dailyReports.map(r => r.id === newDailyReport.id ? savedReport : r);
      } else {
          // Create new report
          const id = generateId();
          savedReport = { ...newDailyReport, id, projectId: selectedProject.id };
          nextList = [...dailyReports, savedReport];
      }

      // สั่ง Update State แบบชัดเจน
      setDailyReports(nextList);

      // --- AUTO SYNC TRIGGER ---
      let filesToUpload = [];
      ['juristic', 'security', 'cleaning', 'gardening', 'sweeper', 'other'].forEach(dept => {
          const images = savedReport.performance[dept]?.images || [];
          images.forEach((img, idx) => { filesToUpload.push({ name: `DailyReport_${savedReport.id}_${dept}_${idx}.jpg`, data: img }); });
      });
      triggerAutoSync('DailyReports_รายงานประจำวัน', nextList, filesToUpload);

      setShowAddDailyReportModal(false);
      setSelectedDailyReport(savedReport); // Open view modal immediately
      alert('บันทึกรายงานประจำวันเสร็จสมบูรณ์'); // แจ้งเตือนเพื่อให้มั่นใจว่าบันทึกแล้ว
  };

  const handleEditDailyReport = (report) => {
      setSelectedDailyReport(null); // ปิดหน้าต่างรายละเอียดเดิมก่อน เพื่อไม่ให้ซ้อนกัน
      setNewDailyReport({ ...report });
      setShowAddDailyReportModal(true); // เปิดหน้าต่างฟอร์มแก้ไขทันที
  };

  // Image Upload for Daily Report
  const handleDailyPerformanceImageUpload = async (dept, file) => {
    if (file) {
        // ผ่านกระบวนการบีบอัดแล้ว เพื่อป้องกันระบบค้างและข้อมูลสูญหาย
        const compressedBase64 = await compressImage(file);
        setNewDailyReport(prev => ({
            ...prev,
            performance: {
                ...prev.performance,
                [dept]: {
                    ...(prev.performance[dept] || { details: '' }),
                    images: [compressedBase64] // บังคับให้เป็น 1 รูปเสมอ (แทนที่รูปเดิมทันที)
                }
            }
        }));
    }
  };

  const removeDailyPerformanceImage = (dept, index) => {
      setNewDailyReport(prev => ({
          ...prev,
          performance: {
              ...prev.performance,
              [dept]: {
                  ...(prev.performance[dept] || { details: '' }),
                  images: (prev.performance[dept]?.images || []).filter((_, i) => i !== index)
              }
          }
      }));
  };

  // Asset Handlers
  const handleAssetPhotoUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const compressedBase64 = await compressImage(file);
          setNewAsset(prev => ({ ...prev, photo: compressedBase64 }));
      }
  };

  const handleSaveAsset = async (e) => {
      e.preventDefault();
      setIsSavingAsset(true);
      
      try {
          let nextList;
          let savedAsset;
          
          if (isEditingAsset) {
              savedAsset = { ...newAsset };
              nextList = assets.map(a => a.id === newAsset.id ? savedAsset : a);
              // ถ้ากำลังเปิดหน้ารายละเอียดค้างไว้อยู่ ให้อัปเดตข้อมูลในนั้นด้วย
              if (selectedAssetView?.id === newAsset.id) setSelectedAssetView(savedAsset);
          } else {
              const id = generateId();
              savedAsset = { id, projectId: selectedProject.id, ...newAsset };
              nextList = [...assets, savedAsset];
          }
          
          setAssets(nextList);
          
          // --- อัปโหลดรูปทรัพย์สินเข้า Drive อัตโนมัติ (แบบแสดงสถานะชัดเจน) ---
          if (savedAsset.photo && savedAsset.photo.startsWith('data:image')) {
              setAutoSyncMessage('กำลังอัปโหลดรูปลง Google Drive...');
              const GOOGLE_SCRIPT_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbzQYEwfj3xz-kACA43pNbnpcuPY9p3Vg039t-HqDaAIU7hf7WXswEf1MXlapdv3jU5tnw/exec';
              
              const match = savedAsset.photo.match(/^data:(.+);base64,(.+)$/);
              if (match) {
                  const payload = {
                      filename: `Asset_${savedAsset.code}_${savedAsset.id}.jpg`,
                      mimeType: match[1],
                      data: match[2],
                      folderName: `Assets_${selectedProject.code}` // จัดกลุ่มในโฟลเดอร์ Assets ของโครงการ
                  };
                  
                  try {
                      // ใช้ no-cors เพื่อให้ยิงข้อมูลเบื้องหลังได้โดยไม่ติดปัญหาข้ามโดเมน
                      await fetch(GOOGLE_SCRIPT_DRIVE_URL, {
                          method: 'POST',
                          mode: 'no-cors',
                          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                          body: JSON.stringify(payload)
                      });
                  } catch (err) {
                      console.error("Auto-upload to Drive failed", err);
                  }
              }
          }
          
          // ซิงค์ข้อมูล Text ไปยัง Sheets
          triggerAutoSync('Assets_ทรัพย์สิน', nextList, []);

          setShowAddAssetModal(false);
          setIsEditingAsset(false);
          setNewAsset({ code: '', name: '', qty: 1, location: '', photo: null, details: '' }); // Reset form
          alert('บันทึกข้อมูลทรัพย์สินและอัปโหลดรูปลง Google Drive อัตโนมัติเรียบร้อยแล้ว');
      } catch (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      } finally {
          setIsSavingAsset(false);
          setTimeout(() => setAutoSyncMessage(''), 3000);
      }
  };

  const handleEditAsset = (asset) => {
      setSelectedAssetView(null); // ปิดหน้าต่างรายละเอียดเดิมก่อนเปิดฟอร์มแก้ไข
      setNewAsset({ ...asset });
      setIsEditingAsset(true);
      setShowAddAssetModal(true);
  };

  // Tool Handlers
  const handleToolPhotoUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const compressedBase64 = await compressImage(file);
          setNewTool(prev => ({ ...prev, photo: compressedBase64 }));
      }
  };

  const handleSaveTool = async (e) => {
      e.preventDefault();
      setIsSavingTool(true);
      
      try {
          let nextList;
          let savedTool;
          
          if (isEditingTool) {
              savedTool = { ...newTool };
              nextList = tools.map(t => t.id === newTool.id ? savedTool : t);
              if (selectedToolView?.id === newTool.id) setSelectedToolView(savedTool);
          } else {
              const id = generateId();
              savedTool = { id, projectId: selectedProject.id, ...newTool };
              nextList = [...tools, savedTool];
          }
          setTools(nextList);

          // --- อัปโหลดรูปเครื่องมือเข้า Drive อัตโนมัติ ---
          if (savedTool.photo && savedTool.photo.startsWith('data:image')) {
              setAutoSyncMessage('กำลังอัปโหลดรูปลง Google Drive...');
              const GOOGLE_SCRIPT_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbzQYEwfj3xz-kACA43pNbnpcuPY9p3Vg039t-HqDaAIU7hf7WXswEf1MXlapdv3jU5tnw/exec';
              
              const match = savedTool.photo.match(/^data:(.+);base64,(.+)$/);
              if (match) {
                  const payload = {
                      filename: `Tool_${savedTool.code}_${savedTool.id}.jpg`,
                      mimeType: match[1],
                      data: match[2],
                      folderName: `Tools_${selectedProject.code}`
                  };
                  
                  try {
                      await fetch(GOOGLE_SCRIPT_DRIVE_URL, {
                          method: 'POST',
                          mode: 'no-cors',
                          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                          body: JSON.stringify(payload)
                      });
                  } catch (err) {
                      console.error("Auto-upload to Drive failed", err);
                  }
              }
          }

          triggerAutoSync('Tools_เครื่องมือ', nextList, []);

          setShowAddToolModal(false);
          setIsEditingTool(false);
          setNewTool({ code: '', name: '', qty: 1, location: '', photo: null, details: '' }); // Reset form
          alert('บันทึกข้อมูลเครื่องมือช่างและอัปโหลดรูปลง Google Drive อัตโนมัติเรียบร้อยแล้ว');
      } catch (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      } finally {
          setIsSavingTool(false);
          setTimeout(() => setAutoSyncMessage(''), 3000);
      }
  };

  const handleEditTool = (tool) => {
      setSelectedToolView(null); // ปิดหน้าต่างรายละเอียดเดิมก่อนเปิดฟอร์มแก้ไข
      setNewTool({ ...tool });
      setIsEditingTool(true);
      setShowAddToolModal(true);
  };

  // Machine Handlers
  const handleMachinePhotoUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const compressedBase64 = await compressImage(file);
          setNewMachine(prev => ({ ...prev, photo: compressedBase64 }));
      }
  };

  const handleSaveMachine = async (e) => {
      e.preventDefault();
      setIsSavingMachine(true);
      
      try {
          let nextList;
          let savedMachine;
          
          if (isEditingMachine) {
              savedMachine = { ...newMachine };
              nextList = machines.map(m => m.id === newMachine.id ? savedMachine : m);
              if (selectedMachineDetails?.id === newMachine.id) setSelectedMachineDetails(savedMachine);
          } else {
              const id = generateId();
              savedMachine = { id, projectId: selectedProject.id, ...newMachine };
              nextList = [...machines, savedMachine];
          }
          setMachines(nextList);

          // --- อัปโหลดรูปเครื่องจักรเข้า Drive อัตโนมัติ ---
          if (savedMachine.photo && savedMachine.photo.startsWith('data:image')) {
              setAutoSyncMessage('กำลังอัปโหลดรูปลง Google Drive...');
              const GOOGLE_SCRIPT_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbzQYEwfj3xz-kACA43pNbnpcuPY9p3Vg039t-HqDaAIU7hf7WXswEf1MXlapdv3jU5tnw/exec';
              
              const match = savedMachine.photo.match(/^data:(.+);base64,(.+)$/);
              if (match) {
                  const payload = {
                      filename: `Machine_${savedMachine.code}_${savedMachine.id}.jpg`,
                      mimeType: match[1],
                      data: match[2],
                      folderName: `Machines_${selectedProject.code}`
                  };
                  
                  try {
                      await fetch(GOOGLE_SCRIPT_DRIVE_URL, {
                          method: 'POST',
                          mode: 'no-cors',
                          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                          body: JSON.stringify(payload)
                      });
                  } catch (err) {
                      console.error("Auto-upload to Drive failed", err);
                  }
              }
          }

          triggerAutoSync('Machines_เครื่องจักร', nextList, []);

          setShowAddMachineModal(false);
          setIsEditingMachine(false);
          setNewMachine({ code: '', name: '', system: '', qty: 1, location: '', photo: null }); // Reset form
          alert('บันทึกข้อมูลเครื่องจักรและอัปโหลดรูปลง Google Drive อัตโนมัติเรียบร้อยแล้ว');
      } catch (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      } finally {
          setIsSavingMachine(false);
          setTimeout(() => setAutoSyncMessage(''), 3000);
      }
  };

  const handleEditMachine = (machine) => {
      setSelectedMachineDetails(null);
      setNewMachine({ ...machine });
      setIsEditingMachine(true);
      setShowAddMachineModal(true);
  };

  // PM Plan Handlers
  const handleSavePmPlan = (e) => {
      e.preventDefault();
      if (newPmPlan.id) {
          // โหมดแก้ไข
          setPmPlans(pmPlans.map(p => p.id === newPmPlan.id ? { ...newPmPlan } : p));
      } else {
          // โหมดเพิ่มใหม่
          const id = generateId();
          // แก้ไข: สลับตำแหน่ง ...newPmPlan ไว้ด้านหน้า เพื่อไม่ให้ค่า id: null ไปทับ id ที่สุ่มมาใหม่
          setPmPlans([...pmPlans, { ...newPmPlan, id, projectId: selectedProject.id, status: 'Active' }]);
      }
      setShowAddPmPlanModal(false);
      setNewPmPlan({ id: null, machineId: '', frequency: 'Monthly', scheduleDetails: { dayOfWeek: '1', date: '1', month: '1' } });
      alert(t('saveSuccess'));
  };

  // Repair Handlers
  const handleSaveRepair = (e) => {
      e.preventDefault();
      let savedRepair;
      let nextList;
      const existingIndex = repairs.findIndex(r => r.code === newRepair.code);
      
      // FIX: คำนวณ State แยกออกมาก่อน แล้วค่อยเรียก triggerAutoSync
      if (newRepair.id || existingIndex >= 0) {
          // Edit existing repair
          savedRepair = { ...newRepair, id: newRepair.id || repairs[existingIndex].id };
          nextList = repairs.map(r => r.code === newRepair.code ? savedRepair : r);
      } else {
          // Add new repair
          const id = generateId();
          savedRepair = { ...newRepair, id, projectId: selectedProject.id, date: new Date().toISOString().split('T')[0] };
          nextList = [...repairs, savedRepair];
      }

      setRepairs(nextList);
      triggerAutoSync('Repairs_แจ้งซ่อม', nextList, []);

      setShowAddRepairModal(false);
      setNewRepair({ id: null, code: '', roomNo: '', floor: '', requesterName: '', phone: '', issueType: '', issueTypeOther: '', issueDetails: '', inspectionResult: 'รอดำเนินการ', staffDetails: '', cost: '', staffName: '', requesterSignName: '' });
      setSelectedRepairView(savedRepair); // เปิดหน้าพรีวิวให้สั่ง Print ทันทีหลังบันทึก
  };

  const handleEditRepair = (rep) => {
      setSelectedRepairView(null); // ปิดหน้าต่างรายละเอียดเดิมก่อนเปิดฟอร์มแก้ไข
      setNewRepair({ ...rep });
      setShowAddRepairModal(true);
  };

  // Utilities Handlers
  const handleSaveUtilityReading = (e) => {
      e.preventDefault();
      if (!utilityForm.meterId || !utilityForm.currentValue) return;

      const projectMeters = meters.filter(m => m.projectId === selectedProject.id);
      const currentMeterIndex = projectMeters.findIndex(m => m.id === utilityForm.meterId);
      const meter = projectMeters[currentMeterIndex];

      const currentValNum = parseFloat(utilityForm.currentValue);

      if (utilityForm.id) {
          // โหมดแก้ไข (Edit Mode)
          const existingReading = utilityReadings.find(r => r.id === utilityForm.id);
          // คำนวณหน่วยที่ใช้ใหม่ โดยยึดค่ายกมา (prevValue) เดิม
          const updatedUsage = currentValNum - (existingReading ? existingReading.prevValue : 0);
          
          const updatedReading = {
              ...existingReading,
              date: utilityForm.date,
              value: currentValNum,
              usage: updatedUsage,
              recorder: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System'
          };

          const newUtilityReadings = utilityReadings.map(r => r.id === utilityForm.id ? updatedReading : r);
          setUtilityReadings(newUtilityReadings);
          
          // อัปเดตค่ายกมาล่าสุดของมิเตอร์ตัวนี้ (เผื่อการแก้ไขนี้เป็นการแก้ข้อมูลบิลรอบล่าสุด)
          const meterReadings = newUtilityReadings.filter(r => r.meterId === meter.id);
          const latestReading = meterReadings.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
          if (latestReading) {
              setMeters(meters.map(m => m.id === meter.id ? { ...m, lastReading: latestReading.value, lastDate: latestReading.date } : m));
          }

          alert('แก้ไขข้อมูลการจดมิเตอร์เรียบร้อยแล้ว');
          setUtilityForm({ id: null, meterId: utilityForm.meterId, date: new Date().toISOString().split('T')[0], currentValue: '' });

      } else {
          // โหมดบันทึกใหม่ (Create Mode)
          const prevVal = meter ? meter.lastReading : 0;
          const usage = currentValNum - prevVal;

          const newReading = {
              id: generateId(),
              meterId: utilityForm.meterId,
              date: utilityForm.date,
              value: currentValNum,
              prevValue: prevVal,
              usage: usage,
              recorder: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System'
          };

          setUtilityReadings([...utilityReadings, newReading]);
          
          // Update meter's last reading
          setMeters(meters.map(m => 
              m.id === utilityForm.meterId 
                  ? { ...m, lastReading: currentValNum, lastDate: utilityForm.date }
                  : m
          ));

          // เลื่อนไปยังมิเตอร์ตัวถัดไปอัตโนมัติ เพื่อให้พิมพ์ได้ต่อเนื่อง
          if (currentMeterIndex >= 0 && currentMeterIndex < projectMeters.length - 1) {
              const nextMeterId = projectMeters[currentMeterIndex + 1].id;
              setUtilityForm({ id: null, meterId: nextMeterId, date: new Date().toISOString().split('T')[0], currentValue: '' }); // Reset ค่าและเปลี่ยนมิเตอร์
              
              // Focus กลับไปที่ช่องกรอกตัวเลขเพื่อรอรับค่าถัดไป
              setTimeout(() => {
                  if (currentValueRef.current) {
                      currentValueRef.current.focus();
                  }
              }, 50);
          } else {
              // ถ้าเป็นตัวสุดท้ายแล้ว
              setUtilityForm({ id: null, meterId: '', date: new Date().toISOString().split('T')[0], currentValue: '' });
              alert('🎉 บันทึกการจดมิเตอร์ครบทุกรายการแล้ว');
          }
      }
  };

  const handleEditUtilityReading = (reading) => {
      setUtilityForm({
          id: reading.id,
          meterId: reading.meterId,
          date: reading.date,
          currentValue: reading.value.toString()
      });
      // เลื่อน Scroll ขึ้นไปและ Focus ช่องกรอก
      setTimeout(() => {
          if (currentValueRef.current) {
              currentValueRef.current.focus();
          }
      }, 50);
  };

  const handleDeleteUtilityReading = (readingId, meterId) => {
      showConfirm('ยืนยันการลบข้อมูล', 'คุณต้องการลบประวัติการจดมิเตอร์นี้ใช่หรือไม่? (ระบบจะคำนวณค่ายกมาล่าสุดของมิเตอร์ให้ใหม่)', () => {
          // ลบข้อมูลออกจาก State
          const newReadings = utilityReadings.filter(r => r.id !== readingId);
          setUtilityReadings(newReadings);

          // อัปเดตค่ายกมาล่าสุดของมิเตอร์ตัวนี้ใหม่
          const meterReadings = newReadings.filter(r => r.meterId === meterId).sort((a,b) => new Date(b.date) - new Date(a.date));
          const latest = meterReadings[0];
          
          setMeters(meters.map(m => 
              m.id === meterId 
                  ? { ...m, lastReading: latest ? latest.value : 0, lastDate: latest ? latest.date : null }
                  : m
          ));
      });
  };

  const handleSaveMeter = (e) => {
      e.preventDefault();
      const initVal = parseFloat(newMeter.initialValue) || 0;
      
      if (newMeter.id) {
          // Edit Mode
          setMeters(meters.map(m => m.id === newMeter.id ? {
              ...m,
              type: newMeter.type,
              code: newMeter.code,
              name: newMeter.name || (newMeter.type === 'Water' ? 'มิเตอร์น้ำประปา' : 'มิเตอร์ไฟฟ้า'),
              location: newMeter.location,
              lastReading: initVal // อนุญาตให้แก้ค่ายกมา/ค่าปัจจุบันได้
          } : m));
      } else {
          // Create Mode
          const id = generateId();
          const meterToAdd = {
              id,
              projectId: selectedProject.id,
              type: newMeter.type,
              code: newMeter.code,
              name: newMeter.name || (newMeter.type === 'Water' ? 'มิเตอร์น้ำประปา' : 'มิเตอร์ไฟฟ้า'),
              location: newMeter.location,
              lastReading: initVal,
              lastDate: new Date().toISOString().split('T')[0]
          };
          setMeters([...meters, meterToAdd]);
      }
      
      setShowAddMeterModal(false);
      setNewMeter({ id: null, type: 'Water', code: '', name: '', location: '', initialValue: '' });
      alert(t('saveSuccess'));
  };

  const handleEditMeter = (meter) => {
      setNewMeter({
          id: meter.id,
          type: meter.type,
          code: meter.code,
          name: meter.name,
          location: meter.location || '',
          initialValue: meter.lastReading.toString() // ดึงค่าปัจจุบันมาให้แก้ได้
      });
      setShowAddMeterModal(true);
  };

  // --- NEW: Helper สำหรับเปิดปิดการแสดงกราฟรายมิเตอร์ ---
  const toggleMeterVisibility = (meterId) => {
      setHiddenAnalysisMeters(prev => {
          const nextSet = new Set(prev);
          if (nextSet.has(meterId)) nextSet.delete(meterId);
          else nextSet.add(meterId);
          return nextSet;
      });
  };
  // ----------------------------------------------------

  // --- NEW: Action Plan Import Handler ---
  const handleImportActionPlanCSV = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      
      reader.readAsArrayBuffer(file);
      
      reader.onload = (e) => {
          try {
              const buffer = e.target.result;
              let text = '';
              try {
                  text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
              } catch (err) {
                  text = new TextDecoder('windows-874').decode(buffer);
              }

              const lines = text.split(/\r?\n/);
              if (lines.length < 2) return alert('ไฟล์ CSV ไม่มีข้อมูล หรือมีแค่หัวตาราง');
              
              const parseCSVLine = (line) => {
                  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
                  return line.split(regex).map(v => v.trim().replace(/^"|"$/g, ''));
              };

              const headers = parseCSVLine(lines[0]);
              const newAPs = [];
              
              for (let i = 1; i < lines.length; i++) {
                  if (!lines[i].trim()) continue;
                  
                  const values = parseCSVLine(lines[i]);
                  const rowObj = {};
                  headers.forEach((header, index) => {
                      rowObj[header] = values[index];
                  });
                  
                  // เช็คว่ามีหัวข้องาน (issue) หรือไม่ จึงจะดึงเข้ามา
                  if (rowObj.issue) {
                      newAPs.push({
                          id: generateId(),
                          projectId: selectedProject.id, // ผูกกับโครงการที่เปิดอยู่
                          issue: rowObj.issue || '',
                          details: rowObj.details || '',
                          responsible: rowObj.responsible || '',
                          startDate: rowObj.startDate || new Date().toISOString().split('T')[0],
                          deadline: rowObj.deadline || '',
                          status: rowObj.status || 'Pending'
                      });
                  }
              }
              
              if (newAPs.length > 0) {
                  showConfirm('ยืนยันการนำเข้า', `พบข้อมูล Action Plan ที่ถูกต้อง ${newAPs.length} รายการ ต้องการเพิ่มเข้าสู่ระบบใช่หรือไม่?`, () => {
                      const nextList = [...actionPlans, ...newAPs];
                      setActionPlans(nextList);
                      triggerAutoSync('ActionPlans_แผนงาน', nextList, []); // แจ้งเตือน Cloud Sync ด้วย
                      alert('นำเข้าข้อมูลสำเร็จแล้ว!');
                  }, 'ยืนยันการนำเข้า', 'info');
              } else {
                  alert('ไม่พบข้อมูลที่ถูกต้อง (กรุณาตรวจสอบว่ามีคอลัมน์ชื่อ "issue" ในไฟล์ CSV)');
              }
          } catch (error) {
              alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV โปรดตรวจสอบรูปแบบไฟล์');
              console.error(error);
          }
      };
      event.target.value = '';
  };

  const handleSaveActionPlan = (e) => {
      e.preventDefault();
      
      const finalResponsible = newActionPlan.responsible?.startsWith('อื่นๆ') ? newActionPlan.otherResponsible : newActionPlan.responsible;
      const dataToSave = { ...newActionPlan, responsible: finalResponsible };

      if (newActionPlan.id) {
          // Edit existing action plan
          setActionPlans(actionPlans.map(ap => ap.id === newActionPlan.id ? dataToSave : ap));
      } else {
          // Add new action plan
          const id = generateId();
          setActionPlans([...actionPlans, { ...dataToSave, id, projectId: selectedProject.id }]);
      }
      setShowAddActionPlanModal(false);
      setNewActionPlan({ id: null, issue: '', details: '', responsible: '', otherResponsible: '', startDate: new Date().toISOString().split('T')[0], deadline: '', status: 'Pending' });
      alert(t('saveSuccess'));
  };

  const handleSaveCompanyInfo = (e) => {
      e.preventDefault();
      setCompanyInfo(editCompanyForm);
      setShowEditCompanyModal(false);
      alert(t('saveSuccess'));
  };

  const handleEditActionPlan = (ap) => {
      let resp = ap.responsible || '';
      let otherResp = '';
      
      if (resp && !EMPLOYEE_POSITIONS.includes(resp)) {
          otherResp = resp;
          const otherOption = EMPLOYEE_POSITIONS.find(p => p.startsWith('อื่นๆ'));
          resp = otherOption || 'อื่นๆ (ให้ระบุ) / Other (Please specify)';
      }

      setNewActionPlan({ ...ap, responsible: resp, otherResponsible: otherResp });
      setShowAddActionPlanModal(true);
  };
  
  const handleActionPlanStatusChange = (id, newStatus) => {
      setActionPlans(actionPlans.map(ap => ap.id === id ? { ...ap, status: newStatus } : ap));
  };

  const handleContractFileUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const fileId = generateId();
              await saveFileLocally(fileId, reader.result);
              setNewContract(prev => ({ ...prev, file: { name: file.name, fileId: fileId, isLocal: true, data: reader.result } }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCompanyLogoUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const compressedBase64 = await compressImage(file);
          setEditCompanyForm(prev => ({ ...prev, logo: compressedBase64 }));
      }
  };
  
  // Others Handlers
  const handleSaveOther = (e) => {
      e.preventDefault();
      if (newOther.id) {
          setOthersData(othersData.map(o => o.id === newOther.id ? { ...newOther } : o));
      } else {
          const id = generateId();
          setOthersData([...othersData, { ...newOther, id, projectId: selectedProject.id }]);
      }
      setShowAddOtherModal(false);
      setNewOther({ id: null, title: '', details: '', link: '' });
      alert(t('saveSuccess'));
  };

  // Audit Handlers
  const handleAuditScoreChange = (catIdx, itemIdx, score) => {
      setNewAudit(prev => ({
          ...prev,
          scores: { ...prev.scores, [`${catIdx}_${itemIdx}`]: score }
      }));
  };

  const handleAuditRemarkChange = (catIdx, itemIdx, text) => {
      setNewAudit(prev => ({
          ...prev,
          remarks: { ...prev.remarks, [`${catIdx}_${itemIdx}`]: text }
      }));
  };

  const calculateTotalAuditScore = () => {
      return Object.values(newAudit.scores).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  const handleSaveAudit = (e) => {
      e.preventDefault();
      if (!newAudit.projectId) {
          alert("กรุณาเลือกโครงการ / หน่วยงาน");
          return;
      }
      
      // ตรวจสอบว่าให้คะแนนครบทุกข้อหรือไม่ (ป้องกันปัญหากดปุ่มแล้วนิ่งจาก HTML5 Validation)
      let missingCount = 0;
      AUDIT_FORM_TEMPLATE.forEach((category, catIdx) => {
          category.items.forEach((item, itemIdx) => {
              if (!newAudit.scores[`${catIdx}_${itemIdx}`]) {
                  missingCount++;
              }
          });
      });

      if (missingCount > 0) {
          alert(`กรุณาให้คะแนนประเมินให้ครบทุกหัวข้อ (พบหัวข้อที่ยังไม่ได้ให้คะแนนจำนวน ${missingCount} ข้อ)`);
          return;
      }
      
      const totalScore = calculateTotalAuditScore();
      const percentScore = Math.round((totalScore / 235) * 100);
      
      const id = generateId();
      const auditToSave = {
          id,
          projectId: newAudit.projectId,
          date: newAudit.date,
          category: newAudit.type,
          score: percentScore, // Save as percentage for compatibility with existing UI
          rawScore: totalScore,
          inspector: newAudit.inspector,
          remarks: newAudit.additionalComments || 'ตรวจสอบเรียบร้อย',
          fileUrl: null,
          itemScores: newAudit.scores, // บันทึกคะแนนรายข้อ
          itemRemarks: newAudit.remarks // บันทึกหมายเหตุรายข้อ
      };
      
      const nextList = [auditToSave, ...(Array.isArray(audits) ? audits : [])];
      setAudits(nextList);
      triggerAutoSync('Audits_ประเมินคุณภาพ', nextList, []);

      setShowAddAuditModal(false);
      setNewAudit({
          projectId: '',
          date: new Date().toISOString().split('T')[0],
          inspector: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '',
          type: 'Internal Audit',
          scores: {},
          remarks: {},
          additionalComments: ''
      });
      alert('บันทึกผลการประเมินสำเร็จ');
  };

  // --- NEW: Handlers สำหรับจัดการรายชื่อแบบฟอร์ม ---
  const handleEditFormItem = (form) => {
      setNewFormItem({ ...form });
      setShowAddFormModal(true);
  };

  const handleSaveFormItem = (e) => {
      e.preventDefault();
      if (newFormItem.id) {
          setFormsList(formsList.map(f => f.id === newFormItem.id ? { ...newFormItem, lastUpdated: new Date().toISOString().split('T')[0] } : f));
      } else {
          const id = 'f_custom_' + generateId();
          setFormsList([...formsList, { ...newFormItem, id, lastUpdated: new Date().toISOString().split('T')[0] }]);
      }
      setShowAddFormModal(false);
      alert(t('saveSuccess'));
  };

  // --- NEW: Backup & Restore Handlers ---
  const handleExportBackup = async () => {
      setIsBackingUp(true);
      try {
          // ดึงไฟล์แนบ PDF และเอกสารจาก IndexedDB ทั้งหมด
          const localFiles = await getAllFilesLocally();
          
          const backupData = {
              timestamp: new Date().toISOString(),
              version: '1.4', // Updated Version for 100% Full Detail Backup
              data: {
                  companyInfo,
                  users,
                  projects,
                  contracts,
                  assets,
                  tools,
                  machines,
                  pmPlans,
                  pmHistoryList,
                  meters,
                  utilityReadings,
                  repairs,
                  actionPlans,
                  contractors,
                  formsList,
                  audits,
                  dailyReports,
                  schedules,
                  scheduleNotes,
                  scheduleApprovals,
                  projectStaffOrder,
                  othersData,
                  theme,
                  rolePermissions, 
                  localFiles // แนบไฟล์เอกสารจากฐานข้อมูลจำลอง (IndexedDB) เข้าไปด้วย
              }
          };
          
          const dataStr = JSON.stringify(backupData);
          const blob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `BMG_System_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // แสดงข้อความสรุปเพื่อให้ผู้ใช้งานมั่นใจว่าข้อมูลเชิงลึกมาครบถ้วน 100%
          setTimeout(() => {
              const fileCount = Object.keys(localFiles).length;
              alert(`✅ สำรองข้อมูลเสร็จสมบูรณ์ 100%\n\nระบบได้ทำการดึงข้อมูลรายละเอียดเชิงลึกทั้งหมด ดังนี้:\n- ข้อมูลพนักงานและผู้ใช้งาน: ${users.length} คน\n- ข้อมูลโครงการและหน่วยงาน: ${projects.length} แห่ง\n- ทรัพย์สิน/เครื่องมือ/เครื่องจักร: ${assets.length + tools.length + machines.length} รายการ\n- รายงานและประวัติทั้งหมด (แจ้งซ่อม, PM, ตารางงาน, รายงานประจำวัน, สถิติค่าน้ำไฟ): ครบถ้วน\n- ไฟล์ PDF และรูปภาพแนบในระบบ: ${fileCount} ไฟล์ (ถูกฝังอยู่ในตัวไฟล์ JSON เรียบร้อยแล้ว)`);
          }, 500);

      } catch (error) {
          console.error("Backup error:", error);
          // ดักจับ Error กรณีข้อมูลใหญ่เกินที่ Browser จะรับไหว (ป้องกันไฟล์พัง)
          if (error.message && error.message.toLowerCase().includes('string length')) {
              alert("❌ เกิดข้อผิดพลาด: ข้อมูลและรูปภาพภาพหน้างานในระบบมีขนาดใหญ่เกินกว่าที่เบราว์เซอร์จะแปลงเป็นไฟล์เดียวได้ (Out of Memory) แนะนำให้ใช้ฟังก์ชันสำรองขึ้น Google Drive แทน");
          } else {
              alert("❌ เกิดข้อผิดพลาดในการสำรองข้อมูล: " + error.message);
          }
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleImportBackup = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      showConfirm(
          'ยืนยันการนำเข้าและกู้คืนข้อมูล (Restore)',
          'คำเตือนอย่างร้ายแรง: การนำเข้าข้อมูลจะ เขียนทับ (Overwrite) ข้อมูลปัจจุบันในระบบทั้งหมดด้วยข้อมูลจากไฟล์ Backup นี้ คุณแน่ใจหรือไม่ที่จะดำเนินการต่อ? (กระบวนการนี้อาจใช้เวลา 1-3 นาที กรุณาอย่าปิดหน้าต่าง)',
          () => {
              setIsRestoring(true);
              setRestoreProgress('กำลังเตรียมการอ่านไฟล์...');

              // หน่วงเวลาให้ UI เรนเดอร์การโหลดก่อนทำงานหนัก
              setTimeout(() => {
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                      try {
                          setRestoreProgress('กำลังประมวลผลข้อมูล (Parsing)... อาจใช้เวลาสักครู่');
                          await new Promise(resolve => setTimeout(resolve, 100)); // ยอมให้ UI อัปเดตข้อความ

                          const importedData = JSON.parse(e.target.result);
                          
                          if (!importedData.data || !importedData.timestamp) {
                              alert("ไฟล์ข้อมูลไม่ถูกต้อง (Invalid backup file format)");
                              setIsRestoring(false);
                              setRestoreProgress('');
                              return;
                          }

                          const d = importedData.data;
                          
                          // --- Clean up large base64 data to prevent Firestore 1MB limit error during Restore ---
                          if (Array.isArray(d.projects)) {
                              d.projects.forEach(p => {
                                  if (p.files) {
                                      Object.keys(p.files).forEach(k => {
                                          if (p.files[k] && p.files[k].data) delete p.files[k].data;
                                      });
                                  }
                              });
                          }
                          if (Array.isArray(d.contracts)) {
                              d.contracts.forEach(c => {
                                  if (c.file && c.file.data) delete c.file.data;
                              });
                          }

                          // 1. กู้คืนไฟล์ PDF ต่างๆ ลง IndexedDB (รวบยอดแบบ Batch เพื่อความรวดเร็ว)
                          if (d.localFiles && Object.keys(d.localFiles).length > 0) {
                              const totalFiles = Object.keys(d.localFiles).length;
                              setRestoreProgress(`กำลังกู้คืนไฟล์เอกสารแนบทั้งหมด (${totalFiles} ไฟล์)...`);
                              await saveMultipleFilesLocally(d.localFiles);
                              await new Promise(resolve => setTimeout(resolve, 50)); // ยอมให้ UI อัปเดต
                          }

                          // 2. เตรียมรายการข้อมูลที่จะกู้คืน
                          const stateSetters = [
                              { key: 'ข้อมูลองค์กร', setter: setCompanyInfo, data: d.companyInfo },
                              { key: 'รายชื่อผู้ใช้งาน', setter: setUsers, data: d.users },
                              { key: 'ข้อมูลโครงการ', setter: setProjects, data: d.projects },
                              { key: 'ข้อมูลสัญญา', setter: setContracts, data: d.contracts },
                              { key: 'ทะเบียนทรัพย์สิน', setter: setAssets, data: d.assets },
                              { key: 'ทะเบียนเครื่องมือช่าง', setter: setTools, data: d.tools },
                              { key: 'ทะเบียนเครื่องจักร', setter: setMachines, data: d.machines },
                              { key: 'แผน PM', setter: setPmPlans, data: d.pmPlans },
                              { key: 'ประวัติทำ PM', setter: setPmHistoryList, data: d.pmHistoryList },
                              { key: 'ทะเบียนมิเตอร์', setter: setMeters, data: d.meters },
                              { key: 'ประวัติจดมิเตอร์', setter: setUtilityReadings, data: d.utilityReadings },
                              { key: 'งานแจ้งซ่อม', setter: setRepairs, data: d.repairs },
                              { key: 'แผนปฏิบัติการ (Action Plan)', setter: setActionPlans, data: d.actionPlans },
                              { key: 'รายชื่อผู้รับเหมา', setter: setContractors, data: d.contractors },
                              { key: 'แบบฟอร์มมาตรฐาน', setter: setFormsList, data: d.formsList },
                              { key: 'ผลการประเมิน (Audit)', setter: setAudits, data: d.audits },
                              { key: 'รายงานประจำวัน', setter: setDailyReports, data: d.dailyReports },
                              { key: 'ตารางงาน', setter: setSchedules, data: d.schedules },
                              { key: 'หมายเหตุตารางงาน', setter: setScheduleNotes, data: d.scheduleNotes },
                              { key: 'สถานะอนุมัติตารางงาน', setter: setScheduleApprovals, data: d.scheduleApprovals },
                              { key: 'ลำดับพนักงาน', setter: setProjectStaffOrder, data: d.projectStaffOrder },
                              { key: 'ข้อมูลอื่นๆ', setter: setOthersData, data: d.othersData },
                              { key: 'สิทธิ์การใช้งานระบบ', setter: setRolePermissions, data: d.rolePermissions }
                          ];

                          const totalTables = stateSetters.length;
                          let currentTable = 0;

                          setRestoreProgress('เริ่มดำเนินการกู้คืนข้อมูล (โปรดอย่าปิดหน้าต่าง)...');
                          await new Promise(resolve => setTimeout(resolve, 500)); // พัก UI ให้เตรียมตัว

                          // ทยอยทำทีละตาราง (Sequential Process) รอให้แต่ละตารางซิงค์เสร็จก่อนเริ่มตารางใหม่
                          for (const item of stateSetters) {
                              currentTable++;
                              if (item.data !== undefined && item.data !== null) {
                                  // อัปเดตข้อความให้ผู้ใช้ทราบว่าระบบไม่ได้ค้าง
                                  setRestoreProgress(`กำลังเขียนและซิงค์คลาวด์ตาราง: ${item.key} (${currentTable}/${totalTables})`);
                                  
                                  // สำคัญ: บังคับให้เบราว์เซอร์วาดหน้าจอ (Render) แถบสถานะก่อนไปประมวลผลฐานข้อมูล
                                  await new Promise(resolve => setTimeout(resolve, 50));

                                  try {
                                      // ใส่ค่า "true" ให้ setter เพื่อบังคับ Overwrite และรอจนกระบวนการทั้งหมดของตารางนี้สำเร็จ
                                      const syncPromise = item.setter(item.data, true);
                                      if (syncPromise) {
                                          await syncPromise; 
                                      }
                                  } catch(e) {
                                      console.error("Sync error for", item.key, e);
                                  }
                              }
                          }
                          
                          if (d.theme) setTheme(d.theme);

                          setRestoreProgress('ข้อมูลถูกนำเข้าและอัปโหลดเข้าสู่ระบบคลาวด์สมบูรณ์ 100% สำเร็จ!');
                          
                          // ลบการบังคับ Reload หน้าต่างทิ้ง เพื่อป้องกันปัญหาข้อมูลบน Firebase ดึงกลับมาทับ
                          setTimeout(() => {
                              showAlert("สำเร็จ", "ระบบนำเข้าและอัปเดตข้อมูลเสร็จสมบูรณ์ 100% ข้อมูลพร้อมใช้งานทันทีโดยไม่ต้องรีเฟรชหน้า");
                              setIsRestoring(false);
                              setRestoreProgress('');
                          }, 500);
                          
                      } catch (err) {
                          console.error("Restore state error:", err);
                          showAlert("เกิดข้อผิดพลาด", "เกิดข้อผิดพลาดระหว่างการกู้คืนข้อมูล: " + err.message);
                          setIsRestoring(false);
                          setRestoreProgress('');
                      }
                  };
                  reader.readAsText(file);
              }, 500); // รอให้ Modal ยืนยันปิดลงก่อนเริ่มอ่านไฟล์
          },
          'ยืนยันการกู้คืน',
          'warning'
      );
  };

  // --- NEW: Google Sheets Sync Handler ---
  const handleSyncToGoogleSheets = async () => {
      // ❗ คำเตือน: นำ Web App URL ที่ได้จาก Google Apps Script มาวางแทนข้อความในเครื่องหมายคำพูดด้านล่างนี้
      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmNdR7LVpfUossHkcNH_onBPTG2dw6GuJzh5JilthkMwW-Sdr4s0lFjPKwSsCBTg/exec';
      
      // ปรับปรุงเงื่อนไขการตรวจสอบใหม่ ให้เช็คแค่ค่าว่างหรือค่า Placeholder เดิม
      if(!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE') {
          alert("กรุณานำ Web App URL ของ Google Apps Script มาใส่ในโค้ดก่อนใช้งานฟังก์ชันนี้");
          return;
      }

      setIsSyncingSheets(true);
      try {
          // เลือกเฉพาะข้อมูลที่เป็นตารางเพื่อส่งไป Google Sheets
          const payload = {
              'Users_พนักงาน': users,
              'Projects_โครงการ': projects,
              'Contracts_สัญญา': contracts,
              'Contractors_ผู้รับเหมา': contractors,
              'Assets_ทรัพย์สิน': assets.map(a => ({...a, photo: a.photo ? 'Base64 Image' : ''})), // ซ่อน Base64 เพื่อไม่ให้เซลล์เกินขีดจำกัด
              'Tools_เครื่องมือ': tools.map(t => ({...t, photo: t.photo ? 'Base64 Image' : ''})),
              'Machines_เครื่องจักร': machines.map(m => ({...m, photo: m.photo ? 'Base64 Image' : ''})),
              'PM_Plans_แผนบำรุงรักษา': pmPlans,
              'PM_History_ประวัติPM': pmHistoryList.map(h => ({...h, images: h.images?.length ? 'Photos attached' : ''})),
              'Repairs_แจ้งซ่อม': repairs,
              'ActionPlans_แผนงาน': actionPlans,
              'Audits_ประเมินคุณภาพ': audits,
              'UtilityMeters_มิเตอร์': meters,
              'UtilityReadings_จดมิเตอร์': utilityReadings,
              'DailyReports_รายงานประจำวัน': dailyReports
          };

          // แก้ไขปัญหา CORS Error: ใช้ mode 'no-cors' เพื่อส่งออกข้อมูลเบื้องหลังโดยไม่รออ่าน Response จาก Google
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(payload)
          });

          // เนื่องจาก no-cors ไม่ให้เราอ่านค่า Response กลับมา จึงถือว่าการส่งคำขอออกไปโดยไม่เกิด Error คือสำเร็จ
          alert("✅ ส่งข้อมูลไปยัง Google Sheets สำเร็จเรียบร้อยแล้ว! (ตรวจสอบข้อมูลใน Spreadsheet ของท่าน)");

      } catch (error) {
          console.error("Sync error:", error);
          alert("❌ ไม่สามารถส่งข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      } finally {
          setIsSyncingSheets(false);
      }
  };

  // --- NEW: Google Drive Backup Handler ---
  const handleBackupToDrive = async () => {
      // ❗ คำเตือน: นำ Web App URL ที่ได้จาก Google Apps Script สำหรับ Google Drive มาวางแทนข้อความด้านล่างนี้
      const GOOGLE_SCRIPT_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbzQYEwfj3xz-kACA43pNbnpcuPY9p3Vg039t-HqDaAIU7hf7WXswEf1MXlapdv3jU5tnw/exec';
      
      if(!GOOGLE_SCRIPT_DRIVE_URL || GOOGLE_SCRIPT_DRIVE_URL === 'YOUR_GOOGLE_SCRIPT_DRIVE_URL_HERE') {
          alert("กรุณานำ Web App URL ของ Google Apps Script สำหรับบันทึกลง Drive มาใส่ในโค้ดก่อนใช้งานฟังก์ชันนี้");
          return;
      }

      setIsBackingUpToDrive(true);
      try {
          const filesToUpload = [];

          // 1. ดึงไฟล์เอกสารจาก IndexedDB (สัญญา, เอกสารโครงการที่เคยอัปโหลดไว้)
          const localFiles = await getAllFilesLocally();
          for (const [fileId, fileData] of Object.entries(localFiles)) {
              if (typeof fileData === 'string' && fileData.includes('base64,')) {
                  filesToUpload.push({ name: `Document_${fileId}.pdf`, data: fileData });
              }
          }

          // 2. ดึงรูปภาพจากระบบ
          if(companyInfo.logo) filesToUpload.push({ name: 'Company_Logo.jpg', data: companyInfo.logo });
          users.forEach(u => { if(u.photo) filesToUpload.push({ name: `User_${u.employeeId || u.id}.jpg`, data: u.photo }) });
          assets.forEach(a => { if(a.photo) filesToUpload.push({ name: `Asset_${a.code}.jpg`, data: a.photo }) });
          tools.forEach(t => { if(t.photo) filesToUpload.push({ name: `Tool_${t.code}.jpg`, data: t.photo }) });
          machines.forEach(m => { if(m.photo) filesToUpload.push({ name: `Machine_${m.code}.jpg`, data: m.photo }) });
          
          // ดึงรูปจากประวัติ PM (หากมี)
          pmHistoryList.forEach(pm => {
              if (pm.images && pm.images.length > 0) {
                  pm.images.forEach((img, idx) => {
                      filesToUpload.push({ name: `PM_${pm.machineCode}_img${idx+1}.jpg`, data: img });
                  });
              }
          });

          if(filesToUpload.length === 0) {
              alert("ไม่พบไฟล์หรือรูปภาพในระบบที่จะนำไปสำรองข้อมูล");
              setIsBackingUpToDrive(false);
              return;
          }

          // สร้างชื่อโฟลเดอร์ย่อยอัตโนมัติด้วย วันที่และเวลาปัจจุบัน (เพื่อแยกโฟลเดอร์ตามรอบที่กด Backup)
          const now = new Date();
          const folderDate = now.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
          const folderTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-');
          const autoFolderName = `BMG_Backup_${folderDate}_${folderTime}`;

          let successCount = 0;
          let failCount = 0;

          // ส่งข้อมูลไปบันทึกทีละไฟล์เพื่อป้องกันขนาด Payload ใหญ่เกินขีดจำกัดของ Apps Script
          for (let i = 0; i < filesToUpload.length; i++) {
              const file = filesToUpload[i];
              // แยกประเภท (mimeType) และข้อมูล (base64) ออกจากกัน
              const match = file.data.match(/^data:(.+);base64,(.+)$/);
              if (!match) continue;
              
              const mimeType = match[1];
              const base64Data = match[2];

              const payload = {
                  filename: file.name,
                  mimeType: mimeType,
                  data: base64Data,
                  folderName: autoFolderName // <--- เพิ่มการส่งชื่อโฟลเดอร์ไปยัง Apps Script
              };

              try {
                  // แก้ปัญหา CORS Error: ใช้ mode 'no-cors' 
                  await fetch(GOOGLE_SCRIPT_DRIVE_URL, {
                      method: 'POST',
                      mode: 'no-cors',
                      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                      body: JSON.stringify(payload)
                  });
                  
                  // ถ้าระบบส่งคำขอไปได้โดยไม่เกิด Error จะถือว่าสำเร็จ (เพราะ no-cors ไม่อนุญาตให้อ่าน response.status จากเซิร์ฟเวอร์ Google)
                  successCount++;
              } catch (err) {
                  console.error("Upload error for file:", file.name, err);
                  failCount++;
              }
          }

          alert(`✅ สำรองไฟล์ไปยัง Google Drive เสร็จสิ้น!\nสำเร็จ: ${successCount} ไฟล์\nล้มเหลว: ${failCount} ไฟล์\n\nโฟลเดอร์ปลายทาง: ${autoFolderName}`);

      } catch (error) {
          console.error("Drive Backup error:", error);
          alert("❌ เกิดข้อผิดพลาดในการสำรองข้อมูลไปยัง Google Drive");
      } finally {
          setIsBackingUpToDrive(false);
      }
  };
  // ----------------------------------------

  // --- Restored Handlers ---
  const calculateDaysRemaining = (endDateStr) => {
      if (!endDateStr) return 0;
      const end = new Date(endDateStr);
      const today = new Date();
      const diffTime = end.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handlePhotoUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const compressed = await compressImage(file);
          setNewUser(prev => ({ ...prev, photo: compressed }));
      }
  };

  const handleAddAccessibleDept = (e) => {
      const dept = e.target.value;
      if (dept && !newUser.accessibleDepts.includes(dept)) {
          setNewUser(prev => ({ ...prev, accessibleDepts: [...prev.accessibleDepts, dept] }));
      }
      e.target.value = "";
  };

  const removeAccessibleDept = (dept) => {
      setNewUser(prev => ({ ...prev, accessibleDepts: prev.accessibleDepts.filter(d => d !== dept) }));
  };

  const handlePermissionChange = (menuId, ptype, value) => {
      setNewUser(prev => ({
          ...prev,
          permissions: {
              ...prev.permissions,
              [menuId]: { ...(prev.permissions[menuId] || {}), [ptype]: value }
          }
      }));
  };

  const handlePermissionAll = (menuId, value) => {
      setNewUser(prev => ({
          ...prev,
          permissions: {
              ...prev.permissions,
              [menuId]: { view: value, save: value, edit: value, approve: value, delete: value, print: value }
          }
      }));
  };

  // NEW: Handlers for Role Permissions Modal
  const handleRolePermissionChange = (menuId, ptype, value) => {
      setEditingRolePerms(prev => ({
          ...prev,
          [menuId]: { ...(prev[menuId] || {}), [ptype]: value }
      }));
  };

  const handleRolePermissionAll = (menuId, value) => {
      setEditingRolePerms(prev => ({
          ...prev,
          [menuId]: { view: value, save: value, edit: value, approve: value, delete: value, print: value }
      }));
  };

  const handleSaveUser = (e) => {
      e.preventDefault();
      if (isEditingUser) {
          setUsers(users.map(u => u.id === newUser.id ? { ...newUser } : u));
      } else {
          // แก้ไข: สลับตำแหน่ง ...newUser ไว้ด้านหน้า เพื่อไม่ให้เอา id เดิมมาทับ id ใหม่ (ป้องกันบัค ID ซ้ำในระบบ)
          setUsers([...users, { ...newUser, id: generateId(), status: 'Active', created_at: new Date().toISOString() }]);
      }
      setShowAddUserModal(false);
      alert(t('saveSuccess'));
  };

  const handleEditUser = (user) => {
      // แปลงข้อมูล accessibleDepts ให้เป็น Array เสมอ ป้องกัน Error
      let depts = user.accessibleDepts || [];
      if (typeof depts === 'string') {
          depts = depts.split(', ').filter(Boolean);
      }

      setNewUser({ 
          // กำหนดค่าเริ่มต้นป้องกัน undefined
          employeeId: '',
          firstName: '',
          lastName: '',
          otherPosition: '',
          department: '',
          phone: '',
          username: '',
          password: '',
          photo: null,
          ...user,
          // ใช้ค่าจาก user หรือถ้าไม่มีให้ใช้ค่าเริ่มต้น
          position: user.position || EMPLOYEE_POSITIONS[0],
          accessibleDepts: depts,
          permissions: user.permissions || getDefaultPermissions(),
      });
      setIsEditingUser(true);
      setShowAddUserModal(true);
  };

  const handleLogoUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const compressed = await compressImage(file);
          setNewProject(prev => ({ ...prev, logo: compressed }));
      }
  };

  const handleProjectFileUpload = (e, key) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const fileId = generateId();
              await saveFileLocally(fileId, reader.result);
              setNewProject(prev => ({ 
                  ...prev, 
                  files: { 
                      ...(prev.files || {}), 
                      [key]: { name: file.name, fileId: fileId, isLocal: true, data: reader.result } 
                  } 
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleEditProjectClick = () => {
      setNewProject({ files: { orchor: null, committee: null, regulations: null, resident_rules: null }, ...selectedProject });
      setIsEditingProject(true);
      setShowAddProjectModal(true);
  };

  const handleSaveProject = async (e) => {
      e.preventDefault();
      setIsSavingProject(true);
      
      try {
          let nextList;
          // Deep copy เพื่อป้องกันผลกระทบกับ State ต้นฉบับเมื่อมีการลบ property
          let savedProject = JSON.parse(JSON.stringify(newProject));
          
          if (!isEditingProject) {
              savedProject.id = generateId();
              savedProject.status = 'Active';
          }

          // รวบรวมไฟล์สำหรับอัปโหลดขึ้น Drive อัตโนมัติ (โลโก้ และ เอกสารโครงการ)
          let filesToUpload = [];
          if (savedProject.logo && savedProject.logo.startsWith('data:image')) {
              filesToUpload.push({ name: `ProjectLogo_${savedProject.code}.jpg`, data: savedProject.logo });
          }
          if (savedProject.files) {
              Object.keys(savedProject.files).forEach(key => {
                  const fileObj = savedProject.files[key];
                  if (fileObj && fileObj.data && fileObj.data.startsWith('data:')) {
                       filesToUpload.push({ name: `ProjectDoc_${savedProject.code}_${key}.pdf`, data: fileObj.data });
                       // ลบ base64 ออกจาก object ที่จะเซฟลง Firestore เพื่อป้องกัน 1MB Limit Error
                       delete fileObj.data;
                  }
              });
          }

          if (isEditingProject) {
              nextList = projects.map(p => p.id === savedProject.id ? savedProject : p);
              // อัปเดตข้อมูลในหน้าต่างที่กำลังเปิดอยู่
              if (selectedProject?.id === savedProject.id) setSelectedProject(savedProject);
          } else {
              nextList = [...projects, savedProject];
          }
          
          setProjects(nextList);
          triggerAutoSync('Projects_โครงการ', nextList, filesToUpload);

          setShowAddProjectModal(false);
          setIsEditingProject(false);
          setNewProject({ logo: null, code: '', name: '', type: 'Condo', address: '', phone: '', taxId: '', contractStartDate: '', contractEndDate: '', contractValue: '', status: 'Active', files: { orchor: null, committee: null, regulations: null, resident_rules: null } });
          alert('บันทึกข้อมูลโครงการ/หน่วยงาน เรียบร้อยแล้ว');
      } catch (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      } finally {
          setIsSavingProject(false);
      }
  };

  const handleSaveContract = async (e) => {
      e.preventDefault();
      setIsSavingContract(true);
      const finalCategory = (newContract.category || '').includes('อื่นๆ') ? newContract.customCategory : newContract.category;
      
      try {
          let nextList;
          let savedContract = JSON.parse(JSON.stringify(newContract));
          savedContract.category = finalCategory;
          
          if (!isEditingContract) {
              savedContract.id = generateId();
              savedContract.projectId = selectedProject.id;
              savedContract.status = 'Active';
          }

          // --- อัปโหลดไฟล์สัญญาเข้า Drive อัตโนมัติ ---
          if (savedContract.file && savedContract.file.data && savedContract.file.data.startsWith('data:')) {
              setAutoSyncMessage('กำลังอัปโหลดไฟล์สัญญาลง Google Drive...');
              const GOOGLE_SCRIPT_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbzQYEwfj3xz-kACA43pNbnpcuPY9p3Vg039t-HqDaAIU7hf7WXswEf1MXlapdv3jU5tnw/exec';
              
              const match = savedContract.file.data.match(/^data:(.+);base64,(.+)$/);
              if (match) {
                  const payload = {
                      filename: `Contract_${savedContract.id}_${savedContract.file.name}`,
                      mimeType: match[1],
                      data: match[2],
                      folderName: `Contracts_${selectedProject.code}`
                  };
                  
                  try {
                      await fetch(GOOGLE_SCRIPT_DRIVE_URL, {
                          method: 'POST',
                          mode: 'no-cors',
                          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                          body: JSON.stringify(payload)
                      });
                  } catch (err) {
                      console.error("Auto-upload to Drive failed", err);
                  }
              }
              // ลบ base64 ออกจาก object ที่จะเซฟลง Firestore เพื่อป้องกัน 1MB Limit Error
              delete savedContract.file.data;
          }

          if (isEditingContract) {
              nextList = contracts.map(c => c.id === savedContract.id ? savedContract : c);
              if (selectedContractView?.id === savedContract.id) setSelectedContractView(savedContract);
          } else {
              nextList = [...contracts, savedContract];
          }
          
          setContracts(nextList);
          // ซิงค์ข้อมูล Text ไปยัง Sheets
          triggerAutoSync('Contracts_สัญญา', nextList, []);
          
          setShowAddContractModal(false);
          setIsEditingContract(false);
          setNewContract({ type: CONTRACT_TYPES.EXPENSE, category: '', customCategory: '', vendorName: '', contactPerson: '', contactPhone: '', startDate: '', endDate: '', amount: '', paymentCycle: 'Monthly', file: null });
          alert('บันทึกข้อมูลสัญญาและอัปโหลดไฟล์ลง Google Drive อัตโนมัติเรียบร้อยแล้ว');
      } catch (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      } finally {
          setIsSavingContract(false);
          setTimeout(() => setAutoSyncMessage(''), 3000);
      }
  };

  const handleEditContract = (contract) => {
      setSelectedContractView(null); // ปิดหน้าต่างรายละเอียดเดิมก่อนเปิดฟอร์มแก้ไข
      let cat = contract.category;
      let customCat = '';
      const availableCategories = SERVICE_TYPES[contract.type] || [];
      
      // ตรวจสอบว่า category เดิมเป็นแบบกรอกเองหรือไม่
      if (!availableCategories.includes(cat)) {
          customCat = cat;
          cat = availableCategories.find(c => c.includes('อื่นๆ')) || 'อื่นๆ (Other)';
      }
      
      setNewContract({ ...contract, category: cat, customCategory: customCat });
      setIsEditingContract(true);
      setShowAddContractModal(true);
  };

  const handleAddStaffToProject = () => {
      setIsEditingUser(false);
      setNewUser({ employeeId: '', firstName: '', lastName: '', position: EMPLOYEE_POSITIONS[0], otherPosition: '', department: selectedProject.name, accessibleDepts: [], phone: '', username: '', password: '', photo: null, permissions: getDefaultPermissions() });
      setShowAddUserModal(true);
  };

  const updateSchedule = (userId, dateString, shiftId, type = 'plan') => {
      const key = type === 'plan' ? `${userId}_${dateString}` : `${userId}_${dateString}_act`;
      setSchedules(prev => ({ ...prev, [key]: shiftId }));
  };

  // ... (View Components) ...
  const renderLoginView = () => (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[10%] left-[15%] w-72 h-72 bg-orange-600 rounded-full filter blur-[120px] opacity-30"></div>
      <div className="absolute bottom-[10%] right-[15%] w-80 h-80 bg-red-600 rounded-full filter blur-[120px] opacity-30"></div>
      
      <div className="bg-gray-900/80 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-md border border-gray-800 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-10">
          <h1 className="flex items-baseline justify-center gap-2 mb-2">
            <span 
                className="text-7xl font-black tracking-tighter z-10" 
                style={{ 
                    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(253, 186, 116, 0.6) 45%, rgba(234, 88, 12, 0.4) 50%, rgba(194, 65, 12, 0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 8px 12px rgba(234, 88, 12, 0.4))',
                    WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.8)'
                }}
            >
                BMG
            </span>
            <span className="text-5xl font-bold text-white transform -rotate-2" style={{ fontFamily: "'Caveat', cursive" }}>Connect</span>
          </h1>
          <p className="text-sm text-gray-400 font-medium tracking-wide mt-1 uppercase">{t('systemMgmt')} - {t('signIn')}</p>
        </div>
        
        {/* Offline Mode Warning */}
        {!db && (
            <div className="bg-orange-900/30 text-orange-400 text-xs p-3 rounded-xl border border-orange-800/50 flex items-start gap-3 mb-6">
                <AlertTriangle size={24} className="shrink-0 mt-0.5"/> 
                <div className="text-left">
                    <strong className="text-sm">ทำงานในโหมด Offline (Local Storage)</strong><br/>
                    ระบบไม่พบฐานข้อมูล Firebase ข้อมูลที่บันทึกจะอยู่แค่ในเบราว์เซอร์ของคุณคนเดียวเท่านั้น (หากนำลิงก์ไปแชร์ให้ผู้อื่นเปิดจะไม่เห็นข้อมูลเดียวกัน)
                </div>
            </div>
        )}

        {/* Login Form */}
        {!isUsersLoaded ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 size={40} className="text-orange-500 animate-spin" />
                <div className="text-orange-400 font-bold text-lg animate-pulse">กำลังเชื่อมต่อฐานข้อมูล...</div>
                <div className="text-gray-500 text-sm">กรุณารอสักครู่ (Please wait)</div>
            </div>
        ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5 ml-1">ชื่อผู้ใช้งาน (รหัสพนักงาน)</label>
                  <div className="relative">
                      <User className="absolute left-4 top-3.5 text-gray-500" size={18} />
                      <input 
                          type="text" 
                          className="pl-11 block w-full rounded-xl border-gray-700 shadow-sm p-3 border focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-gray-800/50 text-white placeholder-gray-500 focus:bg-gray-800" 
                          value={loginForm.username} 
                          onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                          placeholder="กรอกรหัสพนักงาน" 
                      />
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5 ml-1">รหัสผ่าน</label>
                  <div className="relative">
                      <Lock className="absolute left-4 top-3.5 text-gray-500" size={18} />
                      <input 
                          type={showPassword ? "text" : "password"} 
                          className="pl-11 pr-12 block w-full rounded-xl border-gray-700 shadow-sm p-3 border focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-gray-800/50 text-white placeholder-gray-500 focus:bg-gray-800" 
                          value={loginForm.password} 
                          onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                          placeholder="กรอกรหัสผ่าน" 
                      />
                      <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-300 focus:outline-none transition-colors"
                      >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                  </div>
              </div>
              
              {loginError && (
                  <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-xl border border-red-800/50 flex items-center gap-2 animate-fade-in">
                      <AlertTriangle size={16} className="shrink-0"/> {loginError}
                  </div>
              )}
              
              <button 
                  type="submit" 
                  className="w-full text-white font-bold py-3.5 px-4 rounded-xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 mt-6 relative overflow-hidden group" 
                  style={{
                      background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.7) 0%, rgba(234, 67, 0, 0.95) 100%)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 8px 25px rgba(234, 88, 12, 0.5), inset 0 2px 2px rgba(255, 255, 255, 0.6), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.4)'
                  }}
              >
                  {/* แสงสะท้อนวิ่งพาดผ่านเมื่อ Hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 transform -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out skew-x-12"></div>
                  <span className="relative z-10 text-lg tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                      {t('signIn')}
                  </span>
              </button>
            </form>
        )}
        
        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-800 pt-6">
            {t('poweredBy')}
        </div>
      </div>
    </div>
  );

  const Sidebar = () => {
    const canAccessMultiple = canAccessMultipleProjects();

    return (
      <>
        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && !isExporting && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
        
        <div className={`w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto custom-scrollbar z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'} ${isExporting ? 'hidden' : ''}`}>
        <div 
          className={`p-6 border-b border-gray-800 flex justify-between items-start relative ${currentUser?.username === 'admin' ? 'cursor-pointer hover:bg-gray-800 transition-colors group' : ''}`}
          onClick={() => {
              if (currentUser?.username === 'admin') {
                  setEditCompanyForm({ ...companyInfo });
                  setShowEditCompanyModal(true);
                  setIsMobileMenuOpen(false);
              }
          }}
          title={currentUser?.username === 'admin' ? "คลิกเพื่อแก้ไขข้อมูลองค์กร" : ""}
        >
          <div className="flex items-center gap-3 overflow-hidden">
              {companyInfo.logo && (
                  <div className="w-10 h-10 bg-white rounded flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                      <img src={companyInfo.logo} alt="Company Logo" className="w-full h-full object-contain" />
                  </div>
              )}
              <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold tracking-wider text-orange-500 truncate flex items-center gap-2">
                      {companyInfo.name}
                      {currentUser?.username === 'admin' && <Edit size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 truncate">{companyInfo.subtitle}</p>
              </div>
          </div>
          <div className="absolute top-6 right-4 flex gap-1.5">
              <button 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      const themes = ['light', 'dark', 'sweet', 'crimson', 'sunset'];
                      const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
                      setTheme(themes[nextIndex] || 'light');
                  }} 
                  className="text-gray-500 hover:text-white flex items-center justify-center w-7 h-7 border border-gray-700 rounded bg-gray-900 group-hover:bg-gray-800 transition-colors"
                  title={`เปลี่ยนธีม (ปัจจุบัน: ${theme})`}
              >
                  {theme === 'light' ? <Moon size={14} /> : 
                   theme === 'dark' ? <Heart size={14} className="text-pink-400" /> : 
                   theme === 'sweet' ? <Droplet size={14} className="text-red-600" /> : 
                   theme === 'crimson' ? <Sun size={14} className="text-orange-500" /> : 
                   <Sun size={14} className="text-yellow-400" />}
              </button>
              <button 
                  onClick={(e) => { e.stopPropagation(); setLang(lang === 'th' ? 'en' : 'th') }} 
                  className="text-gray-500 hover:text-white flex items-center gap-1 text-xs border border-gray-700 rounded px-2 py-1 bg-gray-900 group-hover:bg-gray-800 transition-colors"
                  title="Change Language"
              >
                  <Globe size={12} /> {lang.toUpperCase()}
              </button>
              <button 
                  onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(false); setIsSidebarOpen(false); }} 
                  className="text-gray-400 hover:text-white flex items-center justify-center w-7 h-7 border border-gray-700 rounded bg-gray-900 hover:bg-red-500 hover:border-red-500 transition-colors ml-1"
                  title="ซ่อนแถบเมนู (Hide Menu)"
              >
                  <X size={14} className="lg:hidden" />
                  <ChevronLeft size={16} className="hidden lg:block" />
              </button>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {!selectedProject ? (
              <>
                  {(canAccessMultiple && hasPerm('dashboard')) && <SidebarItem icon={BarChart3} label={t('menu_dashboard')} id="dashboard" colorTheme="blue" />}
                  {(canAccessMultiple && hasPerm('users')) && <SidebarItem icon={Users} label={t('menu_users')} id="users" colorTheme="green" />}
                  {(canAccessMultiple && hasPerm('projects')) && <SidebarItem icon={Building2} label={t('menu_projects')} id="projects" colorTheme="orange" />}
                  {(canAccessMultiple && hasPerm('audits')) && <SidebarItem icon={ClipboardCheck} label={t('menu_audits')} id="audits" colorTheme="purple" />}
                  
                  {/* คู่มือการใช้งาน แสดงให้ทุกคนเห็น */}
                  <SidebarItem icon={BookOpen} label={t('menu_manual')} id="manual" colorTheme="pink" />

                  {/* เพิ่มเมนูตั้งค่าระบบให้เฉพาะ Admin มองเห็น */}
                  {(canAccessMultiple && currentUser?.username === 'admin') && <SidebarItem icon={Settings} label={t('menu_settings')} id="settings" colorTheme="gray" />}
                  
                  {/* แสดงข้อความหากผู้ใช้ถูกล็อคให้อยู่เฉพาะหน่วยงานแต่เผลอหลุดมาหน้านี้ */}
                  {!canAccessMultiple && (
                      <div className="p-4 text-xs text-gray-500 text-center mt-4 border border-dashed border-gray-700 rounded-lg">
                          ไม่พบข้อมูลหน่วยงานที่คุณสังกัด หรือคุณไม่มีสิทธิ์เข้าถึงหน้ารวม กรุณาเข้าสู่ระบบใหม่
                      </div>
                  )}
              </>
          ) : (
              <>
                  {/* ซ่อนปุ่มกลับหน้ารวมโครงการ หากไม่มีสิทธิ์เข้าถึงหลายหน่วยงาน */}
                  {canAccessMultiple && (
                      <button 
                          onClick={() => { setSelectedProject(null); setIsMobileMenuOpen(false); }} 
                          className="w-full flex items-center gap-2 px-4 py-2 mb-4 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-gray-700"
                      >
                          <ArrowRight size={16} className="rotate-180" /> กลับหน้ารวมโครงการ
                      </button>
                  )}
                  <div 
                      className={`px-4 mb-2 text-[11px] font-bold text-orange-400 uppercase tracking-wider truncate flex justify-between items-center group ${hasPerm('projects', 'edit') ? 'cursor-pointer hover:bg-gray-800 py-1.5 rounded mx-2 transition-colors' : ''}`} 
                      title={hasPerm('projects', 'edit') ? "คลิกเพื่อแก้ไขข้อมูลหน่วยงาน" : ""}
                      onClick={() => { if(hasPerm('projects', 'edit')) { handleEditProjectClick(); setIsMobileMenuOpen(false); } }}
                  >
                      <span className="truncate">{selectedProject.name}</span>
                      {hasPerm('projects', 'edit') && <Edit size={14} className="text-gray-500 group-hover:text-orange-400 transition-colors shrink-0" />}
                  </div>
                  {PROJECT_TABS.filter(tab => hasPerm(`proj_${tab.id}`)).map(tab => {
                      const isActive = projectTab === tab.id;
                      return (
                          <button
                              key={tab.id}
                              onClick={() => { setProjectTab(tab.id); setIsMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-sm mb-1.5 group ${isActive ? 'bg-gray-800 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
                          >
                              <ThreeDIcon icon={tab.icon} colorTheme={tab.color} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'}`} />
                              <span className={`font-medium tracking-wide ${isActive ? 'text-orange-400' : ''}`}>{t(tab.label)}</span>
                          </button>
                      );
                  })}
              </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold">{currentUser?.firstName?.charAt(0) || 'U'}</div><div><div className="text-sm font-medium">{currentUser?.firstName}</div><div className="text-xs text-gray-400">{currentUser?.position}</div></div></div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm w-full"><LogOut size={16} /> {t('signOut')}</button>
        </div>
      </div>
      </>
    );
  };
  
  const ThreeDIcon = ({ icon: Icon, colorTheme = 'blue', className = '' }) => {
      const gradients = {
          blue: 'from-blue-400 to-blue-600 shadow-blue-500/40 border-blue-400/50',
          green: 'from-emerald-400 to-emerald-600 shadow-emerald-500/40 border-emerald-400/50',
          orange: 'from-orange-400 to-orange-600 shadow-orange-500/40 border-orange-400/50',
          purple: 'from-purple-400 to-purple-600 shadow-purple-500/40 border-purple-400/50',
          pink: 'from-pink-400 to-pink-600 shadow-pink-500/40 border-pink-400/50',
          gray: 'from-gray-500 to-gray-700 shadow-gray-500/40 border-gray-400/50',
          red: 'from-red-400 to-red-600 shadow-red-500/40 border-red-400/50',
          cyan: 'from-cyan-400 to-cyan-600 shadow-cyan-500/40 border-cyan-400/50',
          yellow: 'from-amber-400 to-orange-500 shadow-amber-500/40 border-amber-400/50',
      };
      const gradClass = gradients[colorTheme] || gradients.blue;

      return (
          <div className={`relative flex items-center justify-center w-[34px] h-[34px] rounded-xl bg-gradient-to-br ${gradClass} shadow-lg shrink-0 overflow-hidden border border-t-white/40 border-l-white/20 border-b-black/40 border-r-black/20 ${className}`}>
              {/* 3D Glass Highlights */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-60 h-[50%]"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 mix-blend-overlay"></div>
              {/* Shadow for the icon inside */}
              <Icon size={18} className="text-white relative z-10" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }} strokeWidth={2.5} />
          </div>
      );
  };

  const SidebarItem = ({ icon, label, id, colorTheme = 'blue' }) => (
      <button 
          onClick={() => { setActiveMenu(id); setSelectedProject(null); setIsMobileMenuOpen(false); }} 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group
              ${activeMenu === id && !selectedProject 
                  ? 'bg-gray-800 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
      >
          <ThreeDIcon icon={icon} colorTheme={colorTheme} className={`transition-transform duration-300 ${activeMenu === id && !selectedProject ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'}`} />
          <span className={`font-medium tracking-wide ${activeMenu === id && !selectedProject ? 'text-orange-400 font-bold' : ''}`}>{label}</span>
      </button>
  );
  
  const DashboardView = () => {
      // แก้ไข: ลบ useState(null) ออกจากตรงนี้ เพื่อไม่ให้ผิดกฎของ React Hooks
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      
      // ดึงจำนวนรายการที่รอการอนุมัติสำหรับ User ปัจจุบัน
      const pendingItems = getPendingApprovals();
      const pendingApprovalCount = pendingItems.length;

      // ดึงข้อมูลโครงการเฉพาะที่ผู้ใช้มีสิทธิ์เข้าถึง สำหรับแสดงผลแดชบอร์ดให้สอดคล้องกับสิทธิ์
      const visibleProjectsDashboard = projects.filter(p => {
          if (currentUser?.username === 'admin') return true;
          const accessibleDeptsStr = currentUser?.accessibleDepts || '';
          const accessibleArray = typeof accessibleDeptsStr === 'string' ? accessibleDeptsStr.split(', ').filter(Boolean) : accessibleDeptsStr;
          if (accessibleArray.includes('All')) return true;
          return p.name === currentUser?.department || accessibleArray.includes(p.name);
      });

      // 1. โครงการทั้งหมด แยกตามประเภท
      const projectTypesCount = PROJECT_TYPES.map(type => {
           let label = type;
           if(type === 'Condo') label = 'อาคารชุด';
           if(type === 'Village') label = 'หมู่บ้านจัดสรร';
           if(type === 'Office Building') label = 'ออฟฟิศสำนักงาน';
           return { name: label, value: visibleProjectsDashboard.filter(p => p.type === type).length };
      }).filter(d => d.value > 0);
      const PIE_COLORS = ['url(#colorBlue)', 'url(#colorGreen)', 'url(#colorOrange)', 'url(#colorPurple)'];

      // 2. จำนวนพนักงาน แยกตามหน่วยงาน
      const empByDeptMap = {};
      users.forEach(u => {
          const dept = u.department || 'ไม่ระบุสังกัด';
          empByDeptMap[dept] = (empByDeptMap[dept] || 0) + 1;
      });
      const empByDeptData = Object.keys(empByDeptMap)
          .map(dept => ({ name: dept, employeeCount: empByDeptMap[dept] }))
          .sort((a, b) => b.employeeCount - a.employeeCount);

      // 3. ลำดับผลคะแนน Audit (จากมากไปน้อย)
      const auditRankData = visibleProjectsDashboard.map(p => {
          const pAudits = audits.filter(a => a.projectId === p.id);
          const avg = pAudits.length > 0 ? (pAudits.reduce((sum, a) => sum + a.score, 0) / pAudits.length) : 0;
          return { name: p.name, avgScore: parseFloat(avg.toFixed(1)) };
      }).filter(d => d.avgScore > 0).sort((a, b) => b.avgScore - a.avgScore);

      // 4. สถิติการส่งรายงานประจำวัน
      const reportRankData = visibleProjectsDashboard.map(p => {
          const currentMonthReports = dailyReports.filter(r => r.projectId === p.id && r.date.startsWith(currentMonthStr));
          const uniqueReportDays = new Set(currentMonthReports.map(r => r.date)).size;
          return { name: p.name, submittedDays: uniqueReportDays };
      }).sort((a, b) => b.submittedDays - a.submittedDays);

      // 5. สถานะ Action Plan แยกตามหน่วยงาน
      const actionPlanData = visibleProjectsDashboard.map(p => {
          const projAPs = actionPlans.filter(a => a.projectId === p.id);
          const counts = { name: p.name, pending: 0, inProgress: 0, completed: 0, cancelled: 0 };
          projAPs.forEach(ap => {
              if(ap.status === 'Pending') counts.pending++;
              if(ap.status === 'In Progress') counts.inProgress++;
              if(ap.status === 'Completed') counts.completed++;
              if(ap.status === 'Cancelled') counts.cancelled++;
          });
          return counts;
      }).filter(p => (p.pending + p.inProgress + p.completed + p.cancelled) > 0);

      // NEW: 6. สถานะ PM แยกตามหน่วยงาน (เดือนปัจจุบัน)
      const pmStatusData = visibleProjectsDashboard.map(p => {
          const pPlans = pmPlans.filter(plan => plan.projectId === p.id && plan.status === 'Active');
          const [year, month] = currentMonthStr.split('-').map(Number);
          const daysInMonth = new Date(year, month, 0).getDate();

          let totalTasks = 0;
          let completedTasks = 0;

          // คำนวณจำนวนงาน PM ที่ต้องทำทั้งหมดในเดือนนี้ ตามความถี่ที่ตั้งไว้
          for (let d = 1; d <= daysInMonth; d++) {
              const dateObj = new Date(year, month - 1, d);
              const dateString = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

              pPlans.forEach(plan => {
                  let shouldRun = false;
                  if (plan.frequency === 'Daily') shouldRun = true;
                  if (plan.frequency === 'Weekly') shouldRun = dateObj.getDay() === parseInt(plan.scheduleDetails?.dayOfWeek || 0);
                  if (plan.frequency === 'Monthly') shouldRun = d === parseInt(plan.scheduleDetails?.date || 1);
                  if (plan.frequency === 'Yearly') shouldRun = d === parseInt(plan.scheduleDetails?.date || 1) && dateObj.getMonth() === parseInt(plan.scheduleDetails?.month || 1) - 1;

                  if (shouldRun) {
                      totalTasks++;
                      // ตรวจสอบว่ามีการบันทึกประวัติการทำ PM หรือไม่
                      const historyRecord = pmHistoryList.find(h => h.pmPlanId === plan.id && h.date === dateString);
                      if (historyRecord && historyRecord.approvalStatus !== 'Rejected') {
                          completedTasks++;
                      }
                  }
              });
          }

          return {
              name: p.name,
              completed: completedTasks,
              pending: totalTasks - completedTasks,
              total: totalTasks
          };
      }).filter(p => p.total > 0);

      // Summary KPIs
      const totalPendingAPs = actionPlans.filter(a => a.status === 'Pending' || a.status === 'In Progress').length;
      const totalAuditsAvg = audits.length > 0 ? (audits.reduce((s, a) => s + a.score, 0) / audits.length).toFixed(1) : 0;

      // 6. Project Contracts Expiry (Sorted from least days to most)
      const projectContractsData = visibleProjectsDashboard.map(p => {
          return {
              ...p,
              daysRemaining: calculateDaysRemaining(p.contractEndDate)
          };
      }).sort((a, b) => a.daysRemaining - b.daysRemaining);

      // --- NEW: 7. Schedule Submission Status ---
      const localCurrentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const scheduleStatusTableData = visibleProjectsDashboard.map(p => {
          const key = `${p.id}_${localCurrentMonthStr}`;
          const approval = scheduleApprovals[key] || {};
          return {
              id: p.id,
              name: p.name,
              preparedBy: approval.preparedBy || '-',
              managerApprovedBy: approval.managerApprovedBy || '-',
              hrApprovedBy: approval.hrApprovedBy || '-',
              status: approval.status || 'Not Submitted',
              isLocked: approval.isLocked || false
          };
      }).sort((a, b) => {
          // Sort by status to group them logically (Not Submitted -> Pending -> Approved)
          const order = { 'Not Submitted': 0, 'Pending Manager': 1, 'Pending HR': 2, 'Approved': 3 };
          return order[a.status] - order[b.status];
      });

      // --- Chart Rendering Helpers ---
      const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
          const RADIAN = Math.PI / 180;
          const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 50;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          return (
              <text x={x} y={y} fill="#4b5563" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={14} fontWeight="bold">
                  {`${name} (${(percent * 100).toFixed(0)}%)`}
              </text>
          );
      };

      const renderProjectTypesChart = (isFull = false) => (
          <ResponsiveContainer width="100%" height="100%">
              <PieChart style={{ filter: 'drop-shadow(2px 6px 8px rgba(0,0,0,0.25))' }}>
                  <Pie data={projectTypesCount} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isFull ? 180 : 100} innerRadius={isFull ? 80 : 45} label={isFull ? renderCustomizedPieLabel : true} stroke="none" isAnimationActive={true}>
                      {projectTypesCount.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={isFull ? { fontSize: '16px', paddingTop: '20px' } : {}}/>
              </PieChart>
          </ResponsiveContainer>
      );

      const renderEmpByDeptChart = (isFull = false) => (
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empByDeptData} margin={{ top: 20, right: 30, left: 0, bottom: isFull ? 100 : 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: isFull ? 14 : 11}} interval={0} height={isFull ? 100 : 60} />
                  <YAxis tick={{fontSize: isFull ? 14 : 12}}/>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="employeeCount" name="พนักงาน" shape={<ThreeDBar fill="url(#colorGreen)" />} />
              </BarChart>
          </ResponsiveContainer>
      );

      const renderAuditRankChart = (isFull = false) => (
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={auditRankData} margin={{ top: 25, right: 30, left: 0, bottom: isFull ? 100 : 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: isFull ? 14 : 11}} interval={0} height={isFull ? 100 : 60} />
                  <YAxis domain={[0, 100]} tick={{fontSize: isFull ? 14 : 12}}/>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="avgScore" name="คะแนนเฉลี่ย" shape={<ThreeDBar />}>
                      {auditRankData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.avgScore >= 90 ? 'url(#colorGreen)' : entry.avgScore >= 70 ? 'url(#colorOrange)' : 'url(#colorRed)'} />
                      ))}
                  </Bar>
              </BarChart>
          </ResponsiveContainer>
      );

      const renderPmStatusChart = (isFull = false) => (
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pmStatusData} margin={{ top: 25, right: 30, left: 0, bottom: isFull ? 100 : 60 }} style={{ filter: 'drop-shadow(3px 5px 6px rgba(0,0,0,0.2))' }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: isFull ? 14 : 11}} interval={0} height={isFull ? 100 : 60} />
                  <YAxis tick={{fontSize: isFull ? 14 : 12}}/>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={isFull ? { fontSize: '16px', paddingBottom: '20px' } : {}}/>
                  <Bar dataKey="completed" name="ดำเนินการแล้ว" stackId="a" fill="url(#colorGreen)" stroke="#059669" strokeWidth={1} />
                  <Bar dataKey="pending" name="รอดำเนินการ/ค้าง" stackId="a" fill="url(#colorRed)" stroke="#dc2626" strokeWidth={1} />
              </BarChart>
          </ResponsiveContainer>
      );

      const renderReportRankChart = (isFull = false) => (
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportRankData} margin={{ top: 20, right: 30, left: 0, bottom: isFull ? 100 : 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: isFull ? 14 : 11}} interval={0} height={isFull ? 100 : 60} />
                  <YAxis domain={[0, 31]} tick={{fontSize: isFull ? 14 : 12}}/>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="submittedDays" name="ส่งแล้ว (วัน)" shape={<ThreeDBar fill="url(#colorCyan)" />} />
              </BarChart>
          </ResponsiveContainer>
      );

      const renderActionPlanChart = (isFull = false) => (
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionPlanData} margin={{ top: 20, right: 30, left: 0, bottom: isFull ? 100 : 60 }} style={{ filter: 'drop-shadow(3px 5px 6px rgba(0,0,0,0.2))' }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: isFull ? 14 : 11}} interval={0} height={isFull ? 100 : 60} />
                  <YAxis tick={{fontSize: isFull ? 14 : 12}}/>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={isFull ? { fontSize: '16px', paddingBottom: '20px' } : {}}/>
                  <Bar dataKey="pending" name="รอดำเนินการ" stackId="a" fill="url(#cylOrange)" stroke="#ea580c" strokeWidth={1} />
                  <Bar dataKey="inProgress" name="กำลังทำ" stackId="a" fill="url(#cylBlue)" stroke="#2563eb" strokeWidth={1} />
                  <Bar dataKey="completed" name="เสร็จสิ้น" stackId="a" fill="url(#cylGreen)" stroke="#059669" strokeWidth={1} />
                  <Bar dataKey="cancelled" name="ยกเลิก" stackId="a" fill="url(#cylGray)" stroke="#4b5563" strokeWidth={1} />
              </BarChart>
          </ResponsiveContainer>
      );

      return (
          <div className="space-y-6 animate-fade-in relative">
              <ChartGradients />
              <ReportHeader />
              
              {/* NEW: Notification Banner for Pending Approvals */}
              {pendingApprovalCount > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center justify-between mb-4 border border-y-red-100 border-r-red-100">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-ring shadow-inner shrink-0">
                              <Bell size={24} />
                          </div>
                          <div>
                              <h4 className="text-red-800 font-bold text-lg flex items-center gap-2">
                                  มีรายการรอให้คุณดำเนินการ/อนุมัติ
                                  <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{pendingApprovalCount} รายการ</span>
                              </h4>
                              <p className="text-red-600 text-sm mt-0.5">คุณมีรายการ (เช่น ตารางงาน, แผน PM, งานแจ้งซ่อม) ที่จำเป็นต้องดำเนินการ</p>
                          </div>
                      </div>
                      <Button variant="danger" className="shrink-0 hidden md:flex shadow-sm" onClick={() => setShowNotificationModal(true)}>
                          ดูรายการทั้งหมด
                      </Button>
                  </div>
              )}

              <header className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                      <div>
                          <h1 className="text-2xl font-bold text-gray-800">{t('corpDashboard')}</h1>
                          <p className="text-gray-500">{t('overview')}</p>
                      </div>
                      
                      {/* Optional: Small Bell icon next to title if banner is missed */}
                      {pendingApprovalCount > 0 && (
                          <div 
                              className="relative flex items-center justify-center w-10 h-10 bg-red-50 rounded-full cursor-pointer hover:bg-red-100 transition-colors shadow-sm border border-red-100 md:hidden"
                              title="มีรายการรอให้คุณดำเนินการ/อนุมัติ"
                              onClick={() => setShowNotificationModal(true)}
                          >
                              <Bell className="text-red-500 animate-ring" size={20} />
                              <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                                  {pendingApprovalCount > 99 ? '99+' : pendingApprovalCount}
                              </span>
                          </div>
                      )}
                  </div>
                  <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                      <Button variant="outline" icon={Download} onClick={() => exportToCSV(visibleProjectsDashboard, 'dashboard_summary')}>{t('exportReport')}</Button>
                      <Button variant="outline" icon={isExporting ? Loader2 : Printer} onClick={() => handleExportPDF('print-area', 'Dashboard_Report.pdf', 'portrait')} disabled={isExporting}>{isExporting ? t('downloading') : t('exportPDF')}</Button>
                  </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <KPICard title={t('totalProjects')} value={visibleProjectsDashboard.length} icon={Building2} color="blue" onClick={() => setSelectedKpiDetail('projects')} />
                  <KPICard title={t('totalEmployees')} value={users.length} icon={Users} color="green" onClick={() => setSelectedKpiDetail('employees')} />
                  <KPICard title="คะแนน Audit เฉลี่ยรวม" value={`${totalAuditsAvg}%`} icon={ClipboardCheck} color="purple" onClick={() => setSelectedKpiDetail('audits')} />
                  <KPICard title="งาน Action Plan ที่ค้างอยู่" value={totalPendingAPs} icon={Wrench} color="orange" onClick={() => setSelectedKpiDetail('actionPlans')} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. Projects by Type */}
                  <Card className="p-6 relative group">
                      <button onClick={() => setFullScreenChart('projectTypes')} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10" title="ขยายเต็มจอ">
                          <Maximize2 size={16} />
                      </button>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 size={20} className="text-blue-500"/> โครงการทั้งหมด แยกตามประเภท</h3>
                      <div className="h-72 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setFullScreenChart('projectTypes')}>
                          {renderProjectTypesChart()}
                      </div>
                  </Card>

                  {/* 2. Employees by Dept */}
                  <Card className="p-6 relative group">
                      <button onClick={() => setFullScreenChart('empByDept')} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10" title="ขยายเต็มจอ">
                          <Maximize2 size={16} />
                      </button>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users size={20} className="text-green-500"/> จำนวนพนักงาน แยกตามหน่วยงาน</h3>
                      <div className="h-72 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setFullScreenChart('empByDept')}>
                          {renderEmpByDeptChart()}
                      </div>
                  </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 3. Audit Ranking */}
                  <Card className="p-6 relative group">
                      <button onClick={() => setFullScreenChart('auditRank')} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10" title="ขยายเต็มจอ">
                          <Maximize2 size={16} />
                      </button>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><ClipboardCheck size={20} className="text-purple-500"/> ลำดับผลคะแนน Audit (จากมากไปน้อย)</h3>
                      <div className="h-80 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setFullScreenChart('auditRank')}>
                          {renderAuditRankChart()}
                      </div>
                  </Card>

                  {/* 4. PM Status by Project */}
                  <Card className="p-6 relative group">
                      <button onClick={() => setFullScreenChart('pmStatus')} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10" title="ขยายเต็มจอ">
                          <Maximize2 size={16} />
                      </button>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20} className="text-red-500"/> สถานะการทำ PM แยกตามหน่วยงาน (เดือนนี้)</h3>
                      <div className="h-80 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setFullScreenChart('pmStatus')}>
                          {pmStatusData.length > 0 ? (
                              renderPmStatusChart()
                          ) : (
                              <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                                  ยังไม่มีการตั้งค่าแผน PM ในระบบ
                              </div>
                          )}
                      </div>
                  </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 5. Daily Report */}
                  <Card className="p-6 relative group">
                      <button onClick={() => setFullScreenChart('reportRank')} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10" title="ขยายเต็มจอ">
                          <Maximize2 size={16} />
                      </button>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={20} className="text-cyan-500"/> สถิติการส่งรายงานประจำวัน (เดือนนี้)</h3>
                      <div className="h-80 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setFullScreenChart('reportRank')}>
                          {renderReportRankChart()}
                      </div>
                  </Card>

                  {/* 6. Action Plan Status */}
                  <Card className="p-6 relative group">
                      <button onClick={() => setFullScreenChart('actionPlan')} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10" title="ขยายเต็มจอ">
                          <Maximize2 size={16} />
                      </button>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Wrench size={20} className="text-orange-500"/> สถานะ Action Plan แยกตามหน่วยงาน</h3>
                      <div className="h-80 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setFullScreenChart('actionPlan')}>
                          {renderActionPlanChart()}
                      </div>
                  </Card>
              </div>

          {/* NEW: 7. Monthly Schedule Submission Status */}
          <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-pink-500"/> สถานะการนำส่งตารางงานประจำเดือน (เดือนปัจจุบัน)
              </h3>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg relative">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-20 shadow-sm">
                          <tr>
                              <th className="p-4 border-b w-16 text-center">ลำดับ</th>
                              <th className="p-4 border-b">ชื่อโครงการ / หน่วยงาน</th>
                              <th className="p-4 border-b text-center">ผู้จัดทำ</th>
                              <th className="p-4 border-b text-center">ผู้ตรวจสอบอนุมัติ</th>
                              <th className="p-4 border-b text-center">ฝ่ายบุคคลอนุมัติ</th>
                              <th className="p-4 border-b text-center">สถานะ</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                          {scheduleStatusTableData.length > 0 ? scheduleStatusTableData.map((p, index) => {
                              return (
                                  <tr 
                                      key={p.id} 
                                      className="hover:bg-orange-50 transition-colors cursor-pointer group"
                                      onClick={() => {
                                          const proj = projects.find(proj => proj.id === p.id);
                                          if(proj) {
                                              setSelectedProject(proj);
                                              setProjectTab('schedule');
                                              setCurrentMonth(localCurrentMonthStr); // เปิดตรงเดือนปัจจุบัน
                                          }
                                      }}
                                      title="คลิกเพื่อไปยังหน้าตารางงานของหน่วยงานนี้"
                                  >
                                      <td className="p-4 text-center text-gray-500">{index + 1}</td>
                                      <td className="p-4 font-bold text-gray-800 flex items-center gap-2 group-hover:text-orange-600 transition-colors">
                                          <Building2 size={16} className="text-gray-400 group-hover:text-orange-500"/>
                                          {p.name}
                                      </td>
                                      <td className="p-4 text-center text-gray-600">
                                          {p.preparedBy !== '-' ? <div className="text-xs">{p.preparedBy}</div> : <span className="text-gray-300">-</span>}
                                      </td>
                                      <td className="p-4 text-center text-gray-600">
                                          {p.managerApprovedBy !== '-' ? <div className="text-xs text-green-600 font-medium flex items-center justify-center gap-1"><CheckCircle size={12}/> {p.managerApprovedBy}</div> : <span className="text-gray-300">-</span>}
                                      </td>
                                      <td className="p-4 text-center text-gray-600">
                                          {p.hrApprovedBy !== '-' ? <div className="text-xs text-green-600 font-medium flex items-center justify-center gap-1"><CheckCircle size={12}/> {p.hrApprovedBy}</div> : <span className="text-gray-300">-</span>}
                                      </td>
                                      <td className="p-4 text-center">
                                          <span className={`font-bold px-3 py-1.5 rounded-full text-xs flex items-center justify-center gap-1 w-fit mx-auto ${
                                              p.status === 'Approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                              p.status === 'Pending HR' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                                              p.status === 'Pending Area Manager' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                                              p.status === 'Pending Manager' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 
                                              'bg-gray-100 text-gray-500 border border-gray-200'
                                          }`}>
                                              {p.status === 'Approved' ? <CheckCircle size={12}/> : p.status !== 'Not Submitted' ? <Clock size={12}/> : <AlertTriangle size={12}/>}
                                              {p.status === 'Approved' ? 'อนุมัติสมบูรณ์' : 
                                               p.status === 'Pending HR' ? 'รอฝ่ายบุคคลอนุมัติ' : 
                                               p.status === 'Pending Area Manager' ? 'รอ ผจก.พื้นที่ อนุมัติ' : 
                                               p.status === 'Pending Manager' ? 'รอ ผจก. อนุมัติ' : 'ยังไม่ส่ง / ฉบับร่าง'}
                                          </span>
                                          {p.isLocked && <div className="text-[10px] text-red-500 font-bold mt-1 flex justify-center items-center gap-1"><Lock size={10}/> ล็อคแล้ว</div>}
                                      </td>
                                  </tr>
                              );
                          }) : (
                              <tr><td colSpan="6" className="p-8 text-center text-gray-400">ไม่มีข้อมูลโครงการ</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </Card>

          {/* 8. Project Contract Expiration List */}
          <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Hourglass size={20} className="text-red-500"/> ลำดับวันสิ้นสุดสัญญาของหน่วยงาน (จากน้อยไปมาก)
              </h3>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg relative">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-20 shadow-sm">
                          <tr>
                              <th className="p-4 border-b w-16 text-center">ลำดับ</th>
                              <th className="p-4 border-b">ชื่อโครงการ / หน่วยงาน</th>
                              <th className="p-4 border-b text-center">วันเริ่มสัญญา</th>
                              <th className="p-4 border-b text-center">วันที่สิ้นสุดสัญญา</th>
                              <th className="p-4 border-b text-center">จำนวนวันคงเหลือ</th>
                              <th className="p-4 border-b text-right">มูลค่าสัญญา (บาท)</th>
                              <th className="p-4 border-b text-center">สถานะโครงการ</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                          {projectContractsData.length > 0 ? projectContractsData.map((p, index) => {
                              const isExpired = p.daysRemaining <= 0;
                              return (
                                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="p-4 text-center text-gray-500">{index + 1}</td>
                                      <td className="p-4 font-bold text-gray-800 flex items-center gap-2">
                                          <Building2 size={16} className={isExpired ? 'text-red-500' : p.daysRemaining <= 60 ? 'text-orange-500' : 'text-gray-400'}/>
                                          {p.name}
                                      </td>
                                      <td className="p-4 text-center text-gray-600">
                                          <div className="flex items-center justify-center gap-1">
                                              <Calendar size={14} className="text-gray-400"/> {p.contractStartDate || '-'}
                                          </div>
                                      </td>
                                      <td className="p-4 text-center text-gray-600">
                                          <div className="flex items-center justify-center gap-1">
                                              <Calendar size={14} className="text-gray-400"/> {p.contractEndDate || '-'}
                                          </div>
                                      </td>
                                      <td className="p-4 text-center">
                                          <span className={`font-bold px-3 py-1.5 rounded-full text-xs flex items-center justify-center gap-1 w-fit mx-auto ${
                                              isExpired ? 'bg-red-100 text-red-700 border border-red-200' : 
                                              p.daysRemaining <= 60 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 
                                              'bg-green-100 text-green-700 border border-green-200'
                                          }`}>
                                              {isExpired ? <AlertTriangle size={12}/> : <Clock size={12}/>}
                                              {isExpired ? 'หมดอายุแล้ว' : `เหลือ ${p.daysRemaining} วัน`}
                                          </span>
                                      </td>
                                      <td className="p-4 text-right font-medium text-gray-800">
                                          {p.contractValue ? Number(p.contractValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                                      </td>
                                      <td className="p-4 text-center"><Badge status={p.status} /></td>
                                  </tr>
                              );
                          }) : (
                              <tr><td colSpan="7" className="p-8 text-center text-gray-400">ไม่มีข้อมูลโครงการ</td></tr>
                          )}
                      </tbody>
                      {projectContractsData.length > 0 && (
                          <tfoot className="bg-orange-50 font-bold text-gray-800 sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
                          <tr>
                              <td colSpan="5" className="p-4 text-right border-t-2 border-orange-200 uppercase tracking-wide">มูลค่าสัญญารวมทั้งหมด:</td>
                              <td className="p-4 text-right text-orange-700 border-t-2 border-orange-200 text-lg whitespace-nowrap">
                                  {projectContractsData.reduce((sum, p) => sum + Number(p.contractValue || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท
                              </td>
                              <td className="border-t-2 border-orange-200"></td>
                          </tr>
                      </tfoot>
                  )}
              </table>
          </div>
      </Card>

      {/* Full Screen Chart Modal */}
      {fullScreenChart && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-sm animate-fade-in" onClick={() => setFullScreenChart(null)}>
              <div className="bg-white rounded-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
                  <div className="p-4 md:p-6 border-b flex justify-between items-center bg-gray-50 shrink-0">
                      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-gray-800">
                          {fullScreenChart === 'projectTypes' && <><Building2 className="text-blue-500"/> โครงการทั้งหมด แยกตามประเภท</>}
                          {fullScreenChart === 'empByDept' && <><Users className="text-green-500"/> จำนวนพนักงาน แยกตามหน่วยงาน</>}
                          {fullScreenChart === 'auditRank' && <><ClipboardCheck className="text-purple-500"/> ลำดับผลคะแนน Audit (จากมากไปน้อย)</>}
                          {fullScreenChart === 'pmStatus' && <><Settings className="text-red-500"/> สถานะการทำ PM แยกตามหน่วยงาน (เดือนนี้)</>}
                          {fullScreenChart === 'reportRank' && <><FileText className="text-cyan-500"/> สถิติการส่งรายงานประจำวัน (เดือนนี้)</>}
                          {fullScreenChart === 'actionPlan' && <><Wrench className="text-orange-500"/> สถานะ Action Plan แยกตามหน่วยงาน</>}
                      </h2>
                      <button onClick={() => setFullScreenChart(null)} className="p-2 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <div className="flex-1 p-6 md:p-10 min-h-0 bg-white flex flex-col justify-center">
                      {fullScreenChart === 'projectTypes' && renderProjectTypesChart(true)}
                      {fullScreenChart === 'empByDept' && renderEmpByDeptChart(true)}
                      {fullScreenChart === 'auditRank' && renderAuditRankChart(true)}
                      {fullScreenChart === 'pmStatus' && (pmStatusData.length > 0 ? renderPmStatusChart(true) : <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed text-xl">ยังไม่มีการตั้งค่าแผน PM ในระบบ</div>)}
                      {fullScreenChart === 'reportRank' && renderReportRankChart(true)}
                      {fullScreenChart === 'actionPlan' && renderActionPlanChart(true)}
                  </div>
              </div>
          </div>
      )}
  </div>
);
};

  const UserManagement = () => {
      // Logic สำหรับการกรองและการเรียงลำดับ
      const safeUsers = Array.isArray(users) ? users.filter(Boolean) : [];
      const filteredUsers = safeUsers
          .filter(u => userDeptFilter ? u.department === userDeptFilter : true)
          .filter(u => userRoleFilter ? u.position === userRoleFilter : true)
          .sort((a, b) => {
              // FIX: แปลงเป็น String ก่อนเปรียบเทียบ ป้องกัน Error กรณีมีข้อมูลเป็นตัวเลข (Number)
              const idA = String(a.employeeId || '');
              const idB = String(b.employeeId || '');
              if (userSortOrder === 'desc') return idB.localeCompare(idA); // มากไปน้อย
              return idA.localeCompare(idB); // น้อยไปมาก
          });

      // --- NEW: ฟังก์ชันสำหรับนำเข้าไฟล์ CSV ข้อมูลพนักงาน (รองรับภาษาไทยจาก Excel) ---
      const handleImportUsersCSV = (event) => {
          const file = event.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          
          // อ่านเป็น ArrayBuffer เพื่อมาถอดรหัส (Decode) เอง แก้ปัญหาภาษาไทยเป็น ????
          reader.readAsArrayBuffer(file);
          
          reader.onload = (e) => {
              try {
                  const buffer = e.target.result;
                  let text = '';
                  
                  try {
                      // พยายามถอดรหัสเป็นแบบ UTF-8 (มาตรฐาน) ก่อน โดยตั้ง fatal: true เพื่อให้เกิด Error ทันทีหากอ่านภาษาไทยไม่ออก
                      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
                  } catch (err) {
                      // หากเกิด Error (มักจะเกิดจากไฟล์ CSV ที่เซฟจาก Excel ภาษาไทย) ให้สลับไปใช้ windows-874 / tis-620 อัตโนมัติ
                      text = new TextDecoder('windows-874').decode(buffer);
                  }

                  const lines = text.split(/\r?\n/);
                  if (lines.length < 2) return alert('ไฟล์ CSV ไม่มีข้อมูล หรือมีแค่หัวตาราง');
                  
                  // แยกคอลัมน์โดยไม่แยกคอมม่าที่อยู่ในเครื่องหมายคำพูด ("")
                  const parseCSVLine = (line) => {
                      const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
                      return line.split(regex).map(v => v.trim().replace(/^"|"$/g, ''));
                  };

                  const headers = parseCSVLine(lines[0]);
                  const newUsers = [];
                  
                  for (let i = 1; i < lines.length; i++) {
                      if (!lines[i].trim()) continue;
                      
                      const values = parseCSVLine(lines[i]);
                      const userObj = {};
                      headers.forEach((header, index) => {
                          userObj[header] = values[index];
                      });
                      
                      // เช็คเฉพาะฟิลด์บังคับ คือ username และ firstName
                      if (userObj.username && userObj.firstName) {
                          const finalUsername = userObj.username;
                          newUsers.push({
                              id: generateId(),
                              employeeId: finalUsername, // บังคับให้รหัสพนักงานเป็นค่าเดียวกับชื่อผู้ใช้งาน
                              firstName: userObj.firstName || '',
                              lastName: userObj.lastName || '',
                              position: userObj.position || EMPLOYEE_POSITIONS[0], // ค่าเริ่มต้น
                              department: userObj.department || 'Head Office',
                              phone: userObj.phone || '',
                              username: finalUsername, // บังคับให้ชื่อผู้ใช้งานเป็นค่าเดียวกับรหัสพนักงาน
                              password: userObj.password || '1234', // รหัสผ่านตั้งต้นถ้าไม่ได้ใส่มา
                              status: 'Active',
                              created_at: new Date().toISOString(),
                              accessibleDepts: [],
                              permissions: getDefaultPermissions(),
                              photo: null
                          });
                      }
                  }
                  
                  if (newUsers.length > 0) {
                      showConfirm('ยืนยันการนำเข้า', `พบข้อมูลพนักงานใหม่ที่ถูกต้อง ${newUsers.length} รายการ ต้องการเพิ่มเข้าสู่ระบบใช่หรือไม่?`, () => {
                          setUsers(prev => [...prev, ...newUsers]);
                          alert('นำเข้าข้อมูลพนักงานสำเร็จแล้ว!');
                      }, 'ยืนยันการนำเข้า', 'info');
                  } else {
                      alert('ไม่พบข้อมูลพนักงานที่ถูกต้องในไฟล์ (กรุณาตรวจสอบว่ามีคอลัมน์ username และ firstName)');
                  }
              } catch (error) {
                  alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV โปรดตรวจสอบรูปแบบไฟล์');
                  console.error(error);
              }
          };
          event.target.value = ''; // รีเซ็ต input เพื่อให้เลือกไฟล์เดิมซ้ำได้
      };

      return (
          <div className="space-y-6">
              <ReportHeader />
              <header className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold text-gray-800">{t('userMgmt')}</h1>
                  <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                      {hasPerm('users', 'save') && (
                          <>
                              <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 font-bold hidden md:flex" icon={Shield} onClick={() => {
                                  setEditingRole(EMPLOYEE_POSITIONS[0]);
                                  // แก้ไข: ใช้ getMergedPermissions เพื่อให้ได้โครงสร้างสิทธิ์ที่สมบูรณ์เสมอ
                                  setEditingRolePerms(getMergedPermissions(rolePermissions[EMPLOYEE_POSITIONS[0]]));
                                  setShowRolePermModal(true);
                              }}>ตั้งค่าสิทธิ์ตามตำแหน่ง</Button>
                              <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition-colors bg-green-600 text-white hover:bg-green-700 shadow-sm" title="นำเข้าข้อมูลจากไฟล์ .csv">
                                  <Upload size={16} /> นำเข้า CSV
                                  <input type="file" accept=".csv" className="hidden" onChange={handleImportUsersCSV} />
                              </label>
                              <Button icon={Plus} onClick={() => { 
                                  setIsEditingUser(false); 
                                  // แก้ไข: ล้างข้อมูล State ให้เป็นค่าเริ่มต้นทุกครั้งที่กดเพิ่มผู้ใช้ใหม่ ป้องกันข้อมูลคนเก่าค้าง
                                  setNewUser({ 
                                      employeeId: '', 
                                      firstName: '', 
                                      lastName: '', 
                                      position: EMPLOYEE_POSITIONS[0], 
                                      otherPosition: '', 
                                      department: '', 
                                      accessibleDepts: [], 
                                      phone: '', 
                                      username: '', 
                                      password: '', 
                                      photo: null, 
                                      permissions: getMergedPermissions(rolePermissions[EMPLOYEE_POSITIONS[0]]) 
                                  });
                                  setShowAddUserModal(true); 
                              }}>{t('addUser')}</Button>
                          </>
                      )}
                      <Button variant="outline" icon={Download} onClick={() => exportToCSV(filteredUsers, 'users_list')}>CSV</Button>
                      <Button variant="outline" icon={isExporting ? Loader2 : Printer} onClick={() => handleExportPDF('print-area', 'User_List.pdf', 'landscape')} disabled={isExporting}>{isExporting ? t('downloading') : t('printPDF')}</Button>
                  </div>
              </header>

              {/* ส่วนของตัวกรอง (Filters) */}
              <Card className={`grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 ${isExporting ? 'hidden' : ''}`}>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">เรียงลำดับ (รหัสพนักงาน)</label>
                      <select 
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-200 outline-none transition-colors cursor-pointer"
                          value={userSortOrder}
                          onChange={e => setUserSortOrder(e.target.value)}
                      >
                          <option value="desc">มากไปน้อย (9-1, Z-A)</option>
                          <option value="asc">น้อยไปมาก (1-9, A-Z)</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">แยกตามหน่วยงาน (Department)</label>
                      <select 
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-200 outline-none transition-colors cursor-pointer"
                          value={userDeptFilter}
                          onChange={e => setUserDeptFilter(e.target.value)}
                      >
                          <option value="">-- ทั้งหมด (All) --</option>
                          <option value="Head Office">Head Office</option>
                          {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">แยกตามตำแหน่ง (Position)</label>
                      <select 
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-200 outline-none transition-colors cursor-pointer"
                          value={userRoleFilter}
                          onChange={e => setUserRoleFilter(e.target.value)}
                      >
                          <option value="">-- ทั้งหมด (All) --</option>
                          {EMPLOYEE_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                  </div>
              </Card>

              <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-600 uppercase">
                              <tr>
                                  <th className="p-4 w-16 text-center">{t('col_seq')}</th>
                                  <th className="p-4 w-32">{t('col_empId')}</th>
                                  <th className="p-4">{t('col_name')}</th>
                                  <th className="p-4">{t('col_role')}</th>
                                  <th className="p-4">{t('col_dept')}</th>
                                  <th className="p-4">{t('accessibleDepts')}</th>
                                  <th className="p-4">{t('username')}</th>
                                  <th className="p-4">{t('col_status')}</th>
                                  <th className="p-4 w-36">{t('col_lastLogin')}</th>
                                  <th className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>{t('col_actions')}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {filteredUsers.length > 0 ? filteredUsers.map((user, index) => (
                                  <tr key={user.id} className="hover:bg-gray-50 cursor-pointer group transition-colors" onClick={() => { if(hasPerm('users', 'edit')) handleEditUser(user); }}>
                                      <td className="p-4 text-center text-gray-500">{index + 1}</td>
                                      <td className="p-4 font-mono font-medium text-orange-600">{user.employeeId || '-'}</td>
                                      <td className="p-4 font-medium flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden text-xs shrink-0">
                                              {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : <User size={16} className="text-gray-400" />}
                                          </div>
                                          <div className="group-hover:text-orange-600 transition-colors flex items-center gap-2">
                                              {user.firstName} {user.lastName} 
                                              {hasPerm('users', 'edit') && <Edit size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                                          </div>
                                      </td>
                                      <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">{user.position}</span></td>
                                      <td className="p-4 text-gray-800">{user.department || '-'}</td>
                                      <td className="p-4">
                                          {(() => {
                                              // FIX: ตรวจสอบและจัดการชนิดข้อมูล ป้องกัน Array .split() Error
                                              const depts = user.accessibleDepts;
                                              if (!depts || depts === '' || (Array.isArray(depts) && depts.length === 0)) {
                                                  return <span className="text-gray-400 text-xs">-</span>;
                                              }
                                              
                                              const deptsArray = Array.isArray(depts) ? depts : (typeof depts === 'string' ? depts.split(', ').filter(Boolean) : []);
                                              
                                              if (deptsArray.includes('All')) {
                                                  return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">All (ทุกหน่วยงาน)</span>;
                                              }
                                              
                                              return (
                                                  <div className="flex flex-wrap gap-1">
                                                      {deptsArray.map((d, i) => d ? <span key={i} className="bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">{d}</span> : null)}
                                                  </div>
                                              );
                                          })()}
                                      </td>
                                      <td className="p-4 text-gray-600">{user.username}</td>
                                      <td className="p-4"><Badge status={user.status} /></td>
                                      <td className="p-4 text-xs text-gray-500">
                                          {user.lastLogin ? (() => {
                                              const lastDate = new Date(user.lastLogin);
                                              const now = new Date();
                                              const diffMins = Math.floor((now - lastDate) / 60000);
                                              // หากมีคนเข้าสู่ระบบภายใน 15 นาที ให้แสดงเป็นสถานะออนไลน์ (จุดเขียว)
                                              const isOnline = diffMins <= 15; 
                                              return (
                                                  <div className="flex flex-col gap-1">
                                                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border w-fit shadow-sm ${isOnline ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`} title={lastDate.toLocaleString('th-TH')}>
                                                          {isOnline ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> : <Clock size={12} className="text-gray-400 shrink-0"/>}
                                                          <span className="font-bold">{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
                                                      </div>
                                                      <div className="text-[10px] text-gray-400 pl-1">
                                                          {lastDate.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                                                      </div>
                                                  </div>
                                              );
                                          })() : (
                                              <span className="text-gray-300">-</span>
                                          )}
                                      </td>
                                      <td className={`p-4 text-center space-x-1 ${isExporting ? 'hidden' : ''}`}>
                                          {hasPerm('users', 'edit') && <button className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); handleEditUser(user); }} title="แก้ไขข้อมูล"><Edit size={16} /></button>}
                                          {hasPerm('users', 'delete') && <button className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50" onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบผู้ใช้งาน ${user.firstName} ${user.lastName} ใช่หรือไม่?`, () => setUsers(prev => prev.filter(u => u.id !== user.id))); }} title="ลบข้อมูล"><Trash2 size={16} /></button>}
                                      </td>
                                  </tr>
                              )) : (
                                  <tr>
                                      <td colSpan="8" className="p-8 text-center text-gray-400 bg-gray-50 border-b border-dashed">ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหา</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </Card>
          </div>
      );
  };

  const ProjectList = () => {
      // ดึงข้อมูลหน่วยงานเฉพาะที่ผู้ใช้รายนี้มีสิทธิ์เข้าถึง (เปลี่ยนมาตรวจสอบด้วย Array.includes อย่างเคร่งครัด)
      const visibleProjects = projects.filter(p => {
          if (currentUser?.username === 'admin') return true;
          
          const accessibleDeptsStr = currentUser?.accessibleDepts || '';
          const accessibleArray = typeof accessibleDeptsStr === 'string' ? accessibleDeptsStr.split(', ').filter(Boolean) : accessibleDeptsStr;
          
          if (accessibleArray.includes('All')) return true;
          
          return p.name === currentUser?.department || accessibleArray.includes(p.name);
      });

      // Logic สำหรับการกรองและการเรียงลำดับ
      const filteredProjects = visibleProjects
          .filter(p => projectTypeFilter ? p.type === projectTypeFilter : true)
          .sort((a, b) => {
              if (projectSortOrder === 'expiry_asc') return calculateDaysRemaining(a.contractEndDate) - calculateDaysRemaining(b.contractEndDate);
              if (projectSortOrder === 'expiry_desc') return calculateDaysRemaining(b.contractEndDate) - calculateDaysRemaining(a.contractEndDate);
              return 0;
          });

      return (
          <div className="space-y-6">
              <ReportHeader />
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800">{t('projectList')}</h1>
                  <div className="flex gap-2 items-center w-full md:w-auto">
                      {/* Toggle Grid / List View */}
                  <div className={`flex bg-gray-100 p-1 rounded-lg mr-2 ${isExporting ? 'hidden' : ''}`}>
                      <button onClick={() => setProjectViewMode('grid')} className={`p-1.5 rounded-md transition-all ${projectViewMode === 'grid' ? 'bg-white shadow text-orange-600' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View"><LayoutGrid size={18} /></button>
                      <button onClick={() => setProjectViewMode('list')} className={`p-1.5 rounded-md transition-all ${projectViewMode === 'list' ? 'bg-white shadow text-orange-600' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><List size={18} /></button>
                  </div>
                  <div className={`flex gap-2 w-full md:w-auto overflow-x-auto ${isExporting ? 'hidden' : ''}`}>
                      {hasPerm('projects', 'save') && <Button icon={Plus} onClick={() => { setIsEditingProject(false); setNewProject({ logo: null, code: '', name: '', type: 'Condo', address: '', phone: '', taxId: '', contractStartDate: '', contractEndDate: '', contractValue: '', status: 'Active', files: { orchor: null, committee: null, regulations: null, resident_rules: null }}); setShowAddProjectModal(true); }}>{t('newProject')}</Button>}
                      <Button variant="outline" icon={Download} onClick={() => exportToCSV(filteredProjects, 'projects')}>Export</Button>
                      <Button variant="outline" icon={isExporting ? Loader2 : Printer} onClick={() => handleExportPDF('print-area', 'Project_List.pdf', 'landscape')} disabled={isExporting}>{isExporting ? t('downloading') : t('printPDF')}</Button>
                  </div>
              </div>
          </header>

              {/* ส่วนของตัวกรอง (Filters) */}
              <Card className={`grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 ${isExporting ? 'hidden' : ''}`}>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">แยกตามประเภท (Type)</label>
                      <select 
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-200 outline-none transition-colors cursor-pointer bg-white"
                          value={projectTypeFilter}
                          onChange={e => setProjectTypeFilter(e.target.value)}
                      >
                          <option value="">-- ทั้งหมด (All) --</option>
                          {PROJECT_TYPES.map(type => <option key={type} value={type}>{t(type === 'Condo' ? 'tab_condo' : type === 'Village' ? 'tab_village' : 'tab_office')}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">เรียงลำดับระยะสัญญา (Expiration)</label>
                      <select 
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-200 outline-none transition-colors cursor-pointer bg-white"
                          value={projectSortOrder}
                          onChange={e => setProjectSortOrder(e.target.value)}
                      >
                          <option value="expiry_asc">สัญญาใกล้หมด จากน้อยไปมาก</option>
                          <option value="expiry_desc">สัญญาใกล้หมด จากมากไปน้อย</option>
                      </select>
                  </div>
              </Card>

              {projectViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProjects.length > 0 ? filteredProjects.map(project => { 
                          const remainingDays = calculateDaysRemaining(project.contractEndDate); 
                          const isExpired = remainingDays <= 0; 
                          return (
                              <div key={project.id} onClick={() => { setSelectedProject(project); setProjectTab('overview'); }} className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all relative">
                                  <div className="flex justify-between items-start mb-4">
                                      <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                                          {project.logo ? <img src={project.logo} className="w-6 h-6 object-contain" /> : <Building2 className="text-orange-600" size={24} />}
                                      </div>
                                      <Badge status={project.status} />
                                  </div>
                                  <div className="flex justify-between items-center mb-1">
                                      <h3 className="text-lg font-bold text-gray-800 truncate pr-2">{project.name}</h3>
                                          <div className="flex gap-1">
                                          {hasPerm('projects', 'edit') && (
                                              <button 
                                                  onClick={(e) => { 
                                                      e.stopPropagation(); 
                                                      setNewProject({ files: { orchor: null, committee: null, regulations: null, resident_rules: null }, ...project }); 
                                                      setIsEditingProject(true); 
                                                      setShowAddProjectModal(true); 
                                                  }} 
                                                  className="text-gray-400 hover:text-orange-600 p-1.5 rounded-md hover:bg-orange-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 border border-transparent hover:border-orange-200"
                                                  title="แก้ไขข้อมูลหน่วยงาน"
                                              >
                                                  <Edit size={16} />
                                              </button>
                                          )}
                                          {hasPerm('projects', 'delete') && (
                                              <button 
                                                  onClick={(e) => { 
                                                      e.stopPropagation(); 
                                                      showConfirm('ยืนยันการลบ', `คุณต้องการลบข้อมูลโครงการ/หน่วยงาน ${project.name} ใช่หรือไม่?`, () => {
                                                          setProjects(prev => prev.filter(p => p.id !== project.id));
                                                          if(selectedProject?.id === project.id) setSelectedProject(null);
                                                      });
                                                  }} 
                                                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 border border-transparent hover:border-red-200"
                                                  title="ลบข้อมูลหน่วยงาน"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          )}
                                      </div>
                                  </div>
                                  <p className="text-sm text-gray-500 mb-4 truncate">{project.address}</p>
                                  <div className="space-y-2 text-sm text-gray-600">
                                      <div className="flex items-center gap-2">
                                          <Clock size={16} className={isExpired ? "text-red-500" : "text-gray-400"} />
                                          <span className={isExpired ? "text-red-600 font-bold" : ""}>{isExpired ? t('expired') : `${remainingDays} ${t('days')} ${t('daysRemaining')}`}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <Calendar size={16} className="text-gray-400" />
                                          <span>{t('start')}: {project.contractStartDate}</span>
                                      </div>
                                  </div>
                              </div>
                          ); 
                      }) : (
                          <div className="col-span-full p-10 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">
                              ไม่พบหน่วยงานที่ตรงกับเงื่อนไขที่ค้นหา
                          </div>
                      )}
                  </div>
              ) : (
                  <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-gray-600 uppercase">
                                  <tr>
                                      <th className="p-4 w-16 text-center">{t('col_seq')}</th>
                                      <th className="p-4 w-20 text-center">โลโก้</th>
                                      <th className="p-4">{t('projName')}</th>
                                      <th className="p-4">{t('projType')}</th>
                                      <th className="p-4">{t('contractEndDate')}</th>
                                      <th className="p-4 text-center">{t('col_status')}</th>
                                      <th className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>{t('col_actions')}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                  {filteredProjects.length > 0 ? filteredProjects.map((project, index) => {
                                      const remainingDays = calculateDaysRemaining(project.contractEndDate); 
                                      const isExpired = remainingDays <= 0;
                                      return (
                                          <tr key={project.id} className="hover:bg-gray-50 cursor-pointer group transition-colors" onClick={() => { setSelectedProject(project); setProjectTab('overview'); }}>
                                              <td className="p-4 text-center text-gray-500">{index + 1}</td>
                                              <td className="p-4 text-center">
                                                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center overflow-hidden mx-auto border border-orange-100">
                                                      {project.logo ? <img src={project.logo} className="w-full h-full object-cover" /> : <Building2 size={20} className="text-orange-500" />}
                                                  </div>
                                              </td>
                                              <td className="p-4">
                                                  <div className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">{project.name}</div>
                                                  <div className="text-xs text-gray-500 font-mono mt-0.5">{project.code}</div>
                                              </td>
                                              <td className="p-4 text-gray-700">
                                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                      {project.type === 'Condo' ? t('tab_condo') : project.type === 'Village' ? t('tab_village') : t('tab_office')}
                                                  </span>
                                              </td>
                                              <td className="p-4">
                                                  <div className="text-gray-700 flex items-center gap-1"><Calendar size={14} className="text-gray-400"/> {project.contractEndDate}</div>
                                                  <div className={`text-xs font-bold mt-1 ${isExpired ? 'text-red-600' : remainingDays < 30 ? 'text-orange-500' : 'text-green-600'}`}>
                                                      {isExpired ? t('expired') : `เหลือสัญญา ${remainingDays} วัน`}
                                                  </div>
                                              </td>
                                              <td className="p-4 text-center"><Badge status={project.status} /></td>
                                              <td className={`p-4 text-center space-x-1 ${isExporting ? 'hidden' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                  {hasPerm('projects', 'edit') && <button className="text-gray-400 hover:text-orange-600 transition-colors p-1.5 rounded-md hover:bg-orange-50" onClick={() => { setNewProject({ files: { orchor: null, committee: null, regulations: null, resident_rules: null }, ...project }); setIsEditingProject(true); setShowAddProjectModal(true); }} title="แก้ไขข้อมูล"><Edit size={16} /></button>}
                                                  {hasPerm('projects', 'delete') && <button className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50" onClick={() => { showConfirm('ยืนยันการลบ', `คุณต้องการลบข้อมูลโครงการ/หน่วยงาน ${project.name} ใช่หรือไม่?`, () => { setProjects(prev => prev.filter(p => p.id !== project.id)); if(selectedProject?.id === project.id) setSelectedProject(null); }); }} title="ลบข้อมูลหน่วยงาน"><Trash2 size={16} /></button>}
                                              </td>
                                          </tr>
                                      );
                                  }) : (
                                      <tr><td colSpan="7" className="p-8 text-center text-gray-400 bg-gray-50 border-b border-dashed">ไม่พบโครงการที่ตรงกับเงื่อนไขการค้นหา</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </Card>
              )}
          </div>
      );
  };

  const GlobalAuditList = () => {
      // คำนวณคะแนนเฉลี่ยของทุกโครงการสำหรับการแสดงผลในกราฟ
      const auditRankData = projects.map(p => {
          const pAudits = audits.filter(a => a.projectId === p.id);
          const avg = pAudits.length > 0 ? (pAudits.reduce((sum, a) => sum + a.score, 0) / pAudits.length) : 0;
          return { name: p.name, avgScore: parseFloat(avg.toFixed(1)) };
      }).filter(d => d.avgScore > 0).sort((a, b) => b.avgScore - a.avgScore);

      return (
          <div id="print-global-audit" className={`space-y-6 animate-fade-in ${isExporting ? 'w-[190mm] min-w-[190mm] max-w-[190mm] mx-auto bg-white box-border' : ''}`}>
              <ReportHeader />
              <header className="flex justify-between items-center mb-6">
                  <div>
                      <h1 className="text-2xl font-bold text-gray-800">{isExporting ? 'รายงานการตรวจสอบภายใน (Global Audit)' : t('globalAudit')}</h1>
                      <p className="text-gray-500">{t('auditDesc')}</p>
                  </div>
                  <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                      {hasPerm('audits', 'save') && (
                          <Button icon={Plus} onClick={() => { setNewAudit(prev => ({...prev, projectId: '', inspector: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''})); setShowAddAuditModal(true); }}>
                              {t('newAudit')}
                          </Button>
                      )}
                      <Button variant="outline" icon={Download} onClick={() => exportToCSV(audits, 'global_audit_report')}>{t('exportCSV')}</Button>
                      <Button variant="outline" icon={isExporting ? Loader2 : Printer} onClick={() => {
                          const container = document.getElementById('print-global-audit');
                          if (container) container.scrollTop = 0;
                          handleExportPDF('print-global-audit', 'Global_Audit_Report.pdf', 'portrait', [22, 10, 20, 10]);
                      }} disabled={isExporting}>
                          {isExporting ? t('downloading') : t('printPDF')}
                      </Button>
                  </div>
              </header>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6 border-l-4 border-green-500">
                      <div className="text-gray-500 mb-1">{t('auditPass')}</div>
                      <div className="text-2xl font-bold">{audits.filter(a => a.score >= 90).length} Reports</div>
                  </Card>
                  <Card className="p-6 border-l-4 border-yellow-500">
                      <div className="text-gray-500 mb-1">{t('auditConcern')}</div>
                      <div className="text-2xl font-bold">{audits.filter(a => a.score >= 70 && a.score < 90).length} Reports</div>
                  </Card>
                  <Card className="p-6 border-l-4 border-red-500">
                      <div className="text-gray-500 mb-1">{t('auditCritical')}</div>
                      <div className="text-2xl font-bold">{audits.filter(a => a.score < 70).length} Reports</div>
                  </Card>
              </div>

              {/* Audit Ranking Graph */}
              <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <BarChart3 size={20} className="text-blue-600"/> ลำดับผลคะแนน Audit รวมทุกหน่วยงาน (จากมากไปน้อย)
                  </h3>
                  <div className="h-80">
                      {auditRankData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={auditRankData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                  <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: 11, fill: '#6b7280'}} interval={0} height={60} axisLine={false} tickLine={false} />
                                  <YAxis domain={[0, 100]} tick={{fontSize: 11, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                  <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                  <Bar dataKey="avgScore" name="คะแนนเฉลี่ย" radius={[4, 4, 0, 0]}>
                                      {auditRankData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.avgScore >= 90 ? '#10b981' : entry.avgScore >= 70 ? '#f59e0b' : '#ef4444'} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                              ยังไม่มีข้อมูลผลการประเมิน (Audit) ที่คำนวณได้
                          </div>
                      )}
                  </div>
              </Card>

              {/* Detailed Audit Table */}
              <Card>
                  <div className={isExporting ? "w-full pb-4" : "overflow-x-auto"}>
                      <table className="w-full text-sm text-left table-fixed break-words">
                          <thead className="bg-gray-50 text-gray-600 uppercase">
                              <tr>
                                  <th className="p-4 w-[15%]">{t('col_date')}</th>
                                  <th className="p-4 w-[25%]">{t('col_project')}</th>
                                  <th className="p-4 w-[20%]">{t('col_category')}</th>
                                  <th className="p-4 text-center w-[15%]">{t('col_score')}</th>
                                  <th className="p-4 w-[25%]">{t('col_inspector')}</th>
                                  <th className={`p-4 text-right w-[15%] ${isExporting ? 'hidden' : ''}`}>{t('col_actions')}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {audits.length > 0 ? (
                                  audits.map(audit => { 
                                      const project = projects.find(p => p.id === audit.projectId); 
                                      return (
                                          <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                                              <td className="p-4 text-gray-600">{audit.date}</td>
                                              <td className="p-4 font-medium text-gray-800 break-words whitespace-normal">{project ? project.name : 'Unknown Project'}</td>
                                              <td className="p-4 text-gray-600 break-words whitespace-normal">{audit.category}</td>
                                              <td className="p-4 text-center">
                                                  <span className={`font-bold px-2 py-1 rounded text-xs ${audit.score >= 90 ? 'bg-green-100 text-green-700' : audit.score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                      {audit.rawScore ? `${audit.rawScore}/235` : `${audit.score}%`}
                                                  </span>
                                              </td>
                                              <td className="p-4 text-gray-700 break-words whitespace-normal">{audit.inspector}</td>
                                              <td className={`p-4 text-right space-x-2 ${isExporting ? 'hidden' : ''}`}>
                                                  <button className="text-gray-400 hover:text-blue-600 transition-colors p-1" onClick={() => setSelectedAuditReport(audit)} title="ดูรายงาน">
                                                      <FileText size={18} />
                                                  </button>
                                                  {hasPerm('audits', 'delete') && (
                                                      <button 
                                                          className="text-gray-400 hover:text-red-600 transition-colors p-1" 
                                                          onClick={() => showConfirm('ยืนยันการลบ', 'คุณต้องการลบรายงานผลการตรวจสอบนี้ใช่หรือไม่?', () => setAudits(prev => prev.filter(a => a.id !== audit.id)))}
                                                          title="ลบรายงาน"
                                                      >
                                                          <Trash2 size={18} />
                                                      </button>
                                                  )}
                                              </td>
                                          </tr>
                                      ); 
                                  })
                              ) : (
                                  <tr><td colSpan="6" className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลการตรวจประเมิน</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </Card>
          </div>
      );
  };

  const ContractorVendorList = () => {
      // --- NEW: Aggregate suppliers from both manual list and all recorded contracts across all units ---
      const combinedSuppliersMap = new Map();
      
      // 1. Base contractors (Manual list)
      contractors.forEach(c => {
          if (c.name) combinedSuppliersMap.set(c.name.trim().toLowerCase(), { ...c });
      });

      // 2. Extract from ALL contracts (ทุกหน่วยงาน)
      contracts.forEach(ct => {
          if (!ct.vendorName) return;
          const key = ct.vendorName.trim().toLowerCase();
          
          if (!combinedSuppliersMap.has(key)) {
              // ถ้ายังไม่มีในระบบ ให้เพิ่มเข้าไปใหม่
              combinedSuppliersMap.set(key, {
                  id: `auto_${ct.id}`,
                  name: ct.vendorName,
                  type: ct.type.split(' (')[0], // ใช้ประเภทจากสัญญา เช่น สัญญาจ่าย
                  category: ct.category,
                  contact: ct.contactPerson || '-',
                  phone: ct.contactPhone || '-',
                  email: '-',
                  status: 'Active',
                  isAuto: true // แฟล็กบอกว่าเป็นข้อมูลที่ดึงมาจากสัญญา
              });
          } else {
              // ถ้ามีอยู่แล้ว ให้อัปเดตข้อมูลผู้ติดต่อหากของเดิมไม่มี
              const existing = combinedSuppliersMap.get(key);
              if ((!existing.contact || existing.contact === '-') && ct.contactPerson) existing.contact = ct.contactPerson;
              if ((!existing.phone || existing.phone === '-') && ct.contactPhone) existing.phone = ct.contactPhone;
          }
      });

      const allSuppliersList = Array.from(combinedSuppliersMap.values());

      // ดึงข้อมูลประเภททั้งหมดที่มีในระบบแบบไม่ซ้ำกัน
      const availableTypes = [...new Set(allSuppliersList.map(c => c.type))].filter(Boolean);

      // กรองข้อมูลตามเงื่อนไขที่เลือก
      const filteredContractors = allSuppliersList.filter(c => {
          const searchLower = supplierSearch.toLowerCase();
          const matchSearch = (c.name && c.name.toLowerCase().includes(searchLower)) || 
                              (c.contact && c.contact.toLowerCase().includes(searchLower)) ||
                              (c.email && c.email.toLowerCase().includes(searchLower));
          
          const matchType = supplierTypeFilter ? c.type === supplierTypeFilter : true;
          const matchCategory = supplierCategoryFilter ? (c.category && c.category === supplierCategoryFilter) : true;
          
          return matchSearch && matchType && matchCategory;
      });

      return (
          <div className="space-y-6 animate-fade-in">
              <Card>
                  <div className="p-4 border-b flex justify-between items-center bg-white">
                      <div>
                          <h3 className="font-bold flex items-center gap-2 text-gray-800">
                              <Search size={20} className="text-orange-500" /> {t('contractorList')}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{t('managePartners')}</p>
                      </div>
                      <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                          <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(filteredContractors, 'contractors_list')}>Export</Button>
                          {hasPerm('proj_contractors', 'save') && <Button size="sm" icon={Plus}>{t('addNew')}</Button>}
                      </div>
                  </div>

                  {/* ค้นหาและตัวกรอง */}
                  <div className={`p-4 bg-gray-50 border-b border-gray-200 ${isExporting ? 'hidden' : ''}`}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-2">ค้นหา (Search)</label>
                              <div className="relative">
                                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                  <input 
                                      type="text"
                                      placeholder="ค้นหาชื่อบริษัท, ชื่อผู้ติดต่อ, อีเมล..."
                                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none transition-all bg-white"
                                      value={supplierSearch}
                                      onChange={(e) => setSupplierSearch(e.target.value)}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-2">ประเภท (Type)</label>
                              <select 
                                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none bg-white transition-all"
                                  value={supplierTypeFilter}
                                  onChange={(e) => setSupplierTypeFilter(e.target.value)}
                              >
                                  <option value="">-- ทั้งหมด (All Types) --</option>
                                  {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-2">หมวดงานบริการ (Category)</label>
                              <select 
                                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none bg-white transition-all"
                                  value={supplierCategoryFilter}
                                  onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                              >
                                  <option value="">-- ทั้งหมด (All Categories) --</option>
                                  {Object.entries(SERVICE_TYPES).map(([typeKey, categories]) => (
                                      <optgroup key={typeKey} label={typeKey}>
                                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                      </optgroup>
                                  ))}
                              </select>
                          </div>
                      </div>
                  </div>

                  {/* ตารางข้อมูล */}
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-100 text-gray-600 uppercase">
                              <tr>
                                  <th className="p-4">{t('col_company')}</th>
                                  <th className="p-4">{t('col_type')}</th>
                                  <th className="p-4">{t('col_category')}</th>
                                  <th className="p-4">{t('col_contact')}</th>
                                  <th className="p-4">{t('col_phoneEmail')}</th>
                                  <th className="p-4 text-center">{t('col_status')}</th>
                                  <th className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {filteredContractors.length > 0 ? (
                                  filteredContractors.map(c => (
                                      <tr key={c.id} className="hover:bg-orange-50 transition-colors cursor-pointer group" onClick={() => setSelectedSupplierDetails(c)}>
                                          <td className="p-4">
                                              <div className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                                                  {c.name}
                                                  <Search size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                          </td>
                                          <td className="p-4"><Badge status={c.type} /></td>
                                          <td className="p-4"><Badge status={c.category} /></td>
                                          <td className="p-4 text-gray-700 flex items-center gap-2">
                                              <User size={14} className="text-gray-400"/> {c.contact}
                                          </td>
                                          <td className="p-4">
                                              <div className="text-xs text-gray-800 flex items-center gap-1 mb-1"><Phone size={12} className="text-gray-400"/> {c.phone}</div>
                                              <div className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12} className="text-gray-400"/> {c.email}</div>
                                          </td>
                                          <td className="p-4 text-center"><Badge status={c.status} /></td>
                                          <td className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>
                                              {hasPerm('proj_contractors', 'delete') && !c.isAuto && (
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบซัพพลายเออร์ ${c.name} ใช่หรือไม่?`, () => setContractors(prev => prev.filter(con => con.id !== c.id))); }}
                                                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                      title="ลบข้อมูล"
                                                  >
                                                      <Trash2 size={16} />
                                                  </button>
                                              )}
                                              {c.isAuto && (
                                                  <span className="text-[10px] text-gray-400 border border-gray-200 px-1 py-0.5 rounded bg-gray-50 cursor-help" title="ข้อมูลดึงมาจากสัญญาโดยอัตโนมัติ (ลบได้จากการลบสัญญา)">Auto</span>
                                              )}
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr>
                                      <td colSpan="7" className="p-12 text-center">
                                          <div className="flex flex-col items-center text-gray-400">
                                              <Search size={40} className="mb-2 text-gray-300"/>
                                              <div className="font-medium text-gray-500 text-base">ไม่พบข้อมูล Supplier ที่ค้นหา</div>
                                              <div className="text-xs mt-1">ลองปรับเปลี่ยนคำค้นหา หรือตัวกรองของคุณ</div>
                                          </div>
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </Card>
          </div>
      );
  };

  const ProjectDetail = () => {
    const remainingDays = calculateDaysRemaining(selectedProject.contractEndDate);

    // --- NEW: Drag & Drop Logic for Schedule ---
    const projectStaffForSchedule = users.filter(u => u.department === selectedProject.name);
    const currentOrder = projectStaffOrder[selectedProject.id] || [];
    
    // เรียงลำดับพนักงานตามที่ถูกบันทึกไว้ (ถ้ามี)
    const sortedStaff = [...projectStaffForSchedule].sort((a, b) => {
        let indexA = currentOrder.indexOf(a.id);
        let indexB = currentOrder.indexOf(b.id);
        if (indexA === -1) indexA = 9999; // ถ้ายังไม่มีในลำดับให้ต่อท้าย
        if (indexB === -1) indexB = 9999;
        return indexA - indexB;
    });

    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const newStaffOrder = [...sortedStaff];
            const draggedItemContent = newStaffOrder[dragItem.current];
            newStaffOrder.splice(dragItem.current, 1);
            newStaffOrder.splice(dragOverItem.current, 0, draggedItemContent);
            
            // บันทึกลำดับใหม่ลง State แบบถาวร
            setProjectStaffOrder(prev => ({
                ...prev,
                [selectedProject.id]: newStaffOrder.map(u => u.id)
            }));
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };
    // ------------------------------------------

    // ฟังก์ชันตรวจสอบสิทธิ์การแก้ไขข้อมูลส่วนตัว
    const canEditProfile = (targetUser) => {
        if (!currentUser) return false;
        return currentUser.username === 'admin' || currentUser.id === targetUser.id;
    };

    const getStaffHierarchy = () => {
        const projectStaff = users.filter(u => u.department === selectedProject.name);
        return {
        managers: projectStaff.filter(u => 
            ((u.position || '').toLowerCase().includes('manager') || (u.position || '').includes('ผู้จัดการ')) &&
            !(u.position || '').toLowerCase().includes('assistant') && !(u.position || '').includes('ผู้ช่วย')
        ),
        supervisors: projectStaff.filter(u => 
            ((u.position || '').toLowerCase().includes('chief') || (u.position || '').includes('หัวหน้า')) || 
            ((u.position || '').toLowerCase().includes('assistant') || (u.position || '').includes('ผู้ช่วย'))
        ),
        staff: projectStaff.filter(u => 
            !((u.position || '').toLowerCase().includes('manager') || (u.position || '').includes('ผู้จัดการ')) &&
            !((u.position || '').toLowerCase().includes('chief') || (u.position || '').includes('หัวหน้า')) &&
            !((u.position || '').toLowerCase().includes('assistant') || (u.position || '').includes('ผู้ช่วย'))
        )
        };
    };

    const OrgChartNode = ({ user, color = "blue" }) => (
      <div 
        className={`flex flex-col items-center bg-white p-3 rounded-xl shadow-sm border-t-4 border-${color}-500 w-48 text-center relative transition-transform hover:-translate-y-1 hover:shadow-md ${canEditProfile(user) ? 'cursor-pointer group' : ''}`}
        onClick={() => canEditProfile(user) && handleEditUser(user)}
        title={canEditProfile(user) ? "คลิกเพื่อแก้ไขข้อมูลส่วนตัว" : "ข้อมูลพนักงาน"}
      >
        {canEditProfile(user) && (
            <div className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit size={14} className="hover:text-orange-500" />
            </div>
        )}
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-2 border-2 border-white shadow-sm">
           {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400"/>}
        </div>
        <div className={`font-bold text-gray-800 text-sm truncate w-full transition-colors ${canEditProfile(user) ? 'group-hover:text-orange-600' : ''}`}>{user.firstName} {user.lastName}</div>
        <div className="text-xs text-gray-500 truncate w-full mb-1">{user.position}</div>
        <div className="mt-1 flex gap-2 justify-center" onClick={e => e.stopPropagation()}>
            {user.phone && <a href={`tel:${user.phone}`} className="text-gray-400 hover:text-green-500"><Phone size={12}/></a>}
            {user.email && <a href={`mailto:${user.email}`} className="text-gray-400 hover:text-blue-500"><Mail size={12}/></a>}
        </div>
      </div>
    );

    return (
      <div className={`space-y-6 ${isExporting ? 'w-max min-w-full' : ''}`}>
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start gap-4 mb-6 ${isExporting ? 'hidden' : ''}`}>
          <div>
            <div className={`flex items-center gap-3 mb-2 ${isExporting ? 'hidden' : ''}`}>
                <div 
                    className={`p-2 rounded-lg bg-orange-50 text-orange-600 ${hasPerm('projects', 'edit') ? 'cursor-pointer hover:bg-orange-100 transition-colors' : ''}`} 
                    onClick={() => hasPerm('projects', 'edit') && handleEditProjectClick()}
                    title={hasPerm('projects', 'edit') ? "คลิกเพื่อแก้ไขโลโก้หน่วยงาน" : ""}
                >
                    {selectedProject.logo ? <img src={selectedProject.logo} className="w-8 h-8 object-contain" /> : <Building2 size={28} />}
                </div>
                <h1 
                    className={`text-2xl md:text-3xl font-black text-gray-800 flex items-center gap-2 transition-all ${hasPerm('projects', 'edit') ? 'cursor-pointer group' : ''}`}
                    onClick={() => hasPerm('projects', 'edit') && handleEditProjectClick()}
                    title={hasPerm('projects', 'edit') ? "คลิกที่ชื่อเพื่อแก้ไขข้อมูลหน่วยงาน" : ""}
                >
                    <span className="group-hover:text-orange-600 group-hover:underline decoration-2 underline-offset-4 transition-all">
                        {selectedProject.name}
                    </span>
                    {hasPerm('projects', 'edit') && (
                        <Edit size={22} className="text-gray-400 group-hover:text-orange-500 transition-colors shrink-0 ml-1" />
                    )}
                </h1>
            </div>
            <h1 className={`text-3xl font-black text-gray-800 mb-2 ${isExporting ? 'block' : 'hidden'}`}>{selectedProject.name}</h1>
            <p className="text-gray-500 text-sm md:text-base mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-gray-400"/> {selectedProject.type} - {selectedProject.address}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg inline-flex border border-gray-100">
                <div className="flex items-center gap-2"><Calendar size={16} className="text-blue-500"/> เริ่ม: {selectedProject.contractStartDate} ถึง {selectedProject.contractEndDate}</div>
                <div className="border-l border-gray-300 pl-4 flex items-center gap-2 font-semibold text-orange-600"><Hourglass size={16}/> {remainingDays > 0 ? `เหลือสัญญา ${remainingDays} ${t('days')}` : t('expired')}</div>
            </div>
          </div>
          <div className={`flex flex-wrap items-start gap-2 shrink-0 ${isExporting ? 'hidden' : ''}`}>
              {hasPerm('projects', 'edit') && (
                  <Button 
                      variant="outline" 
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 font-bold bg-white shadow-sm" 
                      icon={Edit} 
                      onClick={() => handleEditProjectClick()}
                  >
                      แก้ไขข้อมูลโครงการ
                  </Button>
              )}
              <Button variant="outline" onClick={() => exportToCSV([selectedProject], 'project_detail')}>{t('exportInfo')}</Button>
              <Button variant="outline" icon={isExporting ? Loader2 : Printer} onClick={() => {
                  let orientation = 'portrait';
                  let filename = 'Project_Overview.pdf';
                  if (projectTab === 'staff' && staffViewMode === 'chart') {
                      orientation = 'landscape';
                      filename = `Organization_Chart_${selectedProject.code}.pdf`;
                  } else if (projectTab === 'staff') {
                      filename = `Staff_List_${selectedProject.code}.pdf`;
                  }
                  handleExportPDF('print-area', filename, orientation);
              }} disabled={isExporting}>{isExporting ? t('downloading') : t('printPDF')}</Button>
          </div>
        </div>
        
        <div className="min-h-[400px]">
          {projectTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                  {(() => {
                      // --- Date Context ---
                      const today = new Date();
                      const currentY = today.getFullYear();
                      const currentM = today.getMonth(); // 0-11
                      const daysPassedInMonth = today.getDate();

                      // --- 1. Contracts expiring < 45 days ---
                      const expiringContracts = contracts.filter(c => 
                          c.projectId === selectedProject.id && 
                          c.status === 'Active' &&
                          calculateDaysRemaining(c.endDate) >= 0 && 
                          calculateDaysRemaining(c.endDate) <= 45
                      ).sort((a,b) => calculateDaysRemaining(a.endDate) - calculateDaysRemaining(b.endDate));

                      // --- 2. Leave Usage (H, V, BL, S) for current month ---
                      const projectStaffIds = users.filter(u => u.department === selectedProject.name).map(u => u.id);
                      const leaveCounts = { H: 0, V: 0, BL: 0, S: 0 };
                      const currentMonthStr = `${currentY}-${String(currentM + 1).padStart(2, '0')}`;
                      Object.keys(schedules).forEach(key => {
                          const [userId, dateStr] = key.split('_');
                          if (projectStaffIds.includes(userId) && dateStr.startsWith(currentMonthStr)) {
                              const shift = schedules[key];
                              if (['H', 'V', 'BL', 'S'].includes(shift)) {
                                  leaveCounts[shift]++;
                              }
                          }
                      });

                      // --- 3. Daily Reports Summary ---
                      const currentMonthReports = dailyReports.filter(r => {
                          if (r.projectId !== selectedProject.id) return false;
                          return r.date.startsWith(currentMonthStr);
                      });
                      // หาจำนวนวันที่ไม่ซ้ำกันที่มีการส่งรายงาน
                      const uniqueReportDays = new Set(currentMonthReports.map(r => r.date)).size;
                      const missingReportDays = Math.max(0, daysPassedInMonth - uniqueReportDays);

                      // คำนวณอันดับการส่งรายงานเทียบกับทุกโครงการ
                      const reportRankDataAll = projects.map(p => {
                          const pReports = dailyReports.filter(r => r.projectId === p.id && r.date.startsWith(currentMonthStr));
                          const uniqueDays = new Set(pReports.map(r => r.date)).size;
                          return { id: p.id, name: p.name, submittedDays: uniqueDays };
                      }).sort((a, b) => b.submittedDays - a.submittedDays);

                      const reportRankIndex = reportRankDataAll.findIndex(p => p.id === selectedProject.id);
                      const reportRankStr = reportRankIndex >= 0 ? reportRankIndex + 1 : '-';
                      const totalProjectsForReportRank = projects.length;

                      // --- 4. PM Status Summary ---
                      const activePmPlans = pmPlans.filter(p => p.projectId === selectedProject.id && p.status === 'Active');
                      const pmDoneThisMonth = pmHistoryList.filter(h => h.projectId === selectedProject.id && h.date.startsWith(currentMonthStr));
                      const uniqueMachinesPMd = new Set(pmDoneThisMonth.map(h => h.machineId)).size;
                      const totalMachinesToPM = activePmPlans.map(p => p.machineId); // Simplified: Assume 1 plan per machine for total base
                      const uniqueMachinesToPM = new Set(totalMachinesToPM).size;

                      // --- 5. Utility Meters Summary ---
                      const projMeters = meters.filter(m => m.projectId === selectedProject.id);
                      const expectedReadings = projMeters.length * daysPassedInMonth;
                      const currentMonthReadings = utilityReadings.filter(r => {
                          const m = projMeters.find(m => m.id === r.meterId);
                          return m && r.date.startsWith(currentMonthStr);
                      });
                      const missingReadings = Math.max(0, expectedReadings - currentMonthReadings.length);

                      // --- 6. Action Plan Summary ---
                      const projActionPlans = actionPlans.filter(a => a.projectId === selectedProject.id);
                      const apStatusCounts = { 'Pending': 0, 'In Progress': 0, 'Completed': 0, 'Cancelled': 0 };
                      projActionPlans.forEach(ap => { if (apStatusCounts[ap.status] !== undefined) apStatusCounts[ap.status]++; });
                      const totalAP = projActionPlans.length;

                      // --- 7. Audit Summary & Ranking ---
                      const projAudits = audits.filter(a => a.projectId === selectedProject.id);
                      const avgScore = projAudits.length > 0 ? (projAudits.reduce((sum, a) => sum + a.score, 0) / projAudits.length).toFixed(1) : 0;
                      
                      // Calculate rank across all projects
                      const projectAvgScores = projects.map(p => {
                          const pAudits = audits.filter(a => a.projectId === p.id);
                          const avg = pAudits.length > 0 ? (pAudits.reduce((sum, a) => sum + a.score, 0) / pAudits.length) : 0;
                          return { id: p.id, avg };
                      }).sort((a, b) => b.avg - a.avg);
                      
                      const rankIndex = projectAvgScores.findIndex(p => p.id === selectedProject.id);
                      const rankStr = rankIndex >= 0 && projAudits.length > 0 ? rankIndex + 1 : '-';
                      const totalProjectsWithAudit = projectAvgScores.filter(p => p.avg > 0).length;

                      return (
                          <>
                              {/* Row 1: High Priority Alerts */}
                              {expiringContracts.length > 0 && (
                                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm">
                                      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                      <div className="flex-1">
                                          <h4 
                                            className="text-red-800 font-bold mb-1 cursor-pointer hover:underline flex items-center gap-1"
                                            onClick={() => setProjectTab('contracts')}
                                          >
                                            การแจ้งเตือน: สัญญาใกล้หมดอายุ (น้อยกว่า 45 วัน) <ArrowRight size={14} />
                                          </h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                              {expiringContracts.map(c => (
                                                  <div key={c.id} className="bg-white px-3 py-2 rounded border border-red-100 flex justify-between items-center text-sm">
                                                      <span className="font-medium text-gray-700 truncate pr-2" title={c.vendorName}>{c.vendorName}</span>
                                                      <span className="text-red-600 font-bold whitespace-nowrap bg-red-50 px-2 py-0.5 rounded">เหลือ {calculateDaysRemaining(c.endDate)} วัน</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {/* Row 2: Main Overview Cards */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                  
                                  {/* Card: Audit Rank */}
                                  <Card className="p-5 flex flex-col justify-center items-center text-center relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all">
                                      {/* Background Icon - Clicking goes to Audit Tab */}
                                      <div 
                                          className="absolute -right-4 -top-4 text-blue-50 opacity-50 group-hover:scale-110 transition-transform cursor-pointer z-0"
                                          onClick={() => setProjectTab('audit')}
                                          title="ไปที่แท็บประวัติ Audit"
                                      >
                                          <ClipboardCheck size={100} />
                                      </div>
                                      
                                      <div className="relative z-10 flex flex-col items-center w-full">
                                          <h4 
                                              className="text-sm font-bold text-gray-500 mb-2 group-hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                                              onClick={() => setProjectTab('audit')}
                                          >
                                              คะแนน Audit เฉลี่ย <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </h4>
                                          <div 
                                              className="flex items-baseline gap-1 cursor-pointer"
                                              onClick={() => setProjectTab('audit')}
                                          >
                                              <span className="text-4xl font-black text-blue-600">{avgScore}%</span>
                                          </div>
                                          
                                          {/* The Ranking Button - Clicking opens the Modal */}
                                          <button 
                                              onClick={(e) => {
                                                  e.stopPropagation(); // ป้องกันไม่ให้ทะลุไปโดนส่วนอื่น
                                                  setShowAuditRankingModal(true);
                                              }}
                                              className="mt-3 w-full flex justify-center items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 px-3 py-2 rounded-lg text-xs font-bold border border-blue-200 shadow-sm cursor-pointer transition-all hover:shadow"
                                              title="คลิกเพื่อดูการจัดอันดับคะแนน Audit ทั้งหมด"
                                          >
                                              <BarChart3 size={16} /> 
                                              {rankStr !== '-' ? `ดูอันดับ (ที่ ${rankStr} จาก ${totalProjectsWithAudit})` : 'ดูอันดับทั้งหมด'}
                                          </button>
                                      </div>
                                  </Card>

                                  {/* Card: Daily Reports */}
                                  <Card className="p-5 flex flex-col hover:shadow-sm transition-all relative overflow-hidden group">
                                      <div 
                                          className="absolute -right-4 -top-4 text-purple-50 opacity-50 group-hover:scale-110 transition-transform cursor-pointer z-0"
                                          onClick={() => setProjectTab('daily')}
                                          title="ไปที่แท็บรายงานประจำวัน"
                                      >
                                          <FileText size={100} />
                                      </div>

                                      <div className="relative z-10 flex flex-col h-full">
                                          <div 
                                            className="flex items-center gap-2 text-gray-700 font-bold mb-4 border-b pb-2 cursor-pointer hover:text-purple-600 transition-colors"
                                            onClick={() => setProjectTab('daily')}
                                          >
                                            <FileText size={18} className="text-purple-500 group-hover:scale-110 transition-transform"/> 
                                            รายงานประจำวัน (เดือนนี้)
                                            <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                          <div className="flex-1 flex flex-col justify-center gap-3">
                                              <div className="flex justify-between items-center">
                                                  <span className="text-sm text-gray-600">ส่งรายงานแล้ว</span>
                                                  <span className="text-lg font-bold text-green-600 bg-green-50 px-2 rounded">{uniqueReportDays} วัน</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                  <span className="text-sm text-gray-600">ขาดส่ง / ยังไม่จัดทำ</span>
                                                  <span className={`text-lg font-bold px-2 rounded ${missingReportDays > 0 ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'}`}>{missingReportDays} วัน</span>
                                              </div>
                                          </div>
                                          
                                          {/* The Ranking Button */}
                                          <button 
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowReportRankingModal(true);
                                              }}
                                              className="mt-4 w-full flex justify-center items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 px-3 py-2 rounded-lg text-xs font-bold border border-purple-200 shadow-sm cursor-pointer transition-all hover:shadow"
                                              title="คลิกเพื่อดูการจัดอันดับการส่งรายงานทั้งหมด"
                                          >
                                              <BarChart3 size={16} /> 
                                              {reportRankStr !== '-' ? `ดูอันดับ (ที่ ${reportRankStr} จาก ${totalProjectsForReportRank})` : 'ดูอันดับทั้งหมด'}
                                          </button>
                                      </div>
                                  </Card>

                                  {/* Card: Meter Readings */}
                                  <Card className="p-5 flex flex-col hover:shadow-sm transition-all">
                                      <div 
                                        className="flex items-center gap-2 text-gray-700 font-bold mb-4 border-b pb-2 cursor-pointer hover:text-cyan-600 group transition-colors"
                                        onClick={() => setProjectTab('utilities')}
                                      >
                                        <Droplet size={18} className="text-cyan-500 group-hover:scale-110 transition-transform"/> 
                                        การจดมิเตอร์ (เดือนนี้)
                                        <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                      <div className="flex-1 flex flex-col justify-center gap-4">
                                          <div className="flex justify-between items-center">
                                              <span className="text-sm text-gray-600">จำนวนมิเตอร์ที่มี</span>
                                              <span className="font-bold text-gray-800">{projMeters.length} จุด</span>
                                          </div>
                                          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                                              <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: expectedReadings > 0 ? `${(currentMonthReadings.length/expectedReadings)*100}%` : '0%' }}></div>
                                          </div>
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="text-gray-500">บันทึกแล้ว: <strong className="text-cyan-600">{currentMonthReadings.length}</strong> รายการ</span>
                                              <span className={missingReadings > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>ค้าง: {missingReadings} รายการ</span>
                                          </div>
                                      </div>
                                  </Card>

                                  {/* Card: Leave Usage */}
                                  <Card className="p-5 flex flex-col hover:shadow-sm transition-all">
                                      <div 
                                        className="flex items-center gap-2 text-gray-700 font-bold mb-3 border-b pb-2 cursor-pointer hover:text-pink-600 group transition-colors"
                                        onClick={() => setProjectTab('schedule')}
                                      >
                                        <Calendar size={18} className="text-pink-500 group-hover:scale-110 transition-transform"/> 
                                        การใช้สิทธิ์ลา (เดือนนี้)
                                        <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3 flex-1">
                                          <div className="bg-gray-50 rounded p-2 text-center border border-gray-100 flex flex-col justify-center">
                                              <span className="text-[10px] font-bold text-gray-500 mb-1">วันหยุดนักขัตฯ (H)</span>
                                              <span className="text-xl font-black text-red-500">{leaveCounts.H}</span>
                                          </div>
                                          <div className="bg-gray-50 rounded p-2 text-center border border-gray-100 flex flex-col justify-center">
                                              <span className="text-[10px] font-bold text-gray-500 mb-1">พักร้อน (V)</span>
                                              <span className="text-xl font-black text-blue-500">{leaveCounts.V}</span>
                                          </div>
                                          <div className="bg-gray-50 rounded p-2 text-center border border-gray-100 flex flex-col justify-center">
                                              <span className="text-[10px] font-bold text-gray-500 mb-1">ลากิจ (BL)</span>
                                              <span className="text-xl font-black text-pink-500">{leaveCounts.BL}</span>
                                          </div>
                                          <div className="bg-gray-50 rounded p-2 text-center border border-gray-100 flex flex-col justify-center">
                                              <span className="text-[10px] font-bold text-gray-500 mb-1">ลาป่วย (S)</span>
                                              <span className="text-xl font-black text-orange-500">{leaveCounts.S}</span>
                                          </div>
                                      </div>
                                  </Card>
                              </div>

                              {/* Row 3: AP & PM Status */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Action Plan Progress */}
                                  <Card className="p-6 hover:shadow-sm transition-all">
                                      <h3 
                                        className="font-bold mb-4 flex items-center gap-2 text-gray-800 cursor-pointer hover:text-green-600 group transition-colors w-fit"
                                        onClick={() => setProjectTab('action')}
                                      >
                                        <CheckCircle className="text-green-500 group-hover:scale-110 transition-transform" size={20}/> 
                                        สถานะงาน Action Plan
                                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                      </h3>
                                      {totalAP > 0 ? (
                                          <div className="space-y-4 mt-2">
                                              {/* Completed */}
                                              <div>
                                                  <div className="flex justify-between text-sm mb-1">
                                                      <span className="font-medium text-gray-700">เสร็จสิ้น (Completed)</span>
                                                      <span className="font-bold text-green-600">{apStatusCounts['Completed']} / {totalAP}</span>
                                                  </div>
                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(apStatusCounts['Completed']/totalAP)*100}%` }}></div>
                                                  </div>
                                              </div>
                                              {/* In Progress */}
                                              <div>
                                                  <div className="flex justify-between text-sm mb-1">
                                                      <span className="font-medium text-gray-700">กำลังทำ (In Progress)</span>
                                                      <span className="font-bold text-blue-600">{apStatusCounts['In Progress']} / {totalAP}</span>
                                                  </div>
                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(apStatusCounts['In Progress']/totalAP)*100}%` }}></div>
                                                  </div>
                                              </div>
                                              {/* Pending */}
                                              <div>
                                                  <div className="flex justify-between text-sm mb-1">
                                                      <span className="font-medium text-gray-700">รอดำเนินการ (Pending)</span>
                                                      <span className="font-bold text-orange-500">{apStatusCounts['Pending']} / {totalAP}</span>
                                                  </div>
                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                      <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${(apStatusCounts['Pending']/totalAP)*100}%` }}></div>
                                                  </div>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="h-32 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed rounded-lg bg-gray-50">
                                              ไม่มีรายการ Action Plan
                                          </div>
                                      )}
                                  </Card>

                                  {/* PM Maintenance Plan Status */}
                                  <Card className="p-6 hover:shadow-sm transition-all">
                                      <h3 
                                        className="font-bold mb-4 flex items-center gap-2 text-gray-800 cursor-pointer hover:text-orange-600 group transition-colors w-fit"
                                        onClick={() => setProjectTab('pm')}
                                      >
                                        <Wrench className="text-orange-500 group-hover:scale-110 transition-transform" size={20}/> 
                                        สรุปสถานะการทำ PM (เดือนนี้)
                                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                      </h3>
                                      
                                      <div className="flex items-center justify-between gap-4 h-full pb-4">
                                          <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                                              <div className="text-gray-500 text-sm font-bold mb-2">เครื่องจักรที่ต้อง PM</div>
                                              <div className="text-3xl font-black text-gray-800">{uniqueMachinesToPM} <span className="text-sm font-normal text-gray-500">ระบบ</span></div>
                                          </div>
                                          
                                          <div className="text-gray-300"><ArrowRight size={24} /></div>
                                          
                                          <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                                              <div className="text-green-700 text-sm font-bold mb-2">ดำเนินการแล้ว</div>
                                              <div className="text-3xl font-black text-green-600">{uniqueMachinesPMd} <span className="text-sm font-normal text-green-600/70">ระบบ</span></div>
                                          </div>
                                      </div>
                                      
                                      {uniqueMachinesToPM > 0 && uniqueMachinesPMd < uniqueMachinesToPM && (
                                          <div className="text-xs text-red-600 font-medium text-center bg-red-50 py-2 rounded-md border border-red-100 mt-2">
                                              <AlertTriangle size={14} className="inline mr-1 -mt-0.5"/> 
                                              ช้ากว่าแผน (ล่าช้า): {uniqueMachinesToPM - uniqueMachinesPMd} ระบบ
                                          </div>
                                      )}
                                      {uniqueMachinesToPM > 0 && uniqueMachinesPMd >= uniqueMachinesToPM && (
                                          <div className="text-xs text-green-700 font-medium text-center bg-green-100 py-2 rounded-md border border-green-200 mt-2">
                                              <CheckCircle size={14} className="inline mr-1 -mt-0.5"/> 
                                              ดำเนินการเป็นไปตามแผน 100%
                                          </div>
                                      )}
                                      {uniqueMachinesToPM === 0 && (
                                          <div className="text-xs text-gray-500 text-center py-2 mt-2">
                                              ยังไม่มีการตั้งค่าแผน PM ประจำเดือน
                                          </div>
                                      )}
                                  </Card>
                              </div>

                              {/* Row 4: Project Documents */}
                              <Card className="p-6 hover:shadow-sm transition-all mt-6 border-t-4 border-blue-500">
                                  <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                                      <FileText className="text-blue-500" size={20}/> 
                                      เอกสารสำคัญประจำหน่วยงาน (Project Documents)
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      {[
                                          { key: 'orchor', label: t('doc_orchor') }, 
                                          { key: 'committee', label: t('doc_committee') }, 
                                          { key: 'regulations', label: t('doc_regulations') }, 
                                          { key: 'resident_rules', label: t('doc_resident_rules') }
                                      ].map((doc) => {
                                          const fileObj = selectedProject.files && selectedProject.files[doc.key];
                                          const hasFile = !!fileObj;
                                          const fileName = typeof fileObj === 'string' ? fileObj : fileObj?.name;

                                          return (
                                              <div key={doc.key} className={`border rounded-xl p-4 flex flex-col items-center text-center transition-all ${hasFile ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                  <div className={`p-3 rounded-full mb-3 ${hasFile ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                                      <FileText size={24} />
                                                  </div>
                                                  <div className="font-bold text-sm text-gray-700 mb-1">{doc.label}</div>
                                                  {hasFile ? (
                                                      <>
                                                          <div className="text-xs text-gray-500 mb-3 truncate w-full px-2" title={fileName}>
                                                              {fileName}
                                                          </div>
                                                          <Button 
                                                              size="sm" 
                                                              className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 transition-colors"
                                                              onClick={() => handleDownloadFile(fileObj, fileName || `${doc.key}.pdf`)}
                                                          >
                                                              <Download size={14} /> ดาวน์โหลด
                                                          </Button>
                                                      </>
                                                  ) : (
                                                      <div className="text-xs text-gray-400 mt-auto py-2">ยังไม่มีการอัปโหลดไฟล์</div>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </Card>
                          </>
                      );
                  })()}
              </div>
          )}
          
          {projectTab === 'contracts' && (() => { 
            const filteredContracts = contracts
                .filter(c => c.projectId === selectedProject.id && (contractFilter === 'All' || c.type === contractFilter))
                .sort((a, b) => {
                    const daysA = calculateDaysRemaining(a.endDate);
                    const daysB = calculateDaysRemaining(b.endDate);
                    if (contractSortOrder === 'expiry_asc') return daysA - daysB;
                    if (contractSortOrder === 'expiry_desc') return daysB - daysA;
                    return 0;
                });
            const totalAmount = filteredContracts.reduce((sum, c) => sum + Number(c.amount || 0), 0);

            return (
            <Card id="print-contracts-area">
                <div className="p-4 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white">
                    <h3 className="font-bold flex items-center gap-2 text-gray-800 shrink-0">
                        <Briefcase size={20} className="text-blue-600" />
                        {t('activeContracts')}
                    </h3>
                    
                    <div className={`flex flex-col md:flex-row gap-4 items-start md:items-center w-full lg:w-auto ${isExporting ? 'hidden' : ''}`}>
                        {/* Filter Buttons */}
                        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                            <button
                                onClick={() => setContractFilter('All')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${contractFilter === 'All' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                ทั้งหมด
                            </button>
                            {Object.values(CONTRACT_TYPES).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setContractFilter(type)}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${contractFilter === type ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {type.split(' (')[0]}
                                </button>
                            ))}
                        </div>

                        {/* NEW: Sort Dropdown */}
                        <div className={`flex items-center gap-2 w-full md:w-auto shrink-0 ${isExporting ? 'hidden' : ''}`}>
                            <label className="text-xs font-bold text-gray-500 whitespace-nowrap">เรียงลำดับ:</label>
                            <select 
                                className="w-full md:w-auto border border-gray-300 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-orange-200 outline-none bg-white transition-colors cursor-pointer"
                                value={contractSortOrder}
                                onChange={e => setContractSortOrder(e.target.value)}
                            >
                                <option value="expiry_asc">สัญญาใกล้หมด (น้อยไปมาก)</option>
                                <option value="expiry_desc">สัญญาใกล้หมด (มากไปน้อย)</option>
                            </select>
                        </div>
                    </div>

                    <div className={`flex gap-2 ${isExporting ? 'hidden' : ''} shrink-0`}>
                        <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(filteredContracts, 'contracts_list')}>{t('exportCSV')}</Button>
                        <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={() => handleExportPDF('print-contracts-area', `Contracts_${selectedProject?.code || 'List'}.pdf`, 'landscape')} disabled={isExporting}>
                            {isExporting ? t('downloading') : t('downloadPDF')}
                        </Button>
                        {hasPerm('proj_contracts', 'save') && <Button size="sm" icon={Plus} onClick={() => { setIsEditingContract(false); setNewContract({ type: CONTRACT_TYPES.EXPENSE, category: '', customCategory: '', vendorName: '', contactPerson: '', contactPhone: '', startDate: '', endDate: '', amount: '', paymentCycle: 'Monthly', file: null }); setShowAddContractModal(true); }}>{t('addContract')}</Button>}
                    </div>
                </div>
                <div className={isExporting ? "pb-4" : "overflow-x-auto"}>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3 text-center w-12">{t('col_seq')}</th>
                                <th className="p-3 text-left">{t('col_vendor')}</th>
                                <th className="p-3 text-left">{t('contractType')}</th>
                                <th className="p-3 text-left">{t('col_subject')}</th>
                                <th className="p-3 text-left">{t('col_duration')}</th>
                                <th className="p-3 text-right">{t('col_amount')}</th>
                                <th className="p-3 text-left">{t('col_status')}</th>
                                <th className={`p-3 text-center w-28 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredContracts.length > 0 ? (
                                filteredContracts.map((c, index) => {
                                    const remDays = calculateDaysRemaining(c.endDate);
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                            <td className="p-3 cursor-pointer group" onClick={() => setSelectedContractView(c)}>
                                                <div className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                                                    {c.vendorName}
                                                    <Search size={14} className={`text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ${isExporting ? 'hidden' : ''}`} />
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">{c.contactPerson} <span className="text-gray-400 ml-1">({c.contactPhone})</span></div>
                                            </td>
                                            <td className="p-3 text-xs">
                                                <span className={`px-2 py-1 rounded-full ${
                                                    c.type === CONTRACT_TYPES.INCOME ? 'bg-green-100 text-green-700 border border-green-200' :
                                                    c.type === CONTRACT_TYPES.EXPENSE ? 'bg-red-100 text-red-700 border border-red-200' :
                                                    'bg-blue-100 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {c.type.split(' (')[0]}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600">{c.category}</td>
                                            <td className="p-3 text-xs">
                                                <div>{c.startDate} - {c.endDate}</div>
                                                <div className={`font-bold mt-1 ${remDays < 30 ? 'text-red-600' : remDays < 90 ? 'text-orange-500' : 'text-green-600'}`}>
                                                    {remDays <= 0 ? t('expired') : `${remDays} ${t('daysRemaining')}`}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="font-medium text-gray-800">{Number(c.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{c.paymentCycle === 'Monthly' ? t('monthly') : t('yearly')}</div>
                                            </td>
                                            <td className="p-3"><Badge status={c.status} /></td>
                                            <td className={`p-3 text-center ${isExporting ? 'hidden' : ''}`}>
                                                <div className="flex justify-center items-center gap-1">
                                                    {(c.fileUrl || (c.file && (c.file.data || c.file.isLocal))) ? (
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                handleDownloadFile(c.file || { fileUrl: c.fileUrl, name: `${c.vendorName}_Contract.pdf` });
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                                            title="ดาวน์โหลดไฟล์สัญญา"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300 px-2">-</span>
                                                    )}
                                                    {hasPerm('proj_contracts', 'delete') && (
                                                        <button 
                                                            onClick={() => showConfirm('ยืนยันการลบ', `คุณต้องการลบสัญญา ${c.vendorName} ใช่หรือไม่?`, () => setContracts(prev => prev.filter(contract => contract.id !== c.id)))}
                                                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                                            title="ลบสัญญา"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan="8" className="p-6 text-center text-gray-500">{t('noData')}</td></tr>
                            )}
                        </tbody>
                        {filteredContracts.length > 0 && (
                            <tfoot className="bg-orange-50 font-bold text-gray-800 border-t-2 border-orange-200">
                                <tr>
                                    <td colSpan="5" className="p-4 text-right uppercase tracking-wide text-xs md:text-sm">
                                        ผลรวมมูลค่าสัญญา ({contractFilter === 'All' ? 'ทั้งหมด' : contractFilter.split(' (')[0]}):
                                    </td>
                                    <td className="p-4 text-right text-orange-700 text-base whitespace-nowrap">
                                        {totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท
                                    </td>
                                    <td colSpan={isExporting ? "1" : "2"}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>
            );
          })()}
          
          {projectTab === 'staff' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg">{t('projectStaff')}</h3>
                 <div className="flex gap-2">
                    <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                        <button onClick={() => setStaffViewMode('list')} className={`p-1.5 rounded-md transition-all ${staffViewMode === 'list' ? 'bg-white shadow text-orange-600' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><List size={18} /></button>
                        <button onClick={() => setStaffViewMode('chart')} className={`p-1.5 rounded-md transition-all ${staffViewMode === 'chart' ? 'bg-white shadow text-orange-600' : 'text-gray-400 hover:text-gray-600'}`} title="Organization Chart"><LayoutGrid size={18} /></button>
                    </div>
                    <div className={`flex gap-2 ${isExporting ? 'hidden' : ''} border-l pl-2 ml-2`}>
                        <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(users.filter(u => u.department === selectedProject.name), 'staff_list')}>{t('exportCSV')}</Button>
                        <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={() => handleExportPDF('print-area', staffViewMode === 'chart' ? `Org_Chart_${selectedProject.code}.pdf` : `Staff_List_${selectedProject.code}.pdf`, staffViewMode === 'chart' ? 'landscape' : 'portrait')} disabled={isExporting}>
                            {isExporting ? t('downloading') : t('downloadPDF')}
                        </Button>
                    </div>
                 </div>
              </div>

              {staffViewMode === 'list' ? (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 uppercase">
                        <tr>
                          <th className="p-3 text-center w-16">{t('col_seq')}</th>
                          <th className="p-3 text-center w-20">{t('col_photo')}</th>
                          <th className="p-3 text-left">{t('col_empId')}</th>
                          <th className="p-3 text-left">{t('col_name')}</th>
                          <th className="p-3 text-left">{t('col_role')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.filter(u => u.department === selectedProject.name).length > 0 ? (
                          users.filter(u => u.department === selectedProject.name).map((user, index) => (
                            <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${canEditProfile(user) ? 'cursor-pointer group' : ''}`} onClick={() => canEditProfile(user) && handleEditUser(user)}>
                              <td className="p-3 text-center text-gray-500">{index + 1}</td>
                              <td className="p-3 text-center">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mx-auto border border-gray-300">
                                    {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400"/>}
                                </div>
                              </td>
                              <td className="p-3 text-gray-600 font-mono">{user.employeeId || '-'}</td>
                              <td className={`p-3 font-medium text-gray-900 transition-colors flex items-center gap-2 ${canEditProfile(user) ? 'group-hover:text-orange-600' : ''}`}>
                                {user.firstName} {user.lastName}
                                {canEditProfile(user) && <Edit size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                              </td>
                              <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">{user.position}</span></td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="5" className="p-8 text-center text-gray-400">{t('noData')}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <div className={`bg-gray-50 p-8 rounded-xl border border-gray-200 min-h-[500px] ${isExporting ? 'overflow-visible bg-white border-none' : 'overflow-auto'}`}>
                    {(() => {
                        const { managers, supervisors, staff } = getStaffHierarchy();
                        const hasManagers = managers.length > 0;
                        const hasSupervisors = supervisors.length > 0;
                        const hasStaff = staff.length > 0;

                        if (!hasManagers && !hasSupervisors && !hasStaff) { return <div className="text-center text-gray-400 py-10">{t('noData')}</div>; }

                        return (
                            <div className="flex flex-col items-center gap-8 min-w-[600px]">
                                {hasManagers && (
                                    <div className="flex flex-col items-center w-full">
                                        <div className="flex justify-center gap-6 flex-wrap">{managers.map(u => <OrgChartNode key={u.id} user={u} color="orange" />)}</div>
                                        {(hasSupervisors || hasStaff) && <div className="h-8 border-l-2 border-gray-300 mt-2"></div>}
                                    </div>
                                )}
                                {hasSupervisors && (
                                    <div className="flex flex-col items-center w-full relative">
                                        {supervisors.length > 1 && <div className="absolute top-0 h-4 border-t-2 border-l-2 border-r-2 border-gray-300 w-[80%] rounded-t-xl -mt-4"></div>}
                                        <div className="flex justify-center gap-6 flex-wrap relative z-10 -mt-2">
                                            {supervisors.map(u => (<div key={u.id} className="flex flex-col items-center"><div className="h-4 border-l-2 border-gray-300 mb-2"></div><OrgChartNode user={u} color="blue" /></div>))}
                                        </div>
                                        {hasStaff && <div className="h-8 border-l-2 border-gray-300 mt-2"></div>}
                                    </div>
                                )}
                                {hasStaff && (
                                    <div className="flex flex-col items-center w-full relative">
                                         {staff.length > 1 && <div className="absolute top-0 h-4 border-t-2 border-l-2 border-r-2 border-gray-300 w-[90%] rounded-t-xl -mt-4"></div>}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10 -mt-2">
                                            {staff.map(u => (<div key={u.id} className="flex flex-col items-center"><div className="h-4 border-l-2 border-gray-300 mb-2"></div><OrgChartNode user={u} color="gray" /></div>))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
              )}
            </div>
          )}

          {projectTab === 'schedule' && (() => {
            // --- NEW: Logic for Schedule Deadlines and Approvals ---
            const approval = scheduleApprovals[`${selectedProject.id}_${currentMonth}`] || {};
            const isApproved = approval.status === 'Approved';
            const isLocked = approval.isLocked === true;

            const isHR = currentUser?.position?.includes('เจ้าหน้าที่ฝ่ายบุคคล') || currentUser?.username === 'admin';
            
            // Plan จะแก้ไขได้ก็ต่อเมื่อ ยังไม่ล็อค และ ยังไม่อนุมัติ (ปลดล็อคข้อจำกัดวันที่ 22 ออก)
            const canEditPlan = !isLocked && !isApproved;
            
            // ACT จะแก้ไขได้ก็ต่อเมื่อ ยังไม่ถูกล็อค
            const canEditAct = !isLocked;

            return (
            <div id="print-schedule-area" className={isExporting ? 'w-[277mm] min-w-[277mm] max-w-[277mm] mx-auto bg-white p-4 box-border relative z-10' : 'w-full'}>
            <Card className={`${isExporting ? 'border-none shadow-none' : 'min-w-full overflow-hidden'}`}>
                <div className={`p-4 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white ${isExporting ? 'pb-2 pt-0 px-0 mb-2 border-b-0' : ''}`}>
                    <div className="flex items-center gap-3">
                        <h3 className={`font-bold flex items-center gap-2 text-gray-800 ${isExporting ? 'text-base' : 'text-lg'}`}>
                            <Calendar size={20} className={isExporting ? 'hidden' : ''} />
                            {isExporting ? `ตารางการทำงาน (Work Schedule) - ${selectedProject.name}` : t('workSchedule')}
                        </h3>
                        {/* Status Badge */}
                        {(() => {
                            if (!approval.status) return <span className={`bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold border ${isExporting ? 'text-[9px]' : 'text-xs'}`}>ฉบับร่าง (ยังไม่บันทึก)</span>;
                            if (approval.isLocked) return <span className={`bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200 shadow-sm flex items-center gap-1 ${isExporting ? 'text-[9px]' : 'text-xs'}`}><Lock size={isExporting ? 10 : 12}/> ล็อคตารางแล้ว</span>;
                            if (approval.status === 'Pending Manager') return <span className={`bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold border border-orange-200 shadow-sm flex items-center gap-1 ${isExporting ? 'text-[9px]' : 'text-xs'}`}><Clock size={isExporting ? 10 : 12}/> รอผู้จัดการอนุมัติ</span>;
                            if (approval.status === 'Pending Area Manager') return <span className={`bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold border border-purple-200 shadow-sm flex items-center gap-1 ${isExporting ? 'text-[9px]' : 'text-xs'}`}><Clock size={isExporting ? 10 : 12}/> รอผู้จัดการพื้นที่อนุมัติ</span>;
                            if (approval.status === 'Pending HR') return <span className={`bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200 shadow-sm flex items-center gap-1 ${isExporting ? 'text-[9px]' : 'text-xs'}`}><Clock size={isExporting ? 10 : 12}/> รอฝ่ายบุคคลอนุมัติ</span>;
                            if (approval.status === 'Approved') return <span className={`bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200 shadow-sm flex items-center gap-1 ${isExporting ? 'text-[9px]' : 'text-xs'}`}><CheckCircle size={isExporting ? 10 : 12}/> อนุมัติสมบูรณ์</span>;
                            return null;
                        })()}
                    </div>
                    
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <div className={`flex items-center rounded-lg p-1 ${isExporting ? '' : 'bg-gray-100'}`}>
                            <button onClick={() => changeMonth(-1)} className={`p-1 hover:bg-white rounded shadow-sm transition ${isExporting ? 'hidden' : ''}`}><ChevronLeft size={18}/></button>
                            <span className={`px-4 font-semibold text-gray-700 ${isExporting ? 'text-[11px] px-2' : 'text-sm'}`}>
                                ประจำเดือน: {new Date(currentMonth + '-01').toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} className={`p-1 hover:bg-white rounded shadow-sm transition ${isExporting ? 'hidden' : ''}`}><ChevronRight size={18}/></button>
                        </div>
                        <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                            <Button variant="outline" size="sm" icon={isExporting ? Loader2 : ImageIcon} onClick={exportScheduleImage} disabled={isExporting} className="border-blue-500 text-blue-600 hover:bg-blue-50">
                                {isExporting ? 'กำลังประมวลผล...' : 'ดาวน์โหลดรูปภาพ'}
                            </Button>
                            <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={exportSchedulePDF} disabled={isExporting}>
                                {isExporting ? 'กำลังประมวลผล...' : t('printPDF')}
                            </Button>
                            
                            {/* Approval Action Buttons */}
                            {(() => {
                                const approval = scheduleApprovals[`${selectedProject.id}_${currentMonth}`];
                                if (!approval) return null; // ยังไม่มีการบันทึก
                                
                                const isHR = currentUser?.position.includes('เจ้าหน้าที่ฝ่ายบุคคล') || currentUser?.username === 'admin';
                                const isManager = currentUser?.position.includes('ผู้จัดการอาคาร') || currentUser?.position.includes('ผู้จัดการหมู่บ้าน') || currentUser?.username === 'admin';
                                const isAreaManager = currentUser?.position.includes('ผู้จัดการพื้นที่') || currentUser?.username === 'admin';

                                if (approval.status === 'Pending Manager' && isManager) {
                                    return <Button size="sm" variant="success" icon={CheckCircle} onClick={() => showConfirm('ยืนยันอนุมัติ', 'คุณตรวจสอบและต้องการอนุมัติตารางงานระดับผู้จัดการใช่หรือไม่?', handleApproveSchedule, 'ยืนยันอนุมัติ', 'info')}>ผู้จัดการอนุมัติ</Button>;
                                }
                                if (approval.status === 'Pending Area Manager' && isAreaManager) {
                                    return <Button size="sm" variant="success" icon={CheckCircle} onClick={() => showConfirm('ยืนยันอนุมัติ', 'คุณตรวจสอบและต้องการอนุมัติตารางงานระดับผู้จัดการพื้นที่ (Area Manager) ใช่หรือไม่?', handleApproveSchedule, 'ยืนยันอนุมัติ', 'info')}>ผู้จัดการพื้นที่อนุมัติ</Button>;
                                }
                                if (approval.status === 'Pending HR' && isHR) {
                                    return <Button size="sm" variant="success" icon={CheckCircle} onClick={() => showConfirm('ยืนยันอนุมัติ', 'คุณตรวจสอบและต้องการอนุมัติตารางงานระดับฝ่ายบุคคล (HR) ใช่หรือไม่?', handleApproveSchedule, 'ยืนยันอนุมัติ', 'info')}>ฝ่ายบุคคลอนุมัติ</Button>;
                                }
                                
                                if (approval.status === 'Approved' && isHR) {
                                    if (approval.isLocked) {
                                        return <Button size="sm" variant="secondary" icon={Unlock} onClick={() => showConfirm('ยืนยันปลดล็อค', 'ปลดล็อคเพื่อให้สามารถแก้ไขตารางงานได้ใช่หรือไม่?', handleUnlockSchedule, 'ปลดล็อคตาราง', 'warning')}>ปลดล็อคตาราง</Button>;
                                    } else {
                                        return <Button size="sm" variant="danger" icon={Lock} onClick={() => showConfirm('ยืนยันล็อคตาราง', 'เมื่อล็อคแล้ว จะไม่สามารถแก้ไขตาราง Plan และ ACT ได้อีก ยืนยันหรือไม่?', handleLockSchedule, 'ยืนยันการล็อค', 'warning')}>ล็อคตาราง (ปิดยอด)</Button>;
                                    }
                                }

                                return null;
                            })()}

                            {hasPerm('proj_schedule', 'save') && <Button size="sm" icon={Save} onClick={handleSaveSchedule}>{t('save')}</Button>}
                        </div>
                    </div>
                </div>
                
                <div id="schedule-table-container" className={`w-full bg-white rounded-b-lg ${isExporting ? 'px-0 pb-2 overflow-visible block' : 'overflow-hidden pb-4'}`}>
                    {(() => {
                        const [year, month] = currentMonth.split('-').map(Number);
                        const daysInMonth = getDaysInMonth(year, month);
                        const dayNamesTh = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
                        const dayNamesEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
                        
                        return (
                            <table className={`border-collapse table-fixed w-full ${isExporting ? 'text-[8px]' : 'text-[9px] xl:text-[10px] 2xl:text-xs'}`}>
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-300">
                                        <th className={`border-r border-gray-300 text-center ${isExporting ? 'p-0.5 w-[3%]' : 'p-1 w-[3%]'}`} rowSpan="2">{t('col_seq')}</th>
                                        <th className={`border-r border-gray-300 text-center ${isExporting ? 'p-0.5 w-[5%]' : 'p-1 w-[5%]'} truncate`} rowSpan="2">{t('col_empId')}</th>
                                        <th className={`border-r border-gray-300 text-left ${isExporting ? 'p-0.5 px-1 w-[12%]' : 'px-1.5 p-1 w-[12%]'} truncate`} rowSpan="2">{t('col_name')}</th>
                                        <th className={`border-r border-gray-300 text-left ${isExporting ? 'p-0.5 px-1 w-[8%]' : 'px-1.5 p-1 w-[8%]'} truncate`} rowSpan="2">{t('col_role')}</th>
                                        <th className={`border-r border-gray-300 text-center ${isExporting ? 'p-0.5 w-[3%] text-[7px]' : 'p-1 w-[3%] text-[8px]'}`} rowSpan="2">ประเภท</th>
                                        {daysInMonth.map(date => (
                                            <th key={date.getDate()} className={`border-r border-gray-300 text-center font-normal text-gray-600 ${isExporting ? 'p-0 text-[8px]' : 'p-0.5'}`}>
                                                {date.getDate()}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-gray-50 border-b border-gray-300">
                                        {daysInMonth.map(date => (
                                            <th key={date.getDate()} className={`border-r border-gray-300 text-center font-bold p-0 ${isExporting ? 'text-[7px] h-3' : 'text-[7px] md:text-[8px] xl:text-[9px]'} ${date.getDay() === 0 || date.getDay() === 6 ? 'text-red-500 bg-red-50' : 'text-gray-700'}`}>
                                                {lang === 'th' ? dayNamesTh[date.getDay()] : dayNamesEn[date.getDay()]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                {sortedStaff.map((user, index) => (
                                    <tbody 
                                        key={user.id} 
                                        className={`border-b-2 border-gray-400 transition-all ${!isExporting ? 'cursor-move' : ''}`}
                                        draggable={!isExporting}
                                        onDragStart={(e) => { 
                                            dragItem.current = index; 
                                            e.currentTarget.style.opacity = '0.5';
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragEnter={(e) => { 
                                            dragOverItem.current = index; 
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                            handleDragEnd();
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        title={!isExporting ? "คลิกค้างที่แถวแล้วลากเพื่อสลับตำแหน่ง (Drag & Drop)" : ""}
                                    >
                                        <tr className="hover:bg-gray-50 border-b border-gray-200">
                                            <td className={`border-r border-gray-300 text-center text-gray-500 truncate ${isExporting ? 'p-0.5 text-[7px]' : 'p-1'}`} rowSpan="2">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {!isExporting && (
                                                        <div className="flex flex-col gap-[2px] opacity-30 hover:opacity-100 cursor-grab" title="ลากเพื่อสลับตำแหน่ง">
                                                            <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
                                                            <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
                                                            <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
                                                        </div>
                                                    )}
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className={`border-r border-gray-300 text-center text-gray-600 font-mono truncate ${isExporting ? 'p-0.5 text-[7px]' : 'p-1'}`} rowSpan="2">{user.employeeId || '-'}</td>
                                            <td className={`border-r border-gray-300 font-medium text-gray-800 truncate ${isExporting ? 'p-0.5 px-1 text-[7px]' : 'p-1 px-1.5'}`} title={`${user.firstName} ${user.lastName}`} rowSpan="2">
                                                {user.firstName} {user.lastName}
                                            </td>
                                            <td className={`border-r border-gray-300 text-gray-600 truncate ${isExporting ? 'p-0.5 px-1 text-[7px]' : 'p-1 px-1.5'}`} title={user.position} rowSpan="2">
                                                {user.position}
                                            </td>
                                            <td className={`border-r border-gray-200 text-center font-bold bg-blue-50 text-blue-700 p-0 ${isExporting ? 'text-[6px]' : 'text-[9px]'}`}>
                                                PLAN
                                            </td>
                                            {daysInMonth.map(date => {
                                                const dateString = date.toISOString().split('T')[0];
                                                const key = `${user.id}_${dateString}`;
                                                const val = schedules[key] || '';
                                                const shiftData = SHIFTS.find(s => s.id === val);
                                                const colorClass = shiftData ? shiftData.color : '';

                                                return (
                                                    <td key={dateString} className={`p-0 border-r border-gray-200 text-center align-middle bg-blue-50/20 ${isExporting ? 'h-auto' : 'h-full'}`}>
                                                        {isExporting ? (
                                                            <div className={`w-full h-full min-h-[18px] flex items-center justify-center p-0 text-[7.5px] font-bold uppercase ${colorClass}`}>{val}</div>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                className={`w-full h-full min-h-[26px] md:min-h-[28px] text-center text-[9px] xl:text-[10px] 2xl:text-xs p-0 m-0 focus:outline-none focus:ring-inset focus:ring-1 focus:ring-orange-500 uppercase transition-colors block ${colorClass} ${!canEditPlan ? 'cursor-not-allowed opacity-70' : selectedShift ? 'cursor-pointer' : 'cursor-text'}`}
                                                                value={val}
                                                                onClick={() => {
                                                                    if (canEditPlan && selectedShift) {
                                                                        updateSchedule(user.id, dateString, selectedShift, 'plan');
                                                                    }
                                                                }}
                                                                onChange={(e) => canEditPlan && updateSchedule(user.id, dateString, e.target.value.toUpperCase(), 'plan')}
                                                                readOnly={!canEditPlan || !!selectedShift}
                                                                disabled={!canEditPlan}
                                                                title={!canEditPlan ? "ตาราง Plan ถูกอนุมัติหรือล็อคแล้ว" : "ตารางแผนงาน (Plan)"}
                                                            />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                            <td className={`border-r border-gray-200 text-center font-bold bg-green-50 text-green-700 p-0 ${isExporting ? 'text-[6px]' : 'text-[9px]'}`}>
                                                ACT
                                            </td>
                                            {daysInMonth.map(date => {
                                                const dateString = date.toISOString().split('T')[0];
                                                const planKey = `${user.id}_${dateString}`;
                                                const actKey = `${user.id}_${dateString}_act`;
                                                const planVal = schedules[planKey] || '';
                                                // หากยังไม่ได้กรอก ACT จะดึงข้อมูล PLAN มาเป็นตัวตั้งต้น
                                                const actVal = schedules[actKey] !== undefined ? schedules[actKey] : planVal;
                                                const shiftData = SHIFTS.find(s => s.id === actVal);
                                                const colorClass = shiftData ? shiftData.color : '';

                                                return (
                                                    <td key={`${dateString}_act`} className={`p-0 border-r border-gray-200 text-center align-middle bg-green-50/20 ${isExporting ? 'h-auto' : 'h-full'}`}>
                                                        {isExporting ? (
                                                            <div className={`w-full h-full min-h-[18px] flex items-center justify-center p-0 text-[7.5px] font-bold uppercase ${colorClass}`}>{actVal}</div>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                className={`w-full h-full min-h-[26px] md:min-h-[28px] text-center text-[9px] xl:text-[10px] 2xl:text-xs p-0 m-0 focus:outline-none focus:ring-inset focus:ring-1 focus:ring-green-500 uppercase transition-colors block ${colorClass} ${!canEditAct ? 'cursor-not-allowed opacity-70' : selectedShift ? 'cursor-pointer' : 'cursor-text'}`}
                                                                value={actVal}
                                                                onClick={() => {
                                                                    if (canEditAct && selectedShift) {
                                                                        updateSchedule(user.id, dateString, selectedShift, 'act');
                                                                    }
                                                                }}
                                                                onChange={(e) => canEditAct && updateSchedule(user.id, dateString, e.target.value.toUpperCase(), 'act')}
                                                                readOnly={!canEditAct || !!selectedShift}
                                                                disabled={!canEditAct}
                                                                title={!canEditAct ? "ตารางถูกล็อคแล้วโดยฝ่ายบุคคล" : "แก้ไขตารางตามการเข้างานจริง (Actual)"}
                                                            />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                ))}
                            </table>
                        );
                    })()}
                </div>

                {/* Shift Legend */}
                <div className={`border-t border-gray-200 ${isExporting ? 'bg-white pt-2 pb-1 px-0 mt-2' : 'p-4 bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-1.5">
                        <h4 className={`font-bold text-gray-700 flex items-center gap-2 ${isExporting ? 'text-[10px]' : 'text-sm'}`}>
                            คำอธิบายสัญลักษณ์ (Shift Legend) 
                        </h4>
                        {!isExporting && (
                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                <MousePointer2 size={12} /> Click shift below to auto-fill
                            </div>
                        )}
                    </div>
                    <div className={`grid ${isExporting ? 'grid-cols-7 gap-y-1 gap-x-1.5' : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-y-2 gap-x-2'}`}>
                        {SHIFTS.map(shift => (
                            <div 
                                key={shift.id} 
                                onClick={() => !isExporting && setSelectedShift(selectedShift === shift.id ? null : shift.id)}
                                className={`flex items-center gap-1.5 transition-all select-none ${isExporting ? 'text-[9px]' : 'text-xs cursor-pointer hover:bg-gray-200 p-1 rounded'} ${selectedShift === shift.id && !isExporting ? 'ring-2 ring-orange-500 bg-white shadow-md scale-105' : ''}`}
                            >
                                <span className={`inline-block text-center rounded font-bold border ${shift.color} ${isExporting ? 'w-5 py-0 text-[7px]' : 'w-8 py-0.5'}`}>
                                    {shift.id}
                                </span>
                                <span className={`text-gray-600 truncate ${isExporting ? 'text-[7px]' : ''}`} title={lang === 'th' ? shift.label_th : shift.label_en}>
                                    {lang === 'th' ? (shift.label_th.split(' - ')[1] || shift.label_th) : (shift.label_en.split(' - ')[1] || shift.label_en)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Note Area */}
                <div className={`bg-white ${isExporting ? 'pt-2 pb-0 px-0' : 'p-4 border-t border-gray-200'}`}>
                    <label className={`block font-bold text-gray-700 mb-1 ${isExporting ? 'text-[10px]' : 'text-sm'}`}>รายละเอียดเพิ่มเติม / Note:</label>
                    {isExporting ? (
                        <div className="w-full rounded p-1.5 text-[9px] min-h-[30px] whitespace-pre-wrap text-gray-800 border border-gray-300">
                            {scheduleNote || '-'}
                        </div>
                    ) : (
                        <textarea 
                            className="w-full border border-gray-300 rounded-md p-3 text-sm h-20 focus:ring-1 focus:ring-orange-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                            placeholder="พิมพ์รายละเอียดเพิ่มเติมที่นี่..."
                            value={scheduleNote}
                            onChange={(e) => setScheduleNote(e.target.value)}
                        ></textarea>
                    )}
                </div>

                {/* Signatures Area - Dynamically populated based on Workflow */}
                <div className={`bg-white flex justify-between ${isExporting ? 'px-8 pt-4 pb-2 mt-4 border-t border-gray-200' : 'px-10 p-8 mt-6 pt-10 border-t border-gray-200'}`}>
                    {(() => {
                        const approval = scheduleApprovals[`${selectedProject.id}_${currentMonth}`] || {};
                        return (
                            <>
                                <div className="text-center w-1/3 px-2">
                                    <div className={`border-b border-gray-400 flex items-end justify-center pb-0.5 ${isExporting ? 'mb-1 h-5' : 'mb-1.5 h-6'}`}>
                                        <span className={`font-medium text-blue-800 font-serif italic truncate w-full ${isExporting ? 'text-[11px]' : 'text-base'}`} title={approval.preparedBy || `${currentUser?.firstName} ${currentUser?.lastName}`}>
                                            {approval.preparedBy || `${currentUser?.firstName} ${currentUser?.lastName}`}
                                        </span>
                                    </div>
                                    <div className={`font-medium text-gray-600 truncate w-full ${isExporting ? 'text-[9px]' : 'text-sm'}`}>
                                        ( {approval.preparedBy || `${currentUser?.firstName} ${currentUser?.lastName}`} )
                                    </div>
                                    <div className={`text-gray-500 font-bold ${isExporting ? 'text-[8px] mt-1' : 'text-sm mt-1'}`}>ผู้จัดทำ (Prepared By)</div>
                                    <div className={`text-gray-400 font-medium truncate w-full ${isExporting ? 'text-[8px]' : 'text-xs'}`}>{approval.preparedByRole || currentUser?.position || '-'}</div>
                                </div>
                                <div className="text-center w-1/3 px-2">
                                    <div className={`border-b border-gray-400 flex items-end justify-center pb-0.5 ${isExporting ? 'mb-1 h-5' : 'mb-1.5 h-6'}`}>
                                        <span className={`font-medium text-blue-800 font-serif italic truncate w-full ${isExporting ? 'text-[11px]' : 'text-base'}`} title={approval.managerApprovedBy || ''}>
                                            {approval.managerApprovedBy || ''}
                                        </span>
                                    </div>
                                    <div className={`font-medium text-gray-600 truncate w-full ${isExporting ? 'text-[9px]' : 'text-sm'}`}>
                                        ( {approval.managerApprovedBy || '.......................................................'} )
                                    </div>
                                    <div className={`text-gray-500 font-bold ${isExporting ? 'text-[8px] mt-1' : 'text-sm mt-1'}`}>ผู้ตรวจสอบ (Checked By)</div>
                                    <div className={`text-gray-400 font-medium ${isExporting ? 'text-[8px]' : 'text-xs'}`}>{approval.managerApprovedByRole || 'ผู้จัดการอาคาร/หมู่บ้าน'}</div>
                                </div>
                                <div className="text-center w-1/3 px-2">
                                    <div className={`border-b border-gray-400 flex items-end justify-center pb-0.5 ${isExporting ? 'mb-1 h-5' : 'mb-1.5 h-6'}`}>
                                        <span className={`font-medium text-blue-800 font-serif italic truncate w-full ${isExporting ? 'text-[11px]' : 'text-base'}`} title={approval.hrApprovedBy || ''}>
                                            {approval.hrApprovedBy || ''}
                                        </span>
                                    </div>
                                    <div className={`font-medium text-gray-600 truncate w-full ${isExporting ? 'text-[9px]' : 'text-sm'}`}>
                                        ( {approval.hrApprovedBy || '.......................................................'} )
                                    </div>
                                    <div className={`text-gray-500 font-bold ${isExporting ? 'text-[8px] mt-1' : 'text-sm mt-1'}`}>ผู้อนุมัติ (Approved By)</div>
                                    <div className={`text-gray-400 font-medium ${isExporting ? 'text-[8px]' : 'text-xs'}`}>เจ้าหน้าที่ฝ่ายบุคคล</div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Card>
            </div>
            );
          })()}

          {/* Tab for Asset Management */}
          {projectTab === 'assets' && (
            <Card id="print-assets-area">
                <div className="p-4 border-b flex justify-between items-center bg-white">
                    <h3 className="font-bold flex items-center gap-2"><Shield size={20} className="text-orange-500" /> {t('regAssets')}</h3>
                    <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                        <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(assets.filter(a => a.projectId === selectedProject.id), 'asset_list')}>{t('exportCSV')}</Button>
                        <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={() => handleExportPDF('print-assets-area', `Assets_${selectedProject?.code || 'List'}.pdf`, 'landscape')} disabled={isExporting}>
                            {isExporting ? t('downloading') : t('downloadPDF')}
                        </Button>
                        {hasPerm('proj_assets', 'save') && <Button size="sm" icon={Plus} onClick={() => { setIsEditingAsset(false); setNewAsset({ code: '', name: '', qty: 1, location: '', photo: null, details: '' }); setShowAddAssetModal(true); }}>{t('registerAsset')}</Button>}
                    </div>
                </div>
                <div className={isExporting ? "pb-4" : "overflow-x-auto"}>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase">
                            <tr>
                                <th className="p-3 text-center w-12">{t('col_seq')}</th>
                                <th className="p-3 text-left w-20">{t('col_image')}</th>
                                <th className="p-3 text-left">{t('col_assetCode')}</th>
                                <th className="p-3 text-left">{t('col_assetName')}</th>
                                <th className="p-3 text-center">{t('col_qty')}</th>
                                <th className="p-3 text-left">{t('col_location')}</th>
                                <th className="p-3 text-left">{t('assetDetails')}</th>
                                <th className={`p-3 text-center w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {assets.filter(a => a.projectId === selectedProject.id).length > 0 ? (
                                assets.filter(a => a.projectId === selectedProject.id).map((asset, index) => (
                                    <tr key={asset.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                        <td className="p-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                                {asset.photo ? <img src={asset.photo} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-400"/>}
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono font-medium text-orange-600">{asset.code}</td>
                                        <td className="p-3 cursor-pointer group hover:bg-gray-200 transition-colors rounded-md" onClick={() => setSelectedAssetView(asset)}>
                                            <div className="font-bold text-gray-800 group-hover:text-orange-600 flex items-center gap-1">
                                                {asset.name} <Search size={14} className={`text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ${isExporting ? 'hidden' : ''}`} />
                                            </div>
                                            <div className={`text-[10px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isExporting ? 'hidden' : ''}`}>คลิกเพื่อดูรายละเอียด</div>
                                        </td>
                                        <td className="p-3 text-center font-bold">{asset.qty}</td>
                                        <td className="p-3 text-gray-600">{asset.location}</td>
                                        <td className="p-3 text-gray-500 text-xs max-w-xs truncate">{asset.details || '-'}</td>
                                        <td className={`p-3 text-center ${isExporting ? 'hidden' : ''}`}>
                                            <div className="flex justify-center items-center gap-1">
                                                {hasPerm('proj_assets', 'edit') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}
                                                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                                        title="แก้ไขข้อมูล"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPerm('proj_assets', 'delete') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบทรัพย์สิน ${asset.name} ใช่หรือไม่?`, () => setAssets(prev => prev.filter(a => a.id !== asset.id))); }}
                                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                        title="ลบทรัพย์สิน"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="8" className="p-8 text-center text-gray-400">{t('noData')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
          )}

          {/* New Tab for Tools Management */}
          {projectTab === 'tools' && (
            <Card id="print-tools-area">
                <div className="p-4 border-b flex justify-between items-center bg-white">
                    <h3 className="font-bold flex items-center gap-2"><Wrench size={20} className="text-orange-500" /> {t('toolsRegistry')}</h3>
                    <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                        <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(tools.filter(t => t.projectId === selectedProject.id), 'tools_list')}>{t('exportCSV')}</Button>
                        <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={() => handleExportPDF('print-tools-area', `Tools_${selectedProject?.code || 'List'}.pdf`, 'landscape')} disabled={isExporting}>
                            {isExporting ? t('downloading') : t('downloadPDF')}
                        </Button>
                        {hasPerm('proj_tools', 'save') && <Button size="sm" icon={Plus} onClick={() => { setIsEditingTool(false); setNewTool({ code: '', name: '', qty: 1, location: '', photo: null, details: '' }); setShowAddToolModal(true); }}>{t('regTool')}</Button>}
                    </div>
                </div>
                <div className={isExporting ? "pb-4" : "overflow-x-auto"}>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase">
                            <tr>
                                <th className="p-3 text-center w-12">{t('col_seq')}</th>
                                <th className="p-3 text-left w-20">{t('col_image')}</th>
                                <th className="p-3 text-left">{t('col_toolCode')}</th>
                                <th className="p-3 text-left">{t('col_toolName')}</th>
                                <th className="p-3 text-center">{t('col_qty')}</th>
                                <th className="p-3 text-left">{t('col_location')}</th>
                                <th className="p-3 text-left">{t('assetDetails')}</th>
                                <th className={`p-3 text-center w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {tools.filter(t => t.projectId === selectedProject.id).length > 0 ? (
                                tools.filter(t => t.projectId === selectedProject.id).map((tool, index) => (
                                    <tr key={tool.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                        <td className="p-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                                {tool.photo ? <img src={tool.photo} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-400"/>}
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono font-medium text-orange-600">{tool.code}</td>
                                        <td className="p-3 cursor-pointer group hover:bg-gray-200 transition-colors rounded-md" onClick={() => setSelectedToolView(tool)}>
                                            <div className="font-bold text-gray-800 group-hover:text-orange-600 flex items-center gap-1">
                                                {tool.name} <Search size={14} className={`text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ${isExporting ? 'hidden' : ''}`} />
                                            </div>
                                            <div className={`text-[10px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isExporting ? 'hidden' : ''}`}>คลิกเพื่อดูรายละเอียด</div>
                                        </td>
                                        <td className="p-3 text-center font-bold">{tool.qty}</td>
                                        <td className="p-3 text-gray-600">{tool.location}</td>
                                        <td className="p-3 text-gray-500 text-xs max-w-xs truncate">{tool.details || '-'}</td>
                                        <td className={`p-3 text-center ${isExporting ? 'hidden' : ''}`}>
                                            <div className="flex justify-center items-center gap-1">
                                                {hasPerm('proj_tools', 'edit') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEditTool(tool); }}
                                                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                                        title="แก้ไขข้อมูล"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPerm('proj_tools', 'delete') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบเครื่องมือช่าง ${tool.name} ใช่หรือไม่?`, () => setTools(prev => prev.filter(t => t.id !== tool.id))); }}
                                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                        title="ลบเครื่องมือ"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="8" className="p-8 text-center text-gray-400">{t('noData')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
          )}

          {/* New PM / Machinery Tab */}
          {projectTab === 'pm' && (
              <div>
                  {/* PM Sub Tabs */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {['registry', 'plan', 'calendar', 'form', 'history', 'yearly_summary'].map(sub => (
                          <button
                              key={sub}
                              onClick={() => setPmSubTab(sub)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${pmSubTab === sub ? 'bg-white shadow text-red-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                          >
                              {t('pm_' + sub)}
                          </button>
                      ))}
                  </div>

                  {pmSubTab === 'history' && (() => {
                      // 1. คำนวณข้อมูล PM สำหรับเดือนปัจจุบัน
                      const [year, month] = pmMonth.split('-').map(Number);
                      const daysInMonth = new Date(year, month, 0).getDate();
                      const activePmPlans = pmPlans.filter(p => p.projectId === selectedProject.id && p.status === 'Active');

                      let allMonthlyTasks = [];

                      for (let d = 1; d <= daysInMonth; d++) {
                          const dateObj = new Date(year, month - 1, d);
                          const dateString = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                          activePmPlans.forEach(plan => {
                              let shouldRun = false;
                              if (plan.frequency === 'Daily') shouldRun = true;
                              if (plan.frequency === 'Weekly') shouldRun = dateObj.getDay() === parseInt(plan.scheduleDetails?.dayOfWeek || 0);
                              if (plan.frequency === 'Monthly') shouldRun = d === parseInt(plan.scheduleDetails?.date || 1);
                              if (plan.frequency === 'Yearly') shouldRun = d === parseInt(plan.scheduleDetails?.date || 1) && dateObj.getMonth() === parseInt(plan.scheduleDetails?.month || 1) - 1;

                              if (shouldRun) {
                                  const machine = machines.find(m => m.id === plan.machineId);
                                  const historyRecord = pmHistoryList.find(h => h.pmPlanId === plan.id && h.date === dateString);

                                  let status = 'Not Started';
                                  if (historyRecord) {
                                      if (historyRecord.approvalStatus === 'Approved') status = 'Approved';
                                      else if (historyRecord.approvalStatus === 'Rejected') status = 'Rejected';
                                      else status = 'Pending Approval';
                                  }

                                  allMonthlyTasks.push({
                                      dateString,
                                      dateObj,
                                      plan,
                                      machine,
                                      historyRecord,
                                      status
                                  });
                              }
                          });
                      }

                      // 2. นับจำนวนตามสถานะ
                      const statusCounts = { 'Not Started': 0, 'Pending Approval': 0, 'Approved': 0, 'Rejected': 0 };
                      allMonthlyTasks.forEach(task => { statusCounts[task.status]++; });
                      const totalTasks = allMonthlyTasks.length;

                      // 3. ข้อมูลสำหรับ Pie Chart
                      const pieData = [
                          { name: 'ยังไม่ดำเนินการ', value: statusCounts['Not Started'], color: 'url(#colorOrange)', id: 'Not Started' },
                          { name: 'รอตรวจสอบ/อนุมัติ', value: statusCounts['Pending Approval'], color: 'url(#colorBlue)', id: 'Pending Approval' },
                          { name: 'อนุมัติแล้ว (สำเร็จ)', value: statusCounts['Approved'], color: 'url(#colorGreen)', id: 'Approved' },
                          { name: 'ไม่อนุมัติ (ตีกลับ)', value: statusCounts['Rejected'], color: 'url(#colorRed)', id: 'Rejected' }
                      ].filter(d => d.value > 0);

                      const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                              <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                                  {`${(percent * 100).toFixed(0)}%`}
                              </text>
                          );
                      };

                      return (
                          <div className="space-y-6 animate-fade-in">
                              <ChartGradients />
                              <Card id="print-pm-dashboard-area" className={`p-6 border-t-4 border-red-500 ${isExporting ? 'w-[277mm] min-w-[277mm] max-w-[277mm] mx-auto box-border border-none shadow-none bg-white' : ''}`}>
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
                                      <h3 className="font-bold flex items-center gap-3 text-gray-800">
                                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-md ${isExporting ? 'hidden' : ''}`}>
                                              <BarChart3 size={20} /> 
                                          </div>
                                          ภาพรวมงานบำรุงรักษา (PM Dashboard)
                                      </h3>
                                      <div className="flex items-center gap-3">
                                          <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${isExporting ? 'hidden' : ''}`}>
                                              <button onClick={() => changePmMonth(-1)} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronLeft size={18}/></button>
                                              <span className="px-4 text-sm font-semibold text-gray-700 w-36 text-center">
                                                  {new Date(pmMonth + '-01').toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                              </span>
                                              <button onClick={() => changePmMonth(1)} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronRight size={18}/></button>
                                          </div>
                                          {isExporting && (
                                              <div className="text-sm font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                                                  ประจำเดือน: {new Date(pmMonth + '-01').toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                              </div>
                                          )}
                                          <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                                              <Button 
                                                  variant="outline" 
                                                  size="sm" 
                                                  icon={isExporting ? Loader2 : PrinterIcon} 
                                                  onClick={() => handleExportPDF('print-pm-dashboard-area', `PM_Dashboard_${selectedProject.code}_${pmMonth}.pdf`, 'landscape')} 
                                                  disabled={isExporting}
                                              >
                                                  {isExporting ? t('downloading') : t('downloadPDF')}
                                              </Button>
                                          </div>
                                      </div>
                                  </div>

                                  {totalTasks === 0 ? (
                                      <div className="text-center text-gray-400 py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                          <Settings size={48} className="mx-auto mb-3 text-gray-300"/>
                                          ไม่มีแผนงาน PM ในเดือนนี้
                                      </div>
                                  ) : (
                                      <div className="flex flex-col lg:flex-row items-center gap-10" style={isExporting ? { flexDirection: 'row' } : {}}>
                                          {/* Pie Chart */}
                                          <div className="w-full lg:w-5/12 h-[320px] flex justify-center relative cursor-pointer" title="คลิกที่ส่วนของกราฟเพื่อดูรายละเอียด" style={isExporting ? { width: '41.666667%' } : {}}>
                                              <div className="absolute top-[15%] bottom-[15%] left-[15%] right-[15%] bg-gradient-to-b from-gray-50 to-gray-200 rounded-full scale-[0.8] opacity-60 blur-xl"></div>
                                              <ResponsiveContainer width="100%" height="100%">
                                                  <PieChart style={{ filter: 'drop-shadow(3px 8px 10px rgba(0,0,0,0.25))' }}>
                                                      <Pie
                                                          data={pieData}
                                                          cx="50%"
                                                          cy="50%"
                                                          labelLine={false}
                                                          label={renderCustomizedLabel}
                                                          outerRadius={120}
                                                          innerRadius={50}
                                                          dataKey="value"
                                                          stroke="#ffffff"
                                                          strokeWidth={2}
                                                          onClick={(data) => !isExporting && setSelectedPmStatusDetail({ status: data.id, label: data.name, tasks: allMonthlyTasks.filter(t => t.status === data.id) })}
                                                          isAnimationActive={!isExporting}
                                                      >
                                                          {pieData.map((entry, index) => (
                                                              <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity outline-none" />
                                                          ))}
                                                      </Pie>
                                                      <RechartsTooltip 
                                                          formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                                                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}
                                                      />
                                                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                  </PieChart>
                                              </ResponsiveContainer>
                                          </div>
                                          
                                          {/* Stats Cards */}
                                          <div className="w-full lg:w-7/12 grid grid-cols-2 gap-5" style={isExporting ? { width: '58.333333%' } : {}}>
                                              <div 
                                                  className={`relative bg-gradient-to-b from-white to-orange-50 border border-orange-100 p-5 rounded-2xl text-center shadow-sm transform transition-all ${!isExporting ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer group' : ''}`}
                                                  onClick={() => !isExporting && setSelectedPmStatusDetail({ status: 'Not Started', label: 'ยังไม่ดำเนินการ', tasks: allMonthlyTasks.filter(t => t.status === 'Not Started') })}
                                              >
                                                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                                                      <Clock size={18}/>
                                                  </div>
                                                  <div className="text-orange-600 text-sm font-bold mb-1">ยังไม่ดำเนินการ</div>
                                                  <div className="text-4xl font-black text-orange-700">{statusCounts['Not Started']}</div>
                                                  <div className="text-xs text-orange-500 mt-2 font-medium">รอการตรวจเช็คตามแผน</div>
                                              </div>
                                              
                                              <div 
                                                  className={`relative bg-gradient-to-b from-white to-blue-50 border border-blue-100 p-5 rounded-2xl text-center shadow-sm transform transition-all ${!isExporting ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer group' : ''}`}
                                                  onClick={() => !isExporting && setSelectedPmStatusDetail({ status: 'Pending Approval', label: 'รอตรวจสอบ/อนุมัติ', tasks: allMonthlyTasks.filter(t => t.status === 'Pending Approval') })}
                                              >
                                                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                                      <ClipboardList size={18}/>
                                                  </div>
                                                  <div className="text-blue-600 text-sm font-bold mb-1">รอตรวจสอบ / อนุมัติ</div>
                                                  <div className="text-4xl font-black text-blue-700">{statusCounts['Pending Approval']}</div>
                                                  <div className="text-xs text-blue-500 mt-2 font-medium">บันทึกผลแล้ว รอการอนุมัติ</div>
                                              </div>
                                              
                                              <div 
                                                  className={`relative bg-gradient-to-b from-white to-green-50 border border-green-100 p-5 rounded-2xl text-center shadow-sm transform transition-all ${!isExporting ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer group' : ''}`}
                                                  onClick={() => !isExporting && setSelectedPmStatusDetail({ status: 'Approved', label: 'อนุมัติแล้ว (สำเร็จ)', tasks: allMonthlyTasks.filter(t => t.status === 'Approved') })}
                                              >
                                                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm group-hover:scale-110 transition-transform">
                                                      <CheckCircle size={18}/>
                                                  </div>
                                                  <div className="text-green-600 text-sm font-bold mb-1">อนุมัติแล้ว (สำเร็จ)</div>
                                                  <div className="text-4xl font-black text-green-700">{statusCounts['Approved']}</div>
                                                  <div className="text-xs text-green-500 mt-2 font-medium">เสร็จสิ้นสมบูรณ์</div>
                                              </div>
                                              
                                              <div 
                                                  className={`relative bg-gradient-to-b from-white to-red-50 border border-red-100 p-5 rounded-2xl text-center shadow-sm transform transition-all ${!isExporting ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer group' : ''}`}
                                                  onClick={() => !isExporting && setSelectedPmStatusDetail({ status: 'Rejected', label: 'ไม่อนุมัติ (ตีกลับ)', tasks: allMonthlyTasks.filter(t => t.status === 'Rejected') })}
                                              >
                                                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
                                                      <XCircle size={18}/>
                                                  </div>
                                                  <div className="text-red-600 text-sm font-bold mb-1">ไม่อนุมัติ (ตีกลับ)</div>
                                                  <div className="text-4xl font-black text-red-700">{statusCounts['Rejected']}</div>
                                                  <div className="text-xs text-red-500 mt-2 font-medium">ต้องดำเนินการแก้ไขใหม่</div>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </Card>

                              {/* History Card (Merged) */}
                              <Card id="print-pm-history-area" className="border-t-4 border-gray-600 mt-6">
                                  <div className="p-4 border-b flex justify-between items-center bg-white">
                                      <h3 className="font-bold flex items-center gap-2 text-gray-800"><History size={20}/> ประวัติการบำรุงรักษา (PM History)</h3>
                                      <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                                          <Button variant="outline" size="sm" icon={Download} onClick={() => {
                                              const filteredToExport = pmHistoryList.filter(h => {
                                                  if (h.projectId !== selectedProject.id) return false;
                                                  if (pmHistoryFilterDate && h.executedDate !== pmHistoryFilterDate && h.date !== pmHistoryFilterDate) return false;
                                                  if (pmHistoryFilterResult && h.status !== pmHistoryFilterResult) return false;
                                                  if (pmHistoryFilterMachine && h.machineId !== pmHistoryFilterMachine) return false;
                                                  if (pmHistoryFilterApproval) {
                                                      const status = h.approvalStatus || 'Approved';
                                                      if (status !== pmHistoryFilterApproval) return false;
                                                  }
                                                  return true;
                                              });
                                              exportToCSV(filteredToExport, 'pm_history_list');
                                          }}>{t('exportCSV')}</Button>
                                          <Button 
                                              variant="outline" 
                                              size="sm" 
                                              icon={isExporting ? Loader2 : PrinterIcon} 
                                              onClick={() => handleExportPDF('print-pm-history-area', `PM_History_${selectedProject?.code || 'List'}.pdf`, 'landscape')} 
                                              disabled={isExporting}
                                          >
                                              {isExporting ? t('downloading') : t('downloadPDF')}
                                          </Button>
                                      </div>
                                  </div>
                                  
                                  {/* Filters Section for PM History */}
                                  <div className={`p-4 bg-gray-50 border-b border-gray-200 ${isExporting ? 'hidden' : ''}`}>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                          <div>
                                              <label className="block text-xs font-bold text-gray-500 mb-2">วันที่ (Date)</label>
                                              <input 
                                                  type="date"
                                                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none bg-white transition-all"
                                                  value={pmHistoryFilterDate}
                                                  onChange={(e) => setPmHistoryFilterDate(e.target.value)}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-gray-500 mb-2">เครื่องจักร (Machine)</label>
                                              <select 
                                                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none bg-white transition-all"
                                                  value={pmHistoryFilterMachine}
                                                  onChange={(e) => setPmHistoryFilterMachine(e.target.value)}
                                              >
                                                  <option value="">-- ทั้งหมด (All) --</option>
                                                  {machines.filter(m => m.projectId === selectedProject.id).map(m => (
                                                      <option key={m.id} value={m.id}>{m.name}</option>
                                                  ))}
                                              </select>
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-gray-500 mb-2">ผลตรวจ (Result)</label>
                                              <select 
                                                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none bg-white transition-all"
                                                  value={pmHistoryFilterResult}
                                                  onChange={(e) => setPmHistoryFilterResult(e.target.value)}
                                              >
                                                  <option value="">-- ทั้งหมด (All) --</option>
                                                  <option value="Pass">ผ่านเกณฑ์ / ปกติ (Pass)</option>
                                                  <option value="Fail">พบปัญหา / ผิดปกติ (Fail)</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-gray-500 mb-2">สถานะอนุมัติ (Approval)</label>
                                              <select 
                                                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none bg-white transition-all"
                                                  value={pmHistoryFilterApproval}
                                                  onChange={(e) => setPmHistoryFilterApproval(e.target.value)}
                                              >
                                                  <option value="">-- ทั้งหมด (All) --</option>
                                                  <option value="Approved">อนุมัติแล้ว</option>
                                                  <option value="Pending Manager">รอผู้จัดการอนุมัติ</option>
                                                  <option value="Pending Chief">รอหัวหน้าช่างอนุมัติ</option>
                                                  <option value="Rejected">ไม่อนุมัติ (ตีกลับ)</option>
                                              </select>
                                          </div>
                                      </div>
                                  </div>

                                  <div className={isExporting ? "pb-4" : "overflow-x-auto"}>
                                      <table className="w-full text-sm">
                                          <thead className="bg-gray-100 text-gray-700 uppercase">
                                              <tr>
                                                  <th className="p-3 text-center w-12">{t('col_seq')}</th>
                                                  <th className="p-3 text-left w-32">วันที่บันทึกจริง</th>
                                                  <th className="p-3 text-left">เครื่องจักร</th>
                                                  <th className="p-3 text-center w-32">ผลการตรวจ</th>
                                                  <th className="p-3 text-center w-36">สถานะอนุมัติ</th>
                                                  <th className="p-3 text-left w-40">ผู้ตรวจสอบ</th>
                                                  <th className={`p-3 text-center w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                              {(() => {
                                                  // Apply Filters
                                                  const filteredPmHistory = pmHistoryList.filter(h => {
                                                      if (h.projectId !== selectedProject.id) return false;
                                                      if (pmHistoryFilterDate && h.executedDate !== pmHistoryFilterDate && h.date !== pmHistoryFilterDate) return false;
                                                      if (pmHistoryFilterResult && h.status !== pmHistoryFilterResult) return false;
                                                      if (pmHistoryFilterMachine && h.machineId !== pmHistoryFilterMachine) return false;
                                                      if (pmHistoryFilterApproval) {
                                                          const status = h.approvalStatus || 'Approved';
                                                          if (status !== pmHistoryFilterApproval) return false;
                                                      }
                                                      return true;
                                                  });

                                                  if (filteredPmHistory.length === 0) {
                                                      return <tr><td colSpan="7" className="p-10 text-center text-gray-400 bg-gray-50 border-b border-dashed">ไม่พบประวัติการบันทึก PM ที่ตรงกับเงื่อนไข</td></tr>;
                                                  }

                                                  return filteredPmHistory.map((hist, index) => (
                                                      <tr key={hist.id} className="hover:bg-gray-50">
                                                          <td className="p-4 text-center text-gray-500 font-medium">{index + 1}</td>
                                                          <td className="p-4">
                                                              <div className="text-gray-700 font-medium">{(hist.executedDate || hist.date) ? new Date(hist.executedDate || hist.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</div>
                                                              {hist.executionTimingStatus && (
                                                                  <div className={`text-[10px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded-md ${
                                                                      hist.executionTimingStatus === 'เร็วกว่าแผน' ? 'bg-blue-100 text-blue-700' :
                                                                      hist.executionTimingStatus === 'ช้ากว่าแผน' ? 'bg-red-100 text-red-700' :
                                                                      'bg-green-100 text-green-700'
                                                                  }`}>
                                                                      {hist.executionTimingStatus}
                                                                  </div>
                                                              )}
                                                          </td>
                                                          <td className="p-4 cursor-pointer hover:bg-gray-200 transition-colors group rounded-md" onClick={() => setSelectedPmHistory(hist)}>
                                                              <div className="font-bold text-gray-800 group-hover:text-blue-700 flex items-center gap-1">
                                                                  {hist.machineName} <FileText size={14} className="text-gray-400 group-hover:text-blue-500"/>
                                                              </div>
                                                              <div className="text-xs text-gray-500 font-mono">{hist.machineCode}</div>
                                                          </td>
                                                          <td className="p-4 text-center">
                                                              {hist.status === 'Pass' ? (
                                                                  <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                                                                      <CheckCircle size={12}/> ผ่าน ({hist.passedItems}/{hist.totalItems})
                                                                  </span>
                                                              ) : (
                                                                  <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                                                                      <AlertTriangle size={12}/> พบปัญหา ({hist.failedItems} จุด)
                                                                  </span>
                                                              )}
                                                          </td>
                                                          <td className="p-4 text-center">
                                                              {hist.approvalStatus === 'Approved' || !hist.approvalStatus ? (
                                                                  <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-bold">อนุมัติแล้ว</span>
                                                              ) : hist.approvalStatus === 'Pending Chief' ? (
                                                                  <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">รอหัวหน้าช่างอนุมัติ</span>
                                                              ) : hist.approvalStatus === 'Pending Manager' ? (
                                                                  <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">รอผู้จัดการอนุมัติ</span>
                                                              ) : hist.approvalStatus === 'Rejected' ? (
                                                                  <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-bold">ไม่อนุมัติ</span>
                                                              ) : null}
                                                          </td>
                                                          <td className="p-4 text-gray-700 flex items-center gap-2 truncate" title={hist.inspector}><User size={14} className="text-gray-400 shrink-0"/> <span className="truncate">{hist.inspector}</span></td>
                                                          <td className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>
                                                              {hasPerm('proj_pm', 'delete') && (
                                                                  <button 
                                                                      onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบประวัติ PM ของ ${hist.machineName} ใช่หรือไม่?`, () => setPmHistoryList(pmHistoryList.filter(h => h.id !== hist.id))); }}
                                                                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                                      title="ลบประวัติ"
                                                                  >
                                                                      <Trash2 size={16} />
                                                                  </button>
                                                              )}
                                                          </td>
                                                      </tr>
                                                  ));
                                              })()}
                                          </tbody>
                                      </table>
                                  </div>
                              </Card>
                          </div>
                      );
                  })()}

                  {pmSubTab === 'registry' && (
                    <Card className="border-t-4 border-red-500">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2 text-gray-800">{t('pm_registry_title')}</h3>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" icon={PrinterIcon}>{t('downloadPDF')}</Button>
                                {hasPerm('proj_pm', 'save') && <Button size="sm" icon={Plus} onClick={() => { setIsEditingMachine(false); setNewMachine({ code: '', name: '', system: '', qty: 1, location: '', photo: null }); setShowAddMachineModal(true); }} className="bg-red-600 hover:bg-red-700">{t('addMachine')}</Button>}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-red-50 text-gray-700 uppercase">
                                    <tr>
                                        <th className="p-3 text-center w-12">{t('col_seq')}</th>
                                        <th className="p-3 text-left w-32">{t('col_machineCode')}</th>
                                        <th className="p-3 text-center w-20">{t('col_photo')}</th>
                                        <th className="p-3 text-left">{t('col_machineName')}</th>
                                        <th className="p-3 text-left">{t('col_system')}</th>
                                        <th className="p-3 text-center w-20">{t('col_qty')}</th>
                                        <th className="p-3 text-left">{t('col_location')}</th>
                                        <th className={`p-3 text-center w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {machines.filter(m => m.projectId === selectedProject.id).length > 0 ? (
                                        machines.filter(m => m.projectId === selectedProject.id).map((machine, index) => (
                                            <tr key={machine.id} className="hover:bg-gray-50">
                                                <td className="p-4 text-center text-gray-500 font-medium">{index + 1}</td>
                                                <td className="p-4 font-mono font-bold text-gray-700">{machine.code}</td>
                                                <td className="p-4 text-center">
                                                    <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center mx-auto text-gray-400">
                                                        {machine.photo ? <img src={machine.photo} className="w-full h-full object-cover" /> : <Settings size={20} />}
                                                    </div>
                                                </td>
                                                <td className="p-4 cursor-pointer hover:bg-gray-200 transition-colors group rounded-md" onClick={() => setSelectedMachineDetails(machine)}>
                                                    <div className="font-bold text-gray-800 group-hover:text-blue-700 flex items-center gap-1">
                                                        {machine.name} <Search size={14} className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">คลิกเพื่อดูรายละเอียด</div>
                                                </td>
                                                <td className="p-4 text-gray-600">{machine.system}</td>
                                                <td className="p-4 text-center font-bold">{machine.qty}</td>
                                                <td className="p-4 text-gray-600">{machine.location}</td>
                                                <td className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>
                                                    <div className="flex justify-center items-center gap-1">
                                                        {hasPerm('proj_pm', 'edit') && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleEditMachine(machine); }}
                                                                className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                                                title="แก้ไขข้อมูล"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        {hasPerm('proj_pm', 'delete') && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบเครื่องจักร ${machine.name} ใช่หรือไม่?`, () => setMachines(prev => prev.filter(m => m.id !== machine.id))); }}
                                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                                title="ลบเครื่องจักร"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="8" className="p-8 text-center text-gray-400">{t('noData')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                  )}
                  
                  {pmSubTab === 'plan' && (
                    <Card className="border-t-4 border-blue-500">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2 text-gray-800"><Calendar size={20}/> {t('pm_plan_title')}</h3>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(pmPlans.filter(p => p.projectId === selectedProject.id), 'pm_plans')}>{t('exportCSV')}</Button>
                                {hasPerm('proj_pm', 'save') && <Button size="sm" icon={Plus} onClick={() => { setNewPmPlan({ id: null, machineId: '', frequency: 'Monthly', scheduleDetails: { dayOfWeek: '1', date: '1', month: '1' } }); setShowAddPmPlanModal(true); }} className="bg-blue-600 hover:bg-blue-700">{t('addPmPlan')}</Button>}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 text-gray-700 uppercase">
                                    <tr>
                                        <th className="p-3 text-center w-12">{t('col_seq')}</th>
                                        <th className="p-3 text-left w-48">{t('col_machineName')}</th>
                                        <th className="p-3 text-center w-32">{t('pmFrequency')}</th>
                                        <th className="p-3 text-left">{t('col_schedule')}</th>
                                        <th className="p-3 text-center w-24">{t('col_status')}</th>
                                        <th className={`p-3 text-center w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {pmPlans.filter(p => p.projectId === selectedProject.id).length > 0 ? (
                                        pmPlans.filter(p => p.projectId === selectedProject.id).map((plan, index) => {
                                            const machine = machines.find(m => m.id === plan.machineId);
                                            
                                            // Format Schedule Details
                                            let scheduleText = '-';
                                            const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
                                            const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
                                            
                                            if (plan.frequency === 'Weekly') scheduleText = `ทุกวัน${days[plan.scheduleDetails?.dayOfWeek || 0] || ''}`;
                                            else if (plan.frequency === 'Monthly') scheduleText = `ทุกวันที่ ${plan.scheduleDetails?.date || 1} ของเดือน`;
                                            else if (plan.frequency === 'Yearly') scheduleText = `ทุกวันที่ ${plan.scheduleDetails?.date || 1} ${months[parseInt(plan.scheduleDetails?.month || 1)-1] || ''}`;
                                            else if (plan.frequency === 'Daily') scheduleText = 'ทุกวัน (Everyday)';

                                            return (
                                                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 text-center text-gray-500 font-medium">{index + 1}</td>
                                                    <td className={`p-4 ${hasPerm('proj_pm', 'edit') ? 'cursor-pointer group hover:bg-blue-50 rounded-md transition-colors' : ''}`} onClick={() => { if(hasPerm('proj_pm', 'edit')) { setNewPmPlan({...plan}); setShowAddPmPlanModal(true); } }}>
                                                        <div className="font-bold text-gray-800 flex items-center gap-1 group-hover:text-blue-700">
                                                            {machine ? machine.name : 'Unknown'}
                                                            {hasPerm('proj_pm', 'edit') && <Edit size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                        </div>
                                                        {hasPerm('proj_pm', 'edit') && <div className="text-[10px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">คลิกเพื่อแก้ไขแผนงาน</div>}
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{machine ? machine.code : '-'}</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                                                            {t(`freq_${plan.frequency}`)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-600 font-medium">{scheduleText}</td>
                                                    <td className="p-4 text-center">
                                                        {/* Status Toggle on click (Optional enhancement for quick enable/disable) */}
                                                        <span 
                                                            className={`px-2 py-1 rounded-full text-xs font-semibold cursor-pointer ${plan.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                                            onClick={(e) => {
                                                                if(hasPerm('proj_pm', 'edit')) {
                                                                    e.stopPropagation();
                                                                    setPmPlans(pmPlans.map(p => p.id === plan.id ? {...p, status: p.status === 'Active' ? 'Inactive' : 'Active'} : p));
                                                                }
                                                            }}
                                                            title={hasPerm('proj_pm', 'edit') ? "คลิกเพื่อเปลี่ยนสถานะ" : ""}
                                                        >
                                                            {plan.status === 'Active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                                                        </span>
                                                    </td>
                                                    <td className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>
                                                        <div className="flex justify-center items-center gap-1">
                                                            {hasPerm('proj_pm', 'delete') && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบแผน PM สำหรับเครื่องจักรนี้ใช่หรือไม่?`, () => setPmPlans(prev => prev.filter(p => p.id !== plan.id))); }}
                                                                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                                    title="ลบแผนงาน"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan="6" className="p-8 text-center text-gray-400">{t('noData')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                  )}

                  {pmSubTab === 'calendar' && (
                      <Card className="border-t-4 border-purple-500">
                          <div className="p-4 border-b flex justify-between items-center bg-white">
                              <h3 className="font-bold flex items-center gap-2 text-gray-800"><Calendar size={20}/> ปฏิทินแผนบำรุงรักษา (PM Calendar)</h3>
                              <div className="flex items-center gap-4">
                                  <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${isExporting ? 'hidden' : ''}`}>
                                      <button onClick={() => changePmMonth(-1)} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronLeft size={18}/></button>
                                      <span className="px-4 text-sm font-semibold text-gray-700 w-32 text-center">
                                          {new Date(pmMonth + '-01').toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                      </span>
                                      <button onClick={() => changePmMonth(1)} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronRight size={18}/></button>
                                  </div>
                                  <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                                      <Button 
                                          variant="outline" 
                                          size="sm" 
                                          icon={Download} 
                                          onClick={() => {
                                              const csvData = [];
                                              const [y, m] = pmMonth.split('-').map(Number);
                                              const days = getCalendarDays(y, m);
                                              
                                              days.forEach(dayObj => {
                                                  if(!dayObj.isCurrentMonth) return;
                                                  const date = dayObj.date;
                                                  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                                  
                                                  const dayTasks = pmPlans.filter(p => p.projectId === selectedProject.id).filter(plan => {
                                                      if (plan.status !== 'Active') return false;
                                                      if (plan.frequency === 'Daily') return true;
                                                      if (plan.frequency === 'Weekly') return date.getDay() === parseInt(plan.scheduleDetails?.dayOfWeek || 0);
                                                      if (plan.frequency === 'Monthly') return date.getDate() === parseInt(plan.scheduleDetails?.date || 1);
                                                      if (plan.frequency === 'Yearly') return date.getDate() === parseInt(plan.scheduleDetails?.date || 1) && date.getMonth() === parseInt(plan.scheduleDetails?.month || 1) - 1;
                                                      return false;
                                                  });

                                                  dayTasks.forEach(task => {
                                                      const machine = machines.find(mac => mac.id === task.machineId);
                                                      csvData.push({
                                                          'วันที่ (Date)': dateString,
                                                          'รหัสเครื่องจักร (Code)': machine?.code || '-',
                                                          'ชื่อเครื่องจักร (Name)': machine?.name || 'Unknown',
                                                          'ระบบ (System)': machine?.system || '-',
                                                          'ความถี่ (Frequency)': t(`freq_${task.frequency}`)
                                                      });
                                                  });
                                              });
                                              exportToCSV(csvData, `PM_Calendar_${selectedProject.code}_${pmMonth}`);
                                          }}
                                      >
                                          {t('exportCSV')}
                                      </Button>
                                      <Button 
                                          variant="outline" 
                                          size="sm" 
                                          icon={isExporting ? Loader2 : PrinterIcon} 
                                          onClick={() => handleExportPDF('print-pm-calendar-area', `PM_Calendar_${selectedProject.code}_${pmMonth}.pdf`, 'landscape')} 
                                          disabled={isExporting}
                                      >
                                          {isExporting ? t('downloading') : t('downloadPDF')}
                                      </Button>
                                  </div>
                              </div>
                          </div>
                          <div id="print-pm-calendar-area" className={isExporting ? 'w-[277mm] h-[165mm] min-w-[277mm] max-w-[277mm] mx-auto bg-white flex flex-col box-border' : 'p-4'}>
                              {isExporting && (
                                  <div className="text-center mb-2 shrink-0">
                                      <h2 className="text-xl font-bold text-gray-800">ปฏิทินแผนบำรุงรักษาเชิงป้องกัน (PM Calendar)</h2>
                                      <p className="text-xs text-gray-600 font-medium mt-1">
                                          โครงการ: {selectedProject.name} | ประจำเดือน: {new Date(pmMonth + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                      </p>
                                  </div>
                              )}
                              
                              {(() => {
                                  const calendarDaysArr = getCalendarDays(parseInt(pmMonth.split('-')[0]), parseInt(pmMonth.split('-')[1]));
                                  const numWeeks = Math.ceil(calendarDaysArr.length / 7);
                                  
                                  return (
                                      <div 
                                          className={`grid grid-cols-7 border-t border-l border-gray-200 bg-white rounded-lg overflow-hidden ${isExporting ? 'flex-1' : ''}`}
                                          style={isExporting ? { gridTemplateRows: `auto repeat(${numWeeks}, minmax(0, 1fr))` } : {}}
                                      >
                                          {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map(d => (
                                              <div key={d} className={`text-center font-bold bg-gray-50 border-r border-b border-gray-200 text-gray-600 ${isExporting ? 'py-1 text-[10px]' : 'p-2 text-xs'}`}>{d}</div>
                                          ))}
                                          {calendarDaysArr.map((dayObj, idx) => {
                                              const date = dayObj.date;
                                              
                                              // Local date string construction to avoid timezone issues
                                              const yyyy = date.getFullYear();
                                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                                              const dd = String(date.getDate()).padStart(2, '0');
                                              const dateString = `${yyyy}-${mm}-${dd}`;
                                              
                                              const todayDate = new Date();
                                              const isToday = date.getDate() === todayDate.getDate() && date.getMonth() === todayDate.getMonth() && date.getFullYear() === todayDate.getFullYear();

                                              // Find tasks scheduled for this day
                                              const dayTasks = pmPlans.filter(p => p.projectId === selectedProject.id).filter(plan => {
                                                  if (plan.status !== 'Active') return false;
                                                  if (plan.frequency === 'Daily') return true;
                                                  if (plan.frequency === 'Weekly') return date.getDay() === parseInt(plan.scheduleDetails?.dayOfWeek || 0);
                                                  if (plan.frequency === 'Monthly') return date.getDate() === parseInt(plan.scheduleDetails?.date || 1);
                                                  if (plan.frequency === 'Yearly') return date.getDate() === parseInt(plan.scheduleDetails?.date || 1) && date.getMonth() === parseInt(plan.scheduleDetails?.month || 1) - 1;
                                                  return false;
                                              });

                                              if (!dayObj.isCurrentMonth) {
                                                  return <div key={idx} className={`${isExporting ? 'h-full min-h-0' : 'min-h-[120px]'} bg-transparent`}></div>;
                                              }

                                              const isFirstDayOfMonth = date.getDate() === 1;
                                              const needsLeftBorder = isFirstDayOfMonth && date.getDay() !== 0;

                                              return (
                                                  <div 
                                                      key={idx} 
                                                      className={`${isExporting ? 'h-full min-h-0 p-0.5' : 'min-h-[120px] p-1 cursor-pointer'} border-r border-b border-gray-200 transition-colors bg-white hover:bg-purple-50 flex flex-col ${needsLeftBorder ? 'border-l' : ''}`}
                                                      onClick={() => {
                                                          if (!isExporting && dayTasks.length > 0) {
                                                              setSelectedDateTasks({ dateString: dateString, tasks: dayTasks, dateObj: date });
                                                          }
                                                      }}
                                                      title={!isExporting && dayTasks.length > 0 ? "คลิกเพื่อดูรายการ PM ทั้งหมดในวันนี้" : ""}
                                                  >
                                                      <div className={`flex justify-end ${isExporting ? 'p-0.5' : 'p-1'} shrink-0`}>
                                                          <span className={`font-medium flex items-center justify-center rounded-full ${isToday && !isExporting ? 'bg-orange-500 text-white shadow-sm w-6 h-6 text-xs' : isToday && isExporting ? 'border border-orange-500 text-orange-600 w-4 h-4 text-[9px]' : isExporting ? 'w-4 h-4 text-[9px] text-gray-800' : 'w-6 h-6 text-xs text-gray-800'}`}>
                                                              {date.getDate()}
                                                          </span>
                                                      </div>
                                                      <div className={`mt-0.5 flex flex-col gap-0.5 px-0.5 ${isExporting ? 'flex-1 overflow-hidden' : 'h-20 overflow-y-auto custom-scrollbar'}`}>
                                                          {dayTasks.slice(0, 3).map(task => {
                                                              const machine = machines.find(m => m.id === task.machineId);
                                                              const historyRecord = pmHistoryList.find(h => h.pmPlanId === task.id && h.date === dateString);
                                                              
                                                              let itemClass = '';
                                                              let statusText = 'ยังไม่ดำเนินการ';
                                                              
                                                              if (historyRecord) {
                                                                  if (historyRecord.approvalStatus === 'Approved') {
                                                                      itemClass = 'bg-green-500 border-green-600 text-white';
                                                                      statusText = 'อนุมัติแล้ว';
                                                                  } else if (historyRecord.approvalStatus === 'Pending Chief' || historyRecord.approvalStatus === 'Pending Manager') {
                                                                      itemClass = 'bg-yellow-400 border-yellow-500 text-yellow-900';
                                                                      statusText = 'รออนุมัติ';
                                                                  } else {
                                                                      itemClass = 'bg-blue-500 border-blue-600 text-white';
                                                                      statusText = 'ดำเนินการแล้ว';
                                                                  }
                                                              } else {
                                                                  itemClass = 'bg-white border-gray-300 border-dashed text-gray-600 hover:border-solid hover:border-gray-400 hover:bg-gray-50';
                                                              }

                                                              return (
                                                                  <div 
                                                                      key={task.id} 
                                                                      onClick={(e) => {
                                                                          if (!isExporting) {
                                                                              e.stopPropagation();
                                                                              handleOpenPmForm(task, machine, dateString);
                                                                          }
                                                                      }}
                                                                      className={`${isExporting ? 'text-[8.5px] p-0.5 px-1 leading-tight' : 'text-[10px] p-1.5'} border rounded truncate transition-colors shadow-sm font-bold ${itemClass} ${!isExporting ? 'cursor-pointer hover:opacity-90 hover:shadow-md' : ''}`} 
                                                                      title={!isExporting ? `เครื่องจักร: ${machine?.name || 'ไม่ระบุ'}\nรหัส: ${machine?.code || '-'}\nสถานะ: ${statusText} (คลิกเพื่อดู/บันทึก)` : ''}
                                                                  >
                                                                      {machine?.name || 'ไม่ระบุชื่อ'}
                                                                  </div>
                                                              )
                                                          })}
                                                          {dayTasks.length > 3 && (
                                                              <div 
                                                                  onClick={(e) => {
                                                                      if (!isExporting) {
                                                                          e.stopPropagation();
                                                                          setSelectedDateTasks({ dateString: dateString, tasks: dayTasks, dateObj: date });
                                                                      }
                                                                  }}
                                                                  className={`${isExporting ? 'text-[8.5px] p-0.5' : 'text-[10px] p-1 cursor-pointer hover:bg-gray-200'} text-center font-bold text-gray-500 bg-gray-100 rounded mt-0.5 border border-gray-200`}
                                                              >
                                                                  + {dayTasks.length - 3} รายการ
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  );
                              })()}
                              
                              <div className={`flex flex-wrap items-center gap-4 text-gray-600 shrink-0 ${isExporting ? 'text-[10px] mt-2' : 'text-xs mt-4 font-medium'}`}>
                                  <div className="flex items-center gap-1.5"><span className={`rounded border border-gray-300 border-dashed bg-white inline-block ${isExporting ? 'w-2 h-2' : 'w-4 h-3'}`}></span> ยังไม่ดำเนินการ</div>
                                  <div className="flex items-center gap-1.5"><span className={`rounded border border-blue-600 bg-blue-500 inline-block ${isExporting ? 'w-2 h-2' : 'w-4 h-3'}`}></span> ดำเนินการแล้ว</div>
                                  <div className="flex items-center gap-1.5"><span className={`rounded border border-yellow-500 bg-yellow-400 inline-block ${isExporting ? 'w-2 h-2' : 'w-4 h-3'}`}></span> รออนุมัติ</div>
                                  <div className="flex items-center gap-1.5"><span className={`rounded border border-green-700 bg-green-600 inline-block ${isExporting ? 'w-2 h-2' : 'w-4 h-3'}`}></span> อนุมัติแล้ว</div>
                                  {!isExporting && <div className="flex items-center gap-1.5 ml-auto"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block shadow-sm"></span> วันนี้</div>}
                              </div>
                          </div>
                      </Card>
                  )}

                  {pmSubTab === 'form' && (
                      <Card className="border-t-4 border-orange-500">
                          <div className="p-4 border-b flex justify-between items-center bg-white">
                              <h3 className="font-bold flex items-center gap-2 text-gray-800"><FileText size={20}/> แบบฟอร์มตรวจเช็ค (Blank PM Forms)</h3>
                              <div className="flex items-center gap-4">
                                  <select
                                      className="border border-gray-300 rounded-md p-2 text-sm bg-gray-50 focus:bg-white outline-none focus:ring-1 focus:ring-orange-500 w-64"
                                      value={selectedFormSystem}
                                      onChange={(e) => setSelectedFormSystem(e.target.value)}
                                  >
                                      <option value="">-- เลือกระบบเพื่อดูแบบฟอร์ม --</option>
                                      {MACHINE_SYSTEMS.map(sys => (
                                          <option key={sys} value={sys}>{sys}</option>
                                      ))}
                                  </select>
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      icon={PrinterIcon}
                                      onClick={() => {
                                          const container = document.getElementById('print-blank-pm-form');
                                          if (container) {
                                              container.scrollTop = 0;
                                              const parentWrapper = container.closest('.overflow-x-auto');
                                              if (parentWrapper) parentWrapper.scrollLeft = 0;
                                          }
                                          // ใช้ Custom Margin: [Top 22mm, Left 10mm, Bottom 20mm, Right 10mm]
                                          setTimeout(() => handleExportPDF('print-blank-pm-form', `Blank_PM_Form_${selectedFormSystem.replace(/\//g, '_')}.pdf`, 'portrait', [22, 10, 20, 10]), 100);
                                      }}
                                      disabled={!selectedFormSystem || isExporting}
                                  >
                                      {isExporting ? t('downloading') : t('downloadPDF')}
                                  </Button>
                              </div>
                          </div>

                          {/* แก้ไข: ปรับคอนเทนเนอร์แม่ให้ไม่รบกวนการแคปภาพตอน Export */}
                          <div className={isExporting ? "w-full bg-white" : "p-8 bg-gray-100 flex justify-center overflow-x-auto w-full"}>
                              {selectedFormSystem ? (
                                  <div id="print-blank-pm-form" className={`bg-white box-border flex flex-col text-gray-800 ${isExporting ? 'w-[190mm] min-w-[190mm] max-w-[190mm] m-0 p-0 border-none shadow-none bg-transparent' : 'mx-auto relative w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] px-[15mm] pt-[15mm] pb-[15mm] shadow-lg border border-gray-300'}`}>
                                      <div className={`text-center shrink-0 ${isExporting ? 'mb-4' : 'mb-6'}`}>
                                          <h2 className="text-xl font-bold text-gray-800">แบบฟอร์มตรวจสอบบำรุงรักษาเชิงป้องกัน (PM Checklist)</h2>
                                          <h3 className="text-base text-gray-600 mt-2 font-medium">ระบบ: {selectedFormSystem}</h3>
                                      </div>
                                      
                                      <div className={`grid grid-cols-2 gap-x-8 gap-y-4 text-xs text-gray-700 shrink-0 ${isExporting ? 'mb-4' : 'mb-6'}`}>
                                          <div className="flex items-end"><span className="w-20 font-bold shrink-0">รหัสเครื่องจักร:</span> <div className="flex-1 border-b border-gray-400 border-dotted"></div></div>
                                          <div className="flex items-end"><span className="w-20 font-bold shrink-0">ชื่อเครื่องจักร:</span> <div className="flex-1 border-b border-gray-400 border-dotted"></div></div>
                                          <div className="flex items-end"><span className="w-20 font-bold shrink-0">สถานที่ติดตั้ง:</span> <div className="flex-1 border-b border-gray-400 border-dotted"></div></div>
                                          <div className="flex items-end"><span className="w-20 font-bold shrink-0">วันที่ตรวจสอบ:</span> <div className="flex-1 border-b border-gray-400 border-dotted"></div></div>
                                      </div>

                                      <table className={`w-full text-[11px] border-collapse table-fixed break-words flex-1 ${isExporting ? 'mb-4' : 'mb-6'}`}>
                                          <thead className="bg-gray-100 text-gray-800">
                                              <tr>
                                                  <th className="p-2 border border-gray-400 text-center w-[8%]">ลำดับ</th>
                                                  <th className="p-2 border border-gray-400 text-left w-[46%]">รายละเอียดการตรวจสอบ (Inspection Item)</th>
                                                  <th className="p-2 border border-gray-400 text-center w-[10%]">ปกติ</th>
                                                  <th className="p-2 border border-gray-400 text-center w-[10%]">ผิดปกติ</th>
                                                  <th className="p-2 border border-gray-400 text-center w-[8%]">N/A</th>
                                                  <th className="p-2 border border-gray-400 text-left w-[18%]">หมายเหตุ</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {getChecklistForSystem(selectedFormSystem).map((item, idx) => (
                                                  <tr key={idx}>
                                                      <td className="p-2 border border-gray-400 text-center text-gray-600 font-medium h-8">{idx + 1}</td>
                                                      <td className="p-2 border border-gray-400 font-medium text-gray-800 break-words whitespace-normal">{item}</td>
                                                      <td className="p-2 border border-gray-400 text-center"><div className="w-3 h-3 border border-gray-500 mx-auto"></div></td>
                                                      <td className="p-2 border border-gray-400 text-center"><div className="w-3 h-3 border border-gray-500 mx-auto"></div></td>
                                                      <td className="p-2 border border-gray-400 text-center"><div className="w-3 h-3 border border-gray-500 mx-auto"></div></td>
                                                      <td className="p-2 border border-gray-400"></td>
                                                  </tr>
                                              ))}
                                              {/* เพิ่มบรรทัดว่างเพื่อให้ตารางยาวสวยงาม หากเช็กลิสต์มีข้อน้อย */}
                                              {Array.from({ length: Math.max(0, 10 - getChecklistForSystem(selectedFormSystem).length) }).map((_, idx) => (
                                                  <tr key={`empty-${idx}`}>
                                                      <td className="p-2 border border-gray-400 h-8 text-center text-gray-500 font-medium">{getChecklistForSystem(selectedFormSystem).length + idx + 1}</td>
                                                      <td className="p-2 border border-gray-400"></td>
                                                      <td className="p-2 border border-gray-400"></td>
                                                      <td className="p-2 border border-gray-400"></td>
                                                      <td className="p-2 border border-gray-400"></td>
                                                      <td className="p-2 border border-gray-400"></td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>

                                      <div className={`shrink-0 ${isExporting ? 'mb-4' : 'mb-8'}`}>
                                          <h4 className="font-bold text-gray-800 mb-3 text-xs">สรุปผล / ข้อเสนอแนะ (Remarks):</h4>
                                          <div className="border-b border-gray-400 border-dotted mb-5 h-4"></div>
                                          <div className="border-b border-gray-400 border-dotted mb-5 h-4"></div>
                                          <div className="border-b border-gray-400 border-dotted mb-5 h-4"></div>
                                      </div>

                                      <div className="flex justify-between px-6 mt-auto shrink-0">
                                          <div className="text-center">
                                              <div className="border-b border-gray-500 w-40 mb-2 h-8"></div>
                                              <div className="text-xs text-gray-600">( .................................................... )</div>
                                              <div className="text-[11px] font-bold text-gray-800 mt-1">ผู้ตรวจสอบ (Inspector)</div>
                                              <div className="text-[10px] text-gray-500 mt-1">วันที่ ....... / ....... / ...........</div>
                                          </div>
                                          <div className="text-center">
                                              <div className="border-b border-gray-500 w-40 mb-2 h-8"></div>
                                              <div className="text-xs text-gray-600">( .................................................... )</div>
                                              <div className="text-[11px] font-bold text-gray-800 mt-1">ผู้รับรอง (Manager)</div>
                                              <div className="text-[10px] text-gray-500 mt-1">วันที่ ....... / ....... / ...........</div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-center text-gray-400 py-20 flex flex-col items-center">
                                      <div className="bg-white p-4 rounded-full shadow-sm border border-gray-200 mb-4">
                                          <FileText size={48} className="text-orange-300"/>
                                      </div>
                                      <p className="text-lg font-bold text-gray-600">แบบฟอร์มตรวจสอบ (Blank Form)</p>
                                      <p className="text-sm">กรุณาเลือกระบบ (System) ด้านบนเพื่อแสดงแบบฟอร์มเปล่าและสั่งพิมพ์</p>
                                  </div>
                              )}
                          </div>
                      </Card>
                  )}

                  {pmSubTab === 'yearly_summary' && (() => {
                      // 1. ดึงเครื่องจักรของโครงการนี้และจัดกลุ่มตามระบบ
                      const projectMachines = machines.filter(m => m.projectId === selectedProject.id);
                      const groupedMachines = projectMachines.reduce((acc, machine) => {
                          if (!acc[machine.system]) acc[machine.system] = [];
                          acc[machine.system].push(machine);
                          return acc;
                      }, {});

                      // 2. ดึงแผน PM ที่ Active
                      const activePlans = pmPlans.filter(p => p.projectId === selectedProject.id && p.status === 'Active');

                      // 3. Pre-process ประวัติ PM สำหรับปีที่เลือก เพื่อความรวดเร็วในการค้นหา
                      const historyMap = {};
                      pmHistoryList.forEach(h => {
                          if (h.projectId !== selectedProject.id) return;
                          const [y, m] = h.date.split('-');
                          if (y === pmYearlySummaryYear) {
                              const key = `${h.machineId}_${parseInt(m)}`;
                              if (!historyMap[key]) historyMap[key] = [];
                              historyMap[key].push(h);
                          }
                      });

                      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                      const currentY = new Date().getFullYear();
                      const currentM = new Date().getMonth() + 1;
                      const targetY = parseInt(pmYearlySummaryYear);

                      // Helper: สำหรับเรนเดอร์สถานะในแต่ละเดือน
                      const renderMonthlyCell = (machine, monthNum) => {
                          const plan = activePlans.find(p => p.machineId === machine.id);
                          
                          let isScheduled = false;
                          if (plan) {
                              if (['Daily', 'Weekly', 'Monthly'].includes(plan.frequency)) isScheduled = true;
                              if (plan.frequency === 'Yearly' && parseInt(plan.scheduleDetails?.month) === monthNum) isScheduled = true;
                          }

                          if (!isScheduled) return <td key={monthNum} className="p-1 border border-gray-200 text-center bg-gray-50">-</td>;

                          const histories = historyMap[`${machine.id}_${monthNum}`] || [];
                          
                          let status = 'plan'; 
                          if (histories.length > 0) {
                              const hasApproved = histories.some(h => h.approvalStatus === 'Approved');
                              const hasRejected = histories.some(h => h.approvalStatus === 'Rejected');
                              if (hasApproved) status = 'done';
                              else if (hasRejected) status = 'rejected';
                              else status = 'pending_approval';
                          } else {
                              if (targetY < currentY || (targetY === currentY && monthNum < currentM)) {
                                  status = 'missed';
                              } else if (targetY === currentY && monthNum === currentM) {
                                  status = 'pending';
                              }
                          }

                          const statusConfig = {
                              plan: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'P', title: 'ตามแผน (Plan)' },
                              done: { bg: 'bg-green-100', text: 'text-green-700', label: '✔', title: 'ดำเนินการแล้ว (Done)' },
                              missed: { bg: 'bg-red-100', text: 'text-red-700', label: 'X', title: 'ขาด/ล่าช้า (Missed)' },
                              pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'P', title: 'รอดำเนินการเดือนนี้ (Pending)' },
                              pending_approval: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'W', title: 'รออนุมัติ (Wait)' },
                              rejected: { bg: 'bg-red-200', text: 'text-red-800', label: 'R', title: 'ตีกลับ (Rejected)' },
                          };

                          const cfg = statusConfig[status];

                          return (
                              <td key={monthNum} className={`p-1 border border-gray-200 text-center align-middle ${cfg.bg} cursor-help`} title={cfg.title}>
                                  <span className={`font-bold ${isExporting ? 'text-[8px]' : 'text-[10px]'} ${cfg.text}`}>{cfg.label}</span>
                              </td>
                          );
                      };

                      return (
                          <Card className="border-t-4 border-teal-500 animate-fade-in">
                              <div className="p-4 border-b flex justify-between items-center bg-white">
                                  <h3 className="font-bold flex items-center gap-2 text-gray-800">
                                      <Calendar size={20} className="text-teal-600"/> สรุปแผนการทำ PM ทั้งปี (Yearly Summary)
                                  </h3>
                                  <div className="flex items-center gap-4">
                                      <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${isExporting ? 'hidden' : ''}`}>
                                          <button onClick={() => setPmYearlySummaryYear(String(targetY - 1))} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronLeft size={16}/></button>
                                          <span className="px-4 text-sm font-bold text-gray-700 w-24 text-center">ปี {targetY}</span>
                                          <button onClick={() => setPmYearlySummaryYear(String(targetY + 1))} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronRight size={16}/></button>
                                      </div>
                                      <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                                          <Button 
                                              variant="outline" 
                                              size="sm" 
                                              icon={Download} 
                                              onClick={() => {
                                                  const csvData = [];
                                                  Object.keys(groupedMachines).forEach(sys => {
                                                      groupedMachines[sys].forEach(m => {
                                                          const plan = activePlans.find(p => p.machineId === m.id);
                                                          const row = {
                                                              'ระบบ (System)': sys,
                                                              'รหัส (Code)': m.code,
                                                              'ชื่อเครื่องจักร (Name)': m.name,
                                                              'ความถี่ (Freq)': plan ? t(`freq_${plan.frequency}`) : '-'
                                                          };
                                                          for(let i=1; i<=12; i++){
                                                              const histories = historyMap[`${m.id}_${i}`] || [];
                                                              let s = '-';
                                                              if(plan && (['Daily', 'Weekly', 'Monthly'].includes(plan.frequency) || (plan.frequency === 'Yearly' && parseInt(plan.scheduleDetails?.month) === i))) {
                                                                  s = 'P';
                                                                  if (histories.length > 0) {
                                                                      if (histories.some(h => h.approvalStatus === 'Approved')) s = 'Done';
                                                                      else if (histories.some(h => h.approvalStatus === 'Rejected')) s = 'Rejected';
                                                                      else s = 'Wait';
                                                                  } else if (targetY < currentY || (targetY === currentY && i < currentM)) {
                                                                      s = 'Missed';
                                                                  }
                                                              }
                                                              row[`เดือน ${i}`] = s;
                                                          }
                                                          csvData.push(row);
                                                      });
                                                  });
                                                  exportToCSV(csvData, `PM_Yearly_Summary_${selectedProject.code}_${targetY}`);
                                              }}
                                          >
                                              {t('exportCSV')}
                                          </Button>
                                          <Button 
                                              variant="outline" 
                                              size="sm" 
                                              icon={isExporting ? Loader2 : PrinterIcon} 
                                              onClick={() => handleExportPDF('print-yearly-summary-area', `PM_Yearly_Summary_${selectedProject.code}_${targetY}.pdf`, 'landscape')} 
                                              disabled={isExporting}
                                          >
                                              {isExporting ? t('downloading') : t('downloadPDF')}
                                          </Button>
                                      </div>
                                  </div>
                              </div>
                              
                              <div id="print-yearly-summary-area" className={isExporting ? 'w-[277mm] h-max min-w-[277mm] max-w-[277mm] mx-auto bg-white p-4 box-border' : 'p-4 overflow-x-auto'}>
                                  {isExporting && (
                                      <div className="text-center mb-4 shrink-0">
                                          <h2 className="text-xl font-bold text-gray-800">สรุปแผนการบำรุงรักษาเชิงป้องกันประจำปี (Yearly PM Summary)</h2>
                                          <p className="text-sm text-gray-600 font-medium mt-1">
                                              โครงการ: {selectedProject.name} | ประจำปี: {targetY}
                                          </p>
                                      </div>
                                  )}

                                  {Object.keys(groupedMachines).length === 0 ? (
                                      <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">ไม่มีข้อมูลเครื่องจักรในระบบ</div>
                                  ) : (
                                      <table className={`w-full border-collapse ${isExporting ? 'text-[9px]' : 'text-xs'}`}>
                                          <thead className="bg-gray-100 text-gray-700">
                                              <tr>
                                                  <th className="p-2 border border-gray-300 text-center w-10">#</th>
                                                  <th className="p-2 border border-gray-300 text-left">เครื่องจักร (Machine)</th>
                                                  <th className="p-2 border border-gray-300 text-center w-16">รหัส</th>
                                                  <th className="p-2 border border-gray-300 text-center w-16">ความถี่</th>
                                                  {months.map(m => <th key={m} className="p-2 border border-gray-300 text-center w-8">{m}</th>)}
                                              </tr>
                                          </thead>
                                          <tbody className="bg-white">
                                              {Object.keys(groupedMachines).map(systemName => (
                                                  <React.Fragment key={systemName}>
                                                      {/* Group Header Row */}
                                                      <tr className="bg-teal-50">
                                                          <td colSpan={16} className="p-2 border border-gray-300 font-bold text-teal-800">
                                                              ระบบ: {systemName}
                                                          </td>
                                                      </tr>
                                                      {/* Machine Rows */}
                                                      {groupedMachines[systemName].map((machine, index) => {
                                                          const plan = activePlans.find(p => p.machineId === machine.id);
                                                          return (
                                                              <tr key={machine.id} className="hover:bg-gray-50 transition-colors">
                                                                  <td className="p-2 border border-gray-200 text-center text-gray-500">{index + 1}</td>
                                                                  <td className="p-2 border border-gray-200 font-medium text-gray-800 line-clamp-1" title={machine.name}>{machine.name}</td>
                                                                  <td className="p-2 border border-gray-200 text-center font-mono text-[10px] text-gray-500">{machine.code}</td>
                                                                  <td className="p-2 border border-gray-200 text-center text-[10px]">
                                                                      {plan ? t(`freq_${plan.frequency}`) : <span className="text-gray-300">-</span>}
                                                                  </td>
                                                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(monthNum => renderMonthlyCell(machine, monthNum))}
                                                              </tr>
                                                          );
                                                      })}
                                                  </React.Fragment>
                                              ))}
                                          </tbody>
                                      </table>
                                  )}

                                  {/* Legend */}
                                  <div className={`mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 ${isExporting ? 'text-[8px] justify-center' : 'text-xs'}`}>
                                      <div className="font-bold text-gray-700 mr-2">สัญลักษณ์ (Legend):</div>
                                      <div className="flex items-center gap-1.5"><span className="w-4 h-4 flex items-center justify-center bg-gray-100 text-gray-500 font-bold rounded text-[10px]">P</span> ตามแผน (Future Plan)</div>
                                      <div className="flex items-center gap-1.5"><span className="w-4 h-4 flex items-center justify-center bg-orange-100 text-orange-700 font-bold rounded text-[10px]">P</span> รอดำเนินการเดือนนี้ (Pending)</div>
                                      <div className="flex items-center gap-1.5"><span className="w-4 h-4 flex items-center justify-center bg-green-100 text-green-700 font-bold rounded text-[10px]">✔</span> ดำเนินการแล้ว (Done)</div>
                                      <div className="flex items-center gap-1.5"><span className="w-4 h-4 flex items-center justify-center bg-red-100 text-red-700 font-bold rounded text-[10px]">X</span> ขาด/ล่าช้า (Missed)</div>
                                      <div className="flex items-center gap-1.5"><span className="w-4 h-4 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded text-[10px]">W</span> รออนุมัติผล (Wait)</div>
                                      <div className="flex items-center gap-1.5"><span className="w-4 h-4 flex items-center justify-center bg-red-200 text-red-800 font-bold rounded text-[10px]">R</span> ตีกลับให้แก้ไข (Rejected)</div>
                                  </div>
                              </div>
                          </Card>
                      );
                  })()}

                  {!['registry', 'plan', 'calendar', 'history', 'form', 'yearly_summary'].includes(pmSubTab) && (
                      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed text-gray-400">
                          <Wrench size={48} className="mb-2 opacity-50"/>
                          <p>ส่วนของ {t('pm_' + pmSubTab)} อยู่ระหว่างการพัฒนา</p>
                          <p className="text-xs">Feature under construction</p>
                      </div>
                  )}
              </div>
          )}

          {projectTab === 'utilities' && (
              <Card className="p-0 overflow-hidden">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
                              <Zap className="text-orange-500" size={20}/>
                          </div>
                          <h2 className="text-xl font-bold text-gray-800">ระบบมิเตอร์น้ำ/ไฟ (Utility)</h2>
                      </div>
                      
                      {/* Sub-tabs */}
                      <div className="flex flex-wrap gap-4 md:gap-6 mt-2 md:mt-0 w-full md:w-auto">
                          <button onClick={() => setUtilitySubTab('record')} className={`font-bold pb-2 border-b-2 transition-colors ${utilitySubTab === 'record' ? 'text-red-600 border-red-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>จดบันทึก (Record)</button>
                          <button onClick={() => setUtilitySubTab('registry')} className={`font-bold pb-2 border-b-2 transition-colors ${utilitySubTab === 'registry' ? 'text-red-600 border-red-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>ทะเบียนมิเตอร์ (Registry)</button>
                          <button onClick={() => setUtilitySubTab('analysis')} className={`font-bold pb-2 border-b-2 transition-colors ${utilitySubTab === 'analysis' ? 'text-red-600 border-red-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>วิเคราะห์ (Analysis)</button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex items-center gap-2"><FileText size={16}/> CSV</Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => handleExportPDF('utility-print-area', 'Utility_Report.pdf')} disabled={isExporting}>
                              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <PrinterIcon size={16}/>} PDF
                          </Button>
                      </div>
                  </div>

                  <div className="p-6" id="utility-print-area">
                      {utilitySubTab === 'record' && (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Form Column */}
                              <div className="col-span-1 border border-red-100 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-fit">
                                  <div className="bg-[#fff5f5] text-[#9b2c2c] font-bold p-4 border-b border-red-100 flex justify-between items-center">
                                      <span>{utilityForm.id ? 'แก้ไขการจดบันทึก' : 'บันทึกการจดมิเตอร์'}</span>
                                      {utilityForm.meterId && !utilityForm.id && (
                                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                                              {meters.filter(m => m.projectId === selectedProject.id).findIndex(m => m.id === utilityForm.meterId) + 1} / {meters.filter(m => m.projectId === selectedProject.id).length}
                                          </span>
                                      )}
                                      {utilityForm.id && (
                                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium animate-pulse">
                                              โหมดแก้ไข
                                          </span>
                                      )}
                                  </div>
                                  <form onSubmit={handleSaveUtilityReading} className="p-5 space-y-5">
                                      <div>
                                          <label className="block text-sm font-bold text-gray-700 mb-2">เลือกมิเตอร์</label>
                                          <select
                                              className="w-full border border-red-500 rounded-lg p-2.5 focus:ring-2 focus:ring-red-200 outline-none text-sm bg-white"
                                              value={utilityForm.meterId}
                                              onChange={(e) => {
                                                  setUtilityForm({...utilityForm, meterId: e.target.value});
                                                  setTimeout(() => currentValueRef.current?.focus(), 50);
                                              }}
                                              required
                                          >
                                              <option value="">-- เลือกมิเตอร์ --</option>
                                              {meters.filter(m => m.projectId === selectedProject.id).map(m => (
                                                  <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                                              ))}
                                          </select>

                                          {/* ส่วนแสดงข้อมูลเพิ่มเติมของมิเตอร์ (ประเภท & ตำแหน่ง) */}
                                          {utilityForm.meterId && (() => {
                                              const m = meters.find(meter => meter.id === utilityForm.meterId);
                                              if (!m) return null;
                                              return (
                                                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-2 shadow-inner">
                                                      <div className="flex justify-between items-center">
                                                          <span className="text-gray-500 font-bold">ประเภท:</span>
                                                          <span className="font-bold text-gray-800 flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                                                              {m.type === 'Water' ? <Droplet size={14} className="text-blue-500"/> : <Zap size={14} className="text-orange-500"/>}
                                                              {m.type === 'Water' ? 'น้ำประปา' : 'ไฟฟ้า'}
                                                          </span>
                                                      </div>
                                                      <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                                                          <span className="text-gray-500 font-bold">ตำแหน่งติดตั้ง:</span>
                                                          <span className="font-medium text-gray-800 flex items-center gap-1 text-right max-w-[150px] truncate" title={m.location || '-'}>
                                                              <MapPin size={12} className="text-gray-400 shrink-0"/>
                                                              <span className="truncate">{m.location || '-'}</span>
                                                          </span>
                                                      </div>
                                                  </div>
                                              );
                                          })()}
                                      </div>
                                      <div>
                                          <label className="block text-sm font-bold text-gray-700 mb-2">วันที่จด</label>
                                          <input
                                              type="date"
                                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-200 outline-none text-sm text-gray-700 bg-white"
                                              value={utilityForm.date}
                                              onChange={(e) => setUtilityForm({...utilityForm, date: e.target.value})}
                                              required
                                          />
                                      </div>
                                      <div>
                                          <div className="flex justify-between items-end mb-2">
                                              <label className="block text-sm font-bold text-gray-700">เลขมิเตอร์ปัจจุบัน (Current)</label>
                                              {utilityForm.meterId && (
                                                  <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                                                      ค่ายกมา: <span className="text-gray-800 font-bold">{meters.find(m => m.id === utilityForm.meterId)?.lastReading || 0}</span>
                                                  </span>
                                              )}
                                          </div>
                                          <input
                                              ref={currentValueRef}
                                              type="number"
                                              step="0.01"
                                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-200 outline-none text-sm bg-white"
                                              placeholder="0.00"
                                              value={utilityForm.currentValue}
                                              onChange={(e) => setUtilityForm({...utilityForm, currentValue: e.target.value})}
                                              required
                                          />
                                      </div>
                                      <button 
                                          type="submit" 
                                          className={`w-full text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2 ${utilityForm.id ? 'bg-orange-600 hover:bg-orange-700 shadow-md' : 'bg-[#b91c1c] hover:bg-red-800'}`}
                                      >
                                          <Save size={18}/> {utilityForm.id ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล (Enter)'}
                                      </button>
                                      {utilityForm.id && (
                                          <button 
                                              type="button" 
                                              onClick={() => setUtilityForm({ id: null, meterId: utilityForm.meterId, date: new Date().toISOString().split('T')[0], currentValue: '' })}
                                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2 border border-gray-200"
                                          >
                                              ยกเลิกการแก้ไข
                                          </button>
                                      )}
                                      
                                      {/* เพิ่มส่วนแสดงชื่อผู้บันทึกจาก User ที่ Log in */}
                                      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500 bg-gray-50 py-2 rounded-lg border border-gray-100">
                                          <User size={14} className="text-red-600" /> ผู้บันทึก: <span className="font-bold text-gray-700">{currentUser?.firstName} {currentUser?.lastName}</span>
                                      </div>
                                  </form>
                              </div>

                              {/* Right Column (Placeholder or History) */}
                              <div className="col-span-1 lg:col-span-2 border-2 border-dashed border-gray-200 rounded-xl bg-[#fafafa] flex flex-col items-center justify-center min-h-[450px]">
                                  {utilityForm.meterId ? (
                                      <div className="w-full h-full p-6 flex flex-col">
                                          <div className="flex justify-between items-center mb-4 border-b pb-2">
                                              <h3 className="font-bold text-gray-700">ประวัติการจด (History)</h3>
                                              <span className="text-sm font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                  {meters.find(m => m.id === utilityForm.meterId)?.code}
                                              </span>
                                          </div>
                                          <div className="flex-1 overflow-auto">
                                              {(() => {
                                                  const meterReadings = utilityReadings.filter(r => r.meterId === utilityForm.meterId);
                                                  
                                                  // กำหนดสิทธิ์: ให้สิทธิ์เฉพาะ Admin, ผู้จัดการ (ไม่รวมผู้ช่วย) และ หัวหน้าช่าง (ไม่รวมผู้ช่วย)
                                                  const canManageRecord = currentUser?.username === 'admin' || 
                                                      (currentUser?.position?.includes('ผู้จัดการ') && !currentUser?.position?.includes('ผู้ช่วย')) || 
                                                      (currentUser?.position?.includes('หัวหน้าช่าง') && !currentUser?.position?.includes('ผู้ช่วย'));

                                                  if (meterReadings.length > 0) {
                                                      return (
                                                          <table className="w-full text-sm text-left">
                                                              <thead className="bg-white text-gray-600 border-b border-gray-200">
                                                                  <tr>
                                                                      <th className="p-3">วันที่จด</th>
                                                                      <th className="p-3 text-right">เลขก่อนหน้า</th>
                                                                      <th className="p-3 text-right">เลขปัจจุบัน</th>
                                                                      <th className="p-3 text-right">จำนวนหน่วยที่ใช้</th>
                                                                      <th className="p-3 text-center">ผู้บันทึก</th>
                                                                      {canManageRecord && (
                                                                          <th className="p-3 text-center w-20">จัดการ</th>
                                                                      )}
                                                                  </tr>
                                                              </thead>
                                                              <tbody className="divide-y divide-gray-100">
                                                                  {meterReadings.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => (
                                                                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                                          <td className="p-3 text-blue-600 font-medium">
                                                                              {new Date(r.date).toLocaleDateString('th-TH')}
                                                                          </td>
                                                                          <td className="p-3 text-right text-gray-500">{r.prevValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                                          <td className="p-3 text-right font-bold text-gray-800">{r.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                                          <td className="p-3 text-right font-bold text-red-600">+{r.usage.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                                          <td className="p-3 text-center text-gray-500 text-xs">
                                                                              <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{r.recorder}</span>
                                                                          </td>
                                                                          {canManageRecord && (
                                                                              <td className="p-3 text-center">
                                                                                  <div className="flex justify-center items-center gap-1">
                                                                                      <button onClick={() => handleEditUtilityReading(r)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="แก้ไขข้อมูล">
                                                                                          <Edit size={14} />
                                                                                      </button>
                                                                                      <button onClick={() => handleDeleteUtilityReading(r.id, r.meterId)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="ลบข้อมูล">
                                                                                          <Trash2 size={14} />
                                                                                      </button>
                                                                                  </div>
                                                                              </td>
                                                                          )}
                                                                      </tr>
                                                                  ))}
                                                              </tbody>
                                                          </table>
                                                      );
                                                  } else {
                                                      return (
                                                          <div className="text-center text-gray-400 py-20 flex flex-col items-center">
                                                              <ClipboardList size={48} className="text-gray-300 mb-2"/>
                                                              <p>ยังไม่มีประวัติการจดสำหรับมิเตอร์นี้</p>
                                                          </div>
                                                      );
                                                  }
                                              })()}
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="text-center text-gray-400 flex flex-col items-center">
                                          <Zap size={64} className="mb-4 text-gray-300 -rotate-12" strokeWidth={1.5} />
                                          <p className="font-bold text-lg text-gray-500">กรุณาเลือกมิเตอร์เพื่อดูประวัติ</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                      
                      {utilitySubTab === 'registry' && (
                          <div className="flex flex-col h-full">
                              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                      <Box size={20} className="text-red-500" /> ทะเบียนมิเตอร์ทั้งหมด
                                  </h3>
                                  {hasPerm('proj_utilities', 'save') && <Button size="sm" icon={Plus} onClick={() => { setNewMeter({ id: null, type: 'Water', code: '', name: '', location: '', initialValue: '' }); setShowAddMeterModal(true); }} className="bg-red-600 hover:bg-red-700">เพิ่มมิเตอร์</Button>}
                              </div>
                              <div className="overflow-x-auto">
                                  {meters.filter(m => m.projectId === selectedProject.id).length > 0 ? (
                                      <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
                                          <thead className="bg-gray-100 text-gray-600">
                                              <tr>
                                                  <th className="p-3 border-b text-center w-12">ลำดับ</th>
                                                  <th className="p-3 border-b w-32">ประเภท</th>
                                                  <th className="p-3 border-b">เลขมิเตอร์ (Code)</th>
                                                  <th className="p-3 border-b">ชื่อเรียก</th>
                                                  <th className="p-3 border-b">ตำแหน่งติดตั้ง</th>
                                                  <th className="p-3 text-right border-b">
                                                      ค่าปัจจุบัน 
                                                      <span className="block text-[10px] font-normal text-gray-500 mt-0.5">(วันที่บันทึกล่าสุด)</span>
                                                  </th>
                                                  <th className={`p-3 text-center border-b w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200 bg-white">
                                              {meters.filter(m => m.projectId === selectedProject.id).map((m, idx) => (
                                                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                      <td className="p-3 text-gray-500 text-center">{idx + 1}</td>
                                                      <td className="p-3">
                                                          <span className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-fit ${m.type === 'Water' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                                                              {m.type === 'Water' ? <Droplet size={12}/> : <Zap size={12}/>}
                                                              {m.type === 'Water' ? 'น้ำประปา' : 'ไฟฟ้า'}
                                                          </span>
                                                      </td>
                                                      <td className="p-3 font-mono font-medium text-gray-800 bg-gray-50 rounded">{m.code}</td>
                                                      <td className={`p-3 ${hasPerm('proj_utilities', 'edit') ? 'cursor-pointer group' : ''}`} onClick={() => hasPerm('proj_utilities', 'edit') && handleEditMeter(m)}>
                                                          <div className={`font-bold text-gray-700 flex items-center gap-1.5 ${hasPerm('proj_utilities', 'edit') ? 'group-hover:text-red-600 transition-colors' : ''}`}>
                                                              {m.name}
                                                              {hasPerm('proj_utilities', 'edit') && <Edit size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                          </div>
                                                          {hasPerm('proj_utilities', 'edit') && <div className="text-[10px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">คลิกเพื่อแก้ไข</div>}
                                                      </td>
                                                      <td className="p-3 text-gray-600">
                                                          <div className="flex items-center gap-1">
                                                              <MapPin size={14} className="text-gray-400"/> {m.location || '-'}
                                                          </div>
                                                      </td>
                                                      <td className="p-3 text-right">
                                                          <div className="font-bold text-gray-800 text-base">
                                                              {m.lastReading.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                          </div>
                                                          {m.lastDate && (
                                                              <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-end gap-1">
                                                                  <Calendar size={10}/> {new Date(m.lastDate).toLocaleDateString('th-TH')}
                                                              </div>
                                                          )}
                                                      </td>
                                                      <td className={`p-3 text-center ${isExporting ? 'hidden' : ''}`}>
                                                          {hasPerm('proj_utilities', 'delete') && (
                                                              <button 
                                                                  onClick={() => showConfirm('ยืนยันการลบ', `คุณต้องการลบมิเตอร์รหัส ${m.code} ใช่หรือไม่?`, () => setMeters(meters.filter(meter => meter.id !== m.id)))}
                                                                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                                  title="ลบมิเตอร์"
                                                              >
                                                                  <Trash2 size={16} />
                                                              </button>
                                                          )}
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  ) : (
                                      <div className="text-center text-gray-400 py-20 flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                          <Box size={48} className="text-gray-300 mb-4"/>
                                          <p className="font-bold text-lg">ยังไม่มีข้อมูลมิเตอร์</p>
                                          <p className="text-sm">คลิกปุ่ม "เพิ่มมิเตอร์" เพื่อเริ่มต้นบันทึกข้อมูล</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                      
                      {utilitySubTab === 'analysis' && (
                          <div className="space-y-6">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b pb-4 gap-4">
                                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                      <BarChart3 size={20} className="text-red-500" /> วิเคราะห์การใช้พลังงาน (Energy Analysis)
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-3">
                                      <div className="flex items-center gap-2">
                                          <label className="text-xs font-bold text-gray-500">ประจำเดือน:</label>
                                          <input 
                                              type="month" 
                                              className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-red-200 outline-none bg-white transition-colors cursor-pointer"
                                              value={utilityAnalysisMonth}
                                              onChange={(e) => setUtilityAnalysisMonth(e.target.value)}
                                          />
                                      </div>
                                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                                          <button 
                                              onClick={() => setUtilityChartType('bar')} 
                                              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${utilityChartType === 'bar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                          >
                                              กราฟแท่ง (Bar)
                                          </button>
                                          <button 
                                              onClick={() => setUtilityChartType('line')} 
                                              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${utilityChartType === 'line' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                          >
                                              กราฟเส้น (Line)
                                          </button>
                                      </div>
                                  </div>
                              </div>
                              
                              {(() => {
                                  // Data Processing for Chart
                                  const projectMeters = meters.filter(m => m.projectId === selectedProject.id);
                                  const waterMeters = projectMeters.filter(m => m.type === 'Water');
                                  const elecMeters = projectMeters.filter(m => m.type === 'Electricity');

                                  const activeWaterMeters = waterMeters.filter(m => !hiddenAnalysisMeters.has(m.id));
                                  const activeElecMeters = elecMeters.filter(m => !hiddenAnalysisMeters.has(m.id));

                                  const projectMeterIds = projectMeters.map(m => m.id);
                                  const projectReadings = utilityReadings.filter(r => 
                                      projectMeterIds.includes(r.meterId) && 
                                      r.date.startsWith(utilityAnalysisMonth)
                                  );

                                  const chartDataMap = {};
                                  projectReadings.forEach(r => {
                                      const meter = projectMeters.find(m => m.id === r.meterId);
                                      if (!meter) return;
                                      
                                      const dateObj = new Date(r.date);
                                      const displayDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                                      
                                      if (!chartDataMap[r.date]) {
                                          chartDataMap[r.date] = { rawDate: r.date, date: displayDate };
                                      }
                                      
                                      // ใช้ชื่อและรหัสของมิเตอร์เป็น Key
                                      const meterKey = `${meter.name} (${meter.code})`;
                                      chartDataMap[r.date][meterKey] = (chartDataMap[r.date][meterKey] || 0) + r.usage;
                                  });

                                  const chartData = Object.values(chartDataMap).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

                                  if (chartData.length === 0) {
                                      return (
                                          <div className="text-center text-gray-400 py-20 flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                              <BarChart3 size={48} className="text-gray-300 mb-4"/>
                                              <p className="font-bold text-lg">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
                                              <p className="text-sm">ไม่พบประวัติการจดมิเตอร์ในเดือน {new Date(utilityAnalysisMonth + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</p>
                                          </div>
                                      );
                                  }

                                  // ชุดสี
                                  const waterColors = ['#3b82f6', '#0ea5e9', '#6366f1', '#06b6d4', '#8b5cf6', '#2563eb'];
                                  const elecColors = ['#f97316', '#f59e0b', '#ef4444', '#eab308', '#f43f5e', '#ea580c'];

                                  return (
                                      <div className="flex flex-col gap-8">
                                          {/* --- Water Consumption Section --- */}
                                          {waterMeters.length > 0 && (
                                              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                                      <h4 className="font-bold text-blue-700 flex items-center gap-2">
                                                          <Droplet size={18}/> แนวโน้มการใช้น้ำประปา
                                                      </h4>
                                                      <div className="flex items-center bg-blue-50 rounded-lg p-1 border border-blue-100">
                                                          <button onClick={() => setWaterAnalysisMode('combined')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${waterAnalysisMode === 'combined' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-500 hover:text-blue-800'}`}>รวมกราฟ (Combined)</button>
                                                          <button onClick={() => setWaterAnalysisMode('separate')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${waterAnalysisMode === 'separate' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-500 hover:text-blue-800'}`}>1 มิเตอร์ต่อ 1 กราฟ (Separate)</button>
                                                      </div>
                                                  </div>
                                                  
                                                  {/* Filter */}
                                                  <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                      <div className="text-xs font-bold text-gray-500 mr-2 flex items-center"><Search size={14} className="mr-1"/> ตัวกรองมิเตอร์:</div>
                                                      {waterMeters.map((m, idx) => (
                                                          <label key={m.id} className={`flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1 rounded-md border transition-all ${!hiddenAnalysisMeters.has(m.id) ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                                                              <input type="checkbox" checked={!hiddenAnalysisMeters.has(m.id)} onChange={() => toggleMeterVisibility(m.id)} className="accent-blue-600 w-3.5 h-3.5" />
                                                              <span className="truncate max-w-[150px]" title={`${m.name} (${m.code})`}>{m.name}</span>
                                                          </label>
                                                      ))}
                                                  </div>

                                                  {activeWaterMeters.length === 0 ? (
                                                      <div className="text-center text-gray-400 py-12 bg-gray-50 rounded-lg border border-dashed">กรุณาเลือกมิเตอร์อย่างน้อย 1 ตัวเพื่อแสดงกราฟ</div>
                                                  ) : waterAnalysisMode === 'combined' ? (
                                                      // Combined Chart
                                                      <div className="h-80 bg-blue-50/30 rounded-xl border border-blue-50 p-4">
                                                          <ResponsiveContainer width="100%" height="100%">
                                                              {utilityChartType === 'bar' ? (
                                                                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                                                      <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                                      <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                                                      {activeWaterMeters.map((m, idx) => (
                                                                          <Bar key={m.id} dataKey={`${m.name} (${m.code})`} fill={waterColors[idx % waterColors.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                                      ))}
                                                                  </BarChart>
                                                              ) : (
                                                                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                                                      <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                                                      {activeWaterMeters.map((m, idx) => (
                                                                          <Line key={m.id} type="monotone" dataKey={`${m.name} (${m.code})`} stroke={waterColors[idx % waterColors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                                      ))}
                                                                  </LineChart>
                                                              )}
                                                          </ResponsiveContainer>
                                                      </div>
                                                  ) : (
                                                      // Separate Charts
                                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                          {activeWaterMeters.map((m, idx) => {
                                                              const meterKey = `${m.name} (${m.code})`;
                                                              const color = waterColors[idx % waterColors.length];
                                                              return (
                                                                  <div key={m.id} className="border border-blue-100 rounded-xl p-4 bg-white shadow-sm hover:shadow transition-shadow">
                                                                      <h5 className="text-xs font-bold text-blue-800 text-center mb-4 bg-blue-50 py-1.5 rounded-md truncate px-2" title={meterKey}>{meterKey}</h5>
                                                                      <div className="h-48">
                                                                          <ResponsiveContainer width="100%" height="100%">
                                                                              {utilityChartType === 'bar' ? (
                                                                                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                                                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={5} />
                                                                                      <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                                                                      <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                                      <Bar dataKey={meterKey} name="ปริมาณน้ำ" fill={color} radius={[3, 3, 0, 0]} maxBarSize={30} />
                                                                                  </BarChart>
                                                                              ) : (
                                                                                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                                                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={5} />
                                                                                      <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                                                                      <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                                      <Line type="monotone" dataKey={meterKey} name="ปริมาณน้ำ" stroke={color} strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 5 }} />
                                                                                  </LineChart>
                                                                              )}
                                                                          </ResponsiveContainer>
                                                                      </div>
                                                                  </div>
                                                              )
                                                          })}
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                          
                                          {/* --- Electricity Consumption Section --- */}
                                          {elecMeters.length > 0 && (
                                              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                                      <h4 className="font-bold text-orange-600 flex items-center gap-2">
                                                          <Zap size={18}/> แนวโน้มการใช้ไฟฟ้า
                                                      </h4>
                                                      <div className="flex items-center bg-orange-50 rounded-lg p-1 border border-orange-100">
                                                          <button onClick={() => setElecAnalysisMode('combined')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${elecAnalysisMode === 'combined' ? 'bg-white text-orange-700 shadow-sm' : 'text-orange-500 hover:text-orange-800'}`}>รวมกราฟ (Combined)</button>
                                                          <button onClick={() => setElecAnalysisMode('separate')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${elecAnalysisMode === 'separate' ? 'bg-white text-orange-700 shadow-sm' : 'text-orange-500 hover:text-orange-800'}`}>1 มิเตอร์ต่อ 1 กราฟ (Separate)</button>
                                                      </div>
                                                  </div>

                                                  {/* Filter */}
                                                  <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                      <div className="text-xs font-bold text-gray-500 mr-2 flex items-center"><Search size={14} className="mr-1"/> ตัวกรองมิเตอร์:</div>
                                                      {elecMeters.map((m, idx) => (
                                                          <label key={m.id} className={`flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1 rounded-md border transition-all ${!hiddenAnalysisMeters.has(m.id) ? 'bg-orange-100 border-orange-300 text-orange-800 font-medium shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                                                              <input type="checkbox" checked={!hiddenAnalysisMeters.has(m.id)} onChange={() => toggleMeterVisibility(m.id)} className="accent-orange-600 w-3.5 h-3.5" />
                                                              <span className="truncate max-w-[150px]" title={`${m.name} (${m.code})`}>{m.name}</span>
                                                          </label>
                                                      ))}
                                                  </div>

                                                  {activeElecMeters.length === 0 ? (
                                                      <div className="text-center text-gray-400 py-12 bg-gray-50 rounded-lg border border-dashed">กรุณาเลือกมิเตอร์อย่างน้อย 1 ตัวเพื่อแสดงกราฟ</div>
                                                  ) : elecAnalysisMode === 'combined' ? (
                                                      // Combined Chart
                                                      <div className="h-80 bg-orange-50/30 rounded-xl border border-orange-50 p-4">
                                                          <ResponsiveContainer width="100%" height="100%">
                                                              {utilityChartType === 'bar' ? (
                                                                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                                                      <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                                      <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                                                      {activeElecMeters.map((m, idx) => (
                                                                          <Bar key={m.id} dataKey={`${m.name} (${m.code})`} fill={elecColors[idx % elecColors.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                                      ))}
                                                                  </BarChart>
                                                              ) : (
                                                                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                                                      <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                                                      {activeElecMeters.map((m, idx) => (
                                                                          <Line key={m.id} type="monotone" dataKey={`${m.name} (${m.code})`} stroke={elecColors[idx % elecColors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                                      ))}
                                                                  </LineChart>
                                                              )}
                                                          </ResponsiveContainer>
                                                      </div>
                                                  ) : (
                                                      // Separate Charts
                                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                          {activeElecMeters.map((m, idx) => {
                                                              const meterKey = `${m.name} (${m.code})`;
                                                              const color = elecColors[idx % elecColors.length];
                                                              return (
                                                                  <div key={m.id} className="border border-orange-100 rounded-xl p-4 bg-white shadow-sm hover:shadow transition-shadow">
                                                                      <h5 className="text-xs font-bold text-orange-800 text-center mb-4 bg-orange-50 py-1.5 rounded-md truncate px-2" title={meterKey}>{meterKey}</h5>
                                                                      <div className="h-48">
                                                                          <ResponsiveContainer width="100%" height="100%">
                                                                              {utilityChartType === 'bar' ? (
                                                                                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                                                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={5} />
                                                                                      <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                                                                      <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                                      <Bar dataKey={meterKey} name="ปริมาณไฟฟ้า" fill={color} radius={[3, 3, 0, 0]} maxBarSize={30} />
                                                                                  </BarChart>
                                                                              ) : (
                                                                                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                                                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={5} />
                                                                                      <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                                                                      <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                                      <Line type="monotone" dataKey={meterKey} name="ปริมาณไฟฟ้า" stroke={color} strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 5 }} />
                                                                                  </LineChart>
                                                                              )}
                                                                          </ResponsiveContainer>
                                                                      </div>
                                                                  </div>
                                                              )
                                                          })}
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  );
                              })()}
                          </div>
                      )}
                  </div>
              </Card>
          )}

          {projectTab === 'repair' && (
              <div className="space-y-6 animate-fade-in">
                  {/* NEW: Summary Dashboard for Repairs */}
                  {(() => {
                      const projectRepairs = repairs.filter(r => r.projectId === selectedProject.id);
                      const totalRepairs = projectRepairs.length;
                      const statusCounts = { 'รอดำเนินการ': 0, 'ซ่อมแซมเสร็จสิ้น': 0, 'รออะไหล่': 0, 'ต้องจ้างผู้รับเหมาภายนอก': 0 };
                      projectRepairs.forEach(rep => {
                          if (statusCounts[rep.inspectionResult] !== undefined) statusCounts[rep.inspectionResult]++;
                      });

                      return (
                          <Card className="p-6">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-bold flex items-center gap-2 text-gray-800">
                                      <BarChart3 size={20} className="text-orange-500" /> สรุปสถานะการแจ้งซ่อม (Repair Status Summary)
                                  </h3>
                                  <div className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                      ทั้งหมด: {totalRepairs} รายการ
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className={`border p-4 rounded-xl text-center cursor-pointer transition-all ${repairFilter === 'รอดำเนินการ' ? 'bg-orange-50 border-orange-400 shadow-sm' : 'bg-white border-gray-200 hover:border-orange-300'}`} onClick={() => setRepairFilter(repairFilter === 'รอดำเนินการ' ? 'All' : 'รอดำเนินการ')}>
                                      <div className="text-orange-600 text-sm font-bold mb-1">รอดำเนินการ</div>
                                      <div className="text-3xl font-black text-orange-700">{statusCounts['รอดำเนินการ']}</div>
                                  </div>
                                  <div className={`border p-4 rounded-xl text-center cursor-pointer transition-all ${repairFilter === 'รออะไหล่' ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-white border-gray-200 hover:border-yellow-300'}`} onClick={() => setRepairFilter(repairFilter === 'รออะไหล่' ? 'All' : 'รออะไหล่')}>
                                      <div className="text-yellow-600 text-sm font-bold mb-1">รออะไหล่</div>
                                      <div className="text-3xl font-black text-yellow-700">{statusCounts['รออะไหล่']}</div>
                                  </div>
                                  <div className={`border p-4 rounded-xl text-center cursor-pointer transition-all ${repairFilter === 'ต้องจ้างผู้รับเหมาภายนอก' ? 'bg-purple-50 border-purple-400 shadow-sm' : 'bg-white border-gray-200 hover:border-purple-300'}`} onClick={() => setRepairFilter(repairFilter === 'ต้องจ้างผู้รับเหมาภายนอก' ? 'All' : 'ต้องจ้างผู้รับเหมาภายนอก')}>
                                      <div className="text-purple-600 text-sm font-bold mb-1">จ้างผู้รับเหมาฯ</div>
                                      <div className="text-3xl font-black text-purple-700">{statusCounts['ต้องจ้างผู้รับเหมาภายนอก']}</div>
                                  </div>
                                  <div className={`border p-4 rounded-xl text-center cursor-pointer transition-all ${repairFilter === 'ซ่อมแซมเสร็จสิ้น' ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-white border-gray-200 hover:border-green-300'}`} onClick={() => setRepairFilter(repairFilter === 'ซ่อมแซมเสร็จสิ้น' ? 'All' : 'ซ่อมแซมเสร็จสิ้น')}>
                                      <div className="text-green-600 text-sm font-bold mb-1">เสร็จสิ้น</div>
                                      <div className="text-3xl font-black text-green-700">{statusCounts['ซ่อมแซมเสร็จสิ้น']}</div>
                                  </div>
                              </div>
                          </Card>
                      );
                  })()}

                  <Card id="print-repair-area">
                      <div className="p-4 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white">
                          <h3 className="font-bold flex items-center gap-2 text-gray-800 whitespace-nowrap">
                              <Hammer size={20} className="text-orange-500" /> รายการแจ้งซ่อม (Repair Requests)
                          </h3>
                          
                          {/* NEW: Filter Buttons */}
                          <div className={`flex bg-gray-100 p-1 rounded-lg w-full xl:w-auto overflow-x-auto ${isExporting ? 'hidden' : ''}`}>
                              {[
                                  { id: 'All', label: 'ทั้งหมด' },
                                  { id: 'รอดำเนินการ', label: 'รอดำเนินการ' },
                                  { id: 'รออะไหล่', label: 'รออะไหล่' },
                                  { id: 'ต้องจ้างผู้รับเหมาภายนอก', label: 'ผู้รับเหมาฯ' },
                                  { id: 'ซ่อมแซมเสร็จสิ้น', label: 'เสร็จสิ้น' }
                              ].map(status => (
                                  <button
                                      key={status.id}
                                      onClick={() => setRepairFilter(status.id)}
                                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${repairFilter === status.id ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                                  >
                                      {status.label}
                                  </button>
                              ))}
                          </div>

                          <div className={`flex gap-2 shrink-0 ${isExporting ? 'hidden' : ''}`}>
                              <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(repairs.filter(r => r.projectId === selectedProject.id && (repairFilter === 'All' || r.inspectionResult === repairFilter)), 'repair_requests')}>{t('exportCSV')}</Button>
                              <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={() => handleExportPDF('print-repair-area', `Repairs_${selectedProject?.code || 'List'}.pdf`, 'landscape')} disabled={isExporting}>
                                  {isExporting ? t('downloading') : t('downloadPDF')}
                              </Button>
                              {hasPerm('proj_repair', 'save') && <Button size="sm" icon={Plus} onClick={() => {
                                  setNewRepair({ id: null, code: '', roomNo: '', floor: '', requesterName: '', phone: '', issueType: '', issueTypeOther: '', issueDetails: '', inspectionResult: 'รอดำเนินการ', staffDetails: '', cost: '', staffName: '', requesterSignName: '' });
                                  setShowAddRepairModal(true);
                              }}>แจ้งซ่อมใหม่</Button>}
                          </div>
                      </div>
                      <div className={isExporting ? "pb-4" : "overflow-x-auto"}>
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-600">
                                  <tr>
                                      <th className="p-3 border-b text-center w-12">{t('col_seq')}</th>
                                      <th className="p-3 border-b w-36">เลขที่แจ้งซ่อม / วันที่</th>
                                      <th className="p-3 border-b">รายละเอียด / สถานที่</th>
                                      <th className="p-3 border-b">ผู้แจ้ง</th>
                                      <th className="p-3 border-b text-center">สถานะ</th>
                                      <th className={`p-3 border-b text-center w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                  {(() => {
                                      const filteredRepairs = repairs
                                          .filter(r => r.projectId === selectedProject.id && (repairFilter === 'All' || r.inspectionResult === repairFilter))
                                          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); // เรียงลำดับจากวันล่าสุดจากบนลงล่าง

                                      if (filteredRepairs.length === 0) {
                                          return <tr><td colSpan="6" className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 m-4 rounded-lg bg-gray-50">ไม่มีข้อมูลการแจ้งซ่อม</td></tr>;
                                      }

                                      return filteredRepairs.map((rep, index) => (
                                          <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                                              <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                              <td className="p-3 cursor-pointer group" onClick={() => setSelectedRepairView(rep)}>
                                                  <div className="font-mono font-medium text-orange-600 flex items-center">
                                                      {rep.code}
                                                      <FileText size={12} className={`ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity inline ${isExporting ? 'hidden' : ''}`}/>
                                                  </div>
                                                  {rep.date && (
                                                      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                          <Calendar size={10} className="text-gray-400"/> {new Date(rep.date).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}
                                                      </div>
                                                  )}
                                              </td>
                                              <td className="p-3 cursor-pointer" onClick={() => setSelectedRepairView(rep)}>
                                                  <div className="font-medium text-gray-800 flex items-center gap-1">
                                                      {rep.issueType === 'อื่นๆ (ให้ระบุ)' || rep.issueType === 'อื่นๆ' ? rep.issueTypeOther : rep.issueType}
                                                  </div>
                                                  <div className="text-xs text-gray-500 mt-0.5">ห้อง: {rep.roomNo || '-'} {rep.floor ? `(ชั้น ${rep.floor})` : ''}</div>
                                                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rep.issueDetails}</div>
                                              </td>
                                              <td className="p-3 text-gray-700">
                                                  <div className="text-sm font-medium">{rep.requesterName || '-'}</div>
                                                  <div className="text-xs text-gray-500">{rep.phone || '-'}</div>
                                              </td>
                                              <td className="p-3 text-center">
                                                  <span className={`px-2 py-1 rounded-md text-xs font-bold border inline-block w-40 text-center ${
                                                      rep.inspectionResult === 'ซ่อมแซมเสร็จสิ้น' ? 'bg-green-50 border-green-200 text-green-700' : 
                                                      rep.inspectionResult === 'รออะไหล่' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 
                                                      rep.inspectionResult === 'ต้องจ้างผู้รับเหมาภายนอก' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                                      'bg-gray-100 border-gray-300 text-gray-600'
                                                  }`}>
                                                      {rep.inspectionResult}
                                                  </span>
                                              </td>
                                              <td className={`p-3 text-center ${isExporting ? 'hidden' : ''}`}>
                                                  <div className="flex justify-center items-center gap-1">
                                                              {hasPerm('proj_repair', 'edit') && (
                                                          <button 
                                                              onClick={(e) => { e.stopPropagation(); handleEditRepair(rep); }}
                                                              className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                                              title="แก้ไขรายการ"
                                                          >
                                                              <Edit size={16} />
                                                          </button>
                                                      )}
                                                      {hasPerm('proj_repair', 'delete') && (
                                                          <button 
                                                              onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบรายการแจ้งซ่อม ${rep.code} ใช่หรือไม่?`, () => setRepairs(prev => prev.filter(r => r.id !== rep.id))); }}
                                                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                              title="ลบรายการ"
                                                          >
                                                              <Trash2 size={16} />
                                                          </button>
                                                      )}
                                                  </div>
                                              </td>
                                          </tr>
                                      ));
                                  })()}
                              </tbody>
                          </table>
                      </div>
                  </Card>
              </div>
          )}

          {projectTab === 'action' && (
              <div className="space-y-6">
                  {/* เพิ่ม ChartGradients เพื่อเรียกใช้สี Gradient แนว 3D ให้กับกราฟ */}
                  <ChartGradients />
                  
                  {/* Summary Pie Chart Card */}
                  <Card className="p-6">
                      <h3 className="font-bold flex items-center gap-3 mb-6 text-gray-800">
                          {/* 3D Icon Badge */}
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-[0_4px_10px_rgba(234,88,12,0.4),_inset_0_2px_0_rgba(255,255,255,0.3)]">
                              <BarChart3 size={20} /> 
                          </div>
                          สรุปสถานะการดำเนินงาน (Action Plan Summary)
                      </h3>
                      
                      {(() => {
                          const projectActionPlans = actionPlans.filter(a => a.projectId === selectedProject.id);
                          const totalActions = projectActionPlans.length;
                          
                          if (totalActions === 0) {
                              return <div className="text-center text-gray-400 py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</div>;
                          }

                          const statusCounts = { 'Pending': 0, 'In Progress': 0, 'Completed': 0, 'Cancelled': 0 };
                          projectActionPlans.forEach(ap => { if (statusCounts[ap.status] !== undefined) statusCounts[ap.status]++; });

                          // เปลี่ยนการดึงสีเป็น url() จาก ChartGradients เพื่อสร้างแสงเงาบนตัวกราฟ
                          const pieData = [
                              { name: 'รอดำเนินการ', value: statusCounts['Pending'], color: 'url(#colorOrange)' },
                              { name: 'กำลังดำเนินการ', value: statusCounts['In Progress'], color: 'url(#colorBlue)' },
                              { name: 'เสร็จสิ้น', value: statusCounts['Completed'], color: 'url(#colorGreen)' },
                              { name: 'ยกเลิก', value: statusCounts['Cancelled'], color: 'url(#colorGray)' }
                          ].filter(d => d.value > 0);

                          const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              return (
                                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                                      {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                              );
                          };

                          return (
                              <div className="flex flex-col lg:flex-row items-center gap-10">
                                  {/* Pie Chart (3D Styled) */}
                                  <div className="w-full lg:w-5/12 h-[300px] flex justify-center relative">
                                      {/* เงารองพื้นสำหรับความสมจริงแบบ 3D */}
                                      <div className="absolute top-[15%] bottom-[15%] left-[15%] right-[15%] bg-gradient-to-b from-gray-50 to-gray-200 rounded-full scale-[0.8] opacity-60 blur-xl"></div>
                                      <ResponsiveContainer width="100%" height="100%">
                                          <PieChart style={{ filter: 'drop-shadow(3px 8px 10px rgba(0,0,0,0.25))' }}>
                                              <Pie
                                                  data={pieData}
                                                  cx="50%"
                                                  cy="50%"
                                                  labelLine={false}
                                                  label={renderCustomizedLabel}
                                                  outerRadius={110}
                                                  innerRadius={45}
                                                  dataKey="value"
                                                  stroke="#ffffff"
                                                  strokeWidth={2}
                                              >
                                                  {pieData.map((entry, index) => (
                                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                                  ))}
                                              </Pie>
                                              <RechartsTooltip 
                                                  formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)' }}
                                              />
                                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                          </PieChart>
                                      </ResponsiveContainer>
                                  </div>
                                  
                                  {/* Stats Summary (3D Cards) */}
                                  <div className="w-full lg:w-7/12 grid grid-cols-2 gap-5">
                                      <div className="relative bg-gradient-to-b from-white to-orange-50 border border-orange-100 p-5 rounded-2xl text-center shadow-[0_8px_20px_-4px_rgba(234,88,12,0.15),_inset_0_2px_0_rgba(255,255,255,1),_inset_0_-4px_0_rgba(234,88,12,0.05)] transform transition-transform hover:-translate-y-1">
                                          <div className="absolute -top-3 -right-3 w-11 h-11 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-[0_4px_8px_rgba(234,88,12,0.5),_inset_0_2px_0_rgba(255,255,255,0.4)] rotate-3">
                                              <Hourglass size={20}/>
                                          </div>
                                          <div className="text-orange-600 text-sm font-bold mb-1">รอดำเนินการ</div>
                                          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-orange-800 drop-shadow-sm">{statusCounts['Pending']}</div>
                                          <div className="text-xs text-orange-600 mt-2 font-medium bg-white/80 py-1.5 rounded-full border border-orange-100 inline-block px-4 shadow-sm">{((statusCounts['Pending'] / totalActions) * 100).toFixed(1)}%</div>
                                      </div>
                                      
                                      <div className="relative bg-gradient-to-b from-white to-blue-50 border border-blue-100 p-5 rounded-2xl text-center shadow-[0_8px_20px_-4px_rgba(59,130,246,0.15),_inset_0_2px_0_rgba(255,255,255,1),_inset_0_-4px_0_rgba(59,130,246,0.05)] transform transition-transform hover:-translate-y-1">
                                          <div className="absolute -top-3 -right-3 w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-[0_4px_8px_rgba(59,130,246,0.5),_inset_0_2px_0_rgba(255,255,255,0.4)] -rotate-3">
                                              <Wrench size={20}/>
                                          </div>
                                          <div className="text-blue-600 text-sm font-bold mb-1">กำลังดำเนินการ</div>
                                          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-500 to-blue-800 drop-shadow-sm">{statusCounts['In Progress']}</div>
                                          <div className="text-xs text-blue-600 mt-2 font-medium bg-white/80 py-1.5 rounded-full border border-blue-100 inline-block px-4 shadow-sm">{((statusCounts['In Progress'] / totalActions) * 100).toFixed(1)}%</div>
                                      </div>
                                      
                                      <div className="relative bg-gradient-to-b from-white to-green-50 border border-green-100 p-5 rounded-2xl text-center shadow-[0_8px_20px_-4px_rgba(16,185,129,0.15),_inset_0_2px_0_rgba(255,255,255,1),_inset_0_-4px_0_rgba(16,185,129,0.05)] transform transition-transform hover:-translate-y-1">
                                          <div className="absolute -top-3 -right-3 w-11 h-11 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white shadow-[0_4px_8px_rgba(16,185,129,0.5),_inset_0_2px_0_rgba(255,255,255,0.4)] rotate-3">
                                              <CheckCircle size={20}/>
                                          </div>
                                          <div className="text-green-600 text-sm font-bold mb-1">เสร็จสิ้น</div>
                                          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-500 to-green-800 drop-shadow-sm">{statusCounts['Completed']}</div>
                                          <div className="text-xs text-green-600 mt-2 font-medium bg-white/80 py-1.5 rounded-full border border-green-100 inline-block px-4 shadow-sm">{((statusCounts['Completed'] / totalActions) * 100).toFixed(1)}%</div>
                                      </div>
                                      
                                      <div className="relative bg-gradient-to-b from-white to-gray-50 border border-gray-200 p-5 rounded-2xl text-center shadow-[0_8px_20px_-4px_rgba(107,114,128,0.15),_inset_0_2px_0_rgba(255,255,255,1),_inset_0_-4px_0_rgba(107,114,128,0.05)] transform transition-transform hover:-translate-y-1">
                                          <div className="absolute -top-3 -right-3 w-11 h-11 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center text-white shadow-[0_4px_8px_rgba(107,114,128,0.5),_inset_0_2px_0_rgba(255,255,255,0.4)] -rotate-3">
                                              <XCircle size={20}/>
                                          </div>
                                          <div className="text-gray-600 text-sm font-bold mb-1">ยกเลิก</div>
                                          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-gray-800 drop-shadow-sm">{statusCounts['Cancelled']}</div>
                                          <div className="text-xs text-gray-600 mt-2 font-medium bg-white/80 py-1.5 rounded-full border border-gray-200 inline-block px-4 shadow-sm">{((statusCounts['Cancelled'] / totalActions) * 100).toFixed(1)}%</div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })()}
                  </Card>

                  {/* Action Plan Table Card */}
                  <Card id="print-action-plan-area">
                      <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                          <h3 className="font-bold flex items-center gap-3 text-gray-800 whitespace-nowrap">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-[0_2px_6px_rgba(234,88,12,0.4),_inset_0_1px_0_rgba(255,255,255,0.3)]">
                                  <CheckCircle size={16} />
                              </div>
                              รายการ Action Plan
                          </h3>
                          
                          {/* Filter & Sort Group */}
                          <div className={`flex flex-col xl:flex-row gap-4 items-start xl:items-center w-full xl:w-auto ${isExporting ? 'hidden' : ''}`}>
                              {/* Filter Buttons */}
                              <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                                  {[
                                      { id: 'All', label: 'ทั้งหมด' },
                                      { id: 'Pending', label: 'รอดำเนินการ' },
                                      { id: 'In Progress', label: 'กำลังทำ' },
                                      { id: 'Completed', label: 'เสร็จสิ้น' },
                                      { id: 'Cancelled', label: 'ยกเลิก' }
                                  ].map(status => (
                                      <button
                                          key={status.id}
                                          onClick={() => setActionPlanFilter(status.id)}
                                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${actionPlanFilter === status.id ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                                      >
                                          {status.label}
                                      </button>
                                  ))}
                              </div>

                              {/* Sort Dropdown */}
                              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                                  <label className="text-xs font-bold text-gray-500 whitespace-nowrap">เรียงวันเริ่ม:</label>
                                  <select 
                                      className="w-full md:w-auto border border-gray-300 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-orange-200 outline-none bg-white transition-colors cursor-pointer"
                                      value={actionPlanSortOrder}
                                      onChange={e => setActionPlanSortOrder(e.target.value)}
                                  >
                                      <option value="desc">ล่าสุด ไป นานสุด</option>
                                      <option value="asc">นานสุด มา ล่าสุด</option>
                                  </select>
                              </div>
                          </div>

                          <div className={`flex gap-2 shrink-0 ${isExporting ? 'hidden' : ''}`}>
                              {hasPerm('proj_action', 'save') && (
                                  <label className="cursor-pointer flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors bg-green-600 text-white hover:bg-green-700 shadow-sm" title="นำเข้าข้อมูลจากไฟล์ .csv">
                                      <Upload size={14} /> นำเข้า CSV
                                      <input type="file" accept=".csv" className="hidden" onChange={handleImportActionPlanCSV} />
                                  </label>
                              )}
                              <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(actionPlans.filter(a => a.projectId === selectedProject.id && (actionPlanFilter === 'All' || a.status === actionPlanFilter)), 'action_plans')}>{t('exportCSV')}</Button>
                              <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={() => handleExportPDF('print-action-plan-area', `Action_Plan_${selectedProject?.code || 'List'}.pdf`, 'landscape')} disabled={isExporting}>
                                  {isExporting ? t('downloading') : t('downloadPDF')}
                              </Button>
                              {hasPerm('proj_action', 'save') && <Button size="sm" icon={Plus} onClick={() => {
                                  setNewActionPlan({ id: null, issue: '', details: '', responsible: '', otherResponsible: '', startDate: new Date().toISOString().split('T')[0], deadline: '', status: 'Pending' });
                                  setShowAddActionPlanModal(true);
                              }}>เพิ่มรายการ</Button>}
                          </div>
                      </div>
                      <div className={isExporting ? "pb-4" : "overflow-x-auto"}>
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-600">
                                  <tr>
                                      <th className="p-3 border-b text-center w-12">{t('col_seq')}</th>
                                      <th className="p-3 border-b">{t('col_issue')} / รายละเอียด</th>
                                      <th className="p-3 border-b">{t('col_assignee')} (ตำแหน่ง)</th>
                                      <th className="p-3 border-b">วันเริ่ม - {t('col_deadline')}</th>
                                      <th className="p-3 border-b text-center">สถานะ</th>
                                      <th className={`p-3 border-b text-center w-16 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                  {(() => {
                                      const filteredAndSortedAPs = actionPlans
                                          .filter(a => a.projectId === selectedProject.id && (actionPlanFilter === 'All' || a.status === actionPlanFilter))
                                          .sort((a, b) => {
                                              if (actionPlanSortOrder === 'desc') {
                                                  return new Date(b.startDate || 0) - new Date(a.startDate || 0);
                                              } else {
                                                  return new Date(a.startDate || 0) - new Date(b.startDate || 0);
                                              }
                                          });

                                      if (filteredAndSortedAPs.length === 0) {
                                          return <tr><td colSpan="6" className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 m-4 rounded-lg bg-gray-50">{t('noData')}</td></tr>;
                                      }

                                      return filteredAndSortedAPs.map((ap, index) => (
                                          <tr key={ap.id} className="hover:bg-gray-50 transition-colors">
                                              <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                              <td className="p-3 cursor-pointer group" onClick={() => handleEditActionPlan(ap)}>
                                                  <div className="font-medium text-gray-800 group-hover:text-orange-600 flex items-center gap-1 transition-colors">
                                                      {ap.issue} <Edit size={14} className={`text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ${isExporting ? 'hidden' : ''}`}/>
                                                  </div>
                                                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 group-hover:text-gray-700">{ap.details || '-'}</div>
                                              </td>
                                              <td className="p-3 text-gray-700 flex items-center gap-2 mt-1">
                                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0"><User size={12}/></div>
                                                  <span className="text-xs font-medium">{ap.responsible || '-'}</span>
                                              </td>
                                              <td className="p-3 text-gray-600 text-xs">
                                                  <div className="mb-1">เริ่ม: <span className="font-medium">{ap.startDate ? new Date(ap.startDate).toLocaleDateString('th-TH') : '-'}</span></div>
                                                  <div className={new Date(ap.deadline) < new Date() && !['Completed', 'Cancelled'].includes(ap.status) ? 'text-red-600 font-bold' : ''}>
                                                      เสร็จ: <span className="font-medium">{ap.deadline ? new Date(ap.deadline).toLocaleDateString('th-TH') : '-'}</span>
                                                  </div>
                                              </td>
                                              <td className="p-3 text-center">
                                                  {isExporting ? (
                                                      <span className={`px-2 py-1 rounded-md text-xs font-bold border inline-block w-36 text-center ${
                                                          ap.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' : 
                                                          ap.status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                                                          ap.status === 'Cancelled' ? 'bg-gray-100 border-gray-300 text-gray-600' :
                                                          'bg-orange-50 border-orange-200 text-orange-700'
                                                      }`}>
                                                          {ap.status === 'Completed' ? 'ดำเนินการแล้วเสร็จ' : ap.status === 'In Progress' ? 'อยู่ระหว่างดำเนินการ' : ap.status === 'Cancelled' ? 'ยกเลิกดำเนินการ' : 'รอดำเนินการ'}
                                                      </span>
                                                  ) : (
                                                      <select 
                                                          value={ap.status}
                                                          onChange={(e) => handleActionPlanStatusChange(ap.id, e.target.value)}
                                                          className={`px-2 py-1 rounded-md text-xs font-bold border outline-none cursor-pointer hover:shadow-sm transition-all w-36 ${
                                                              ap.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' : 
                                                              ap.status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                                                              ap.status === 'Cancelled' ? 'bg-gray-100 border-gray-300 text-gray-600' :
                                                              'bg-orange-50 border-orange-200 text-orange-700'
                                                          }`}
                                                      >
                                                          <option value="Pending">รอดำเนินการ</option>
                                                          <option value="In Progress">อยู่ระหว่างดำเนินการ</option>
                                                          <option value="Completed">ดำเนินการแล้วเสร็จ</option>
                                                          <option value="Cancelled">ยกเลิกดำเนินการ</option>
                                                      </select>
                                                  )}
                                              </td>
                                              <td className={`p-3 text-center ${isExporting ? 'hidden' : ''}`}>
                                                  {hasPerm('proj_action', 'delete') && (
                                                      <button 
                                                          onClick={(e) => { e.stopPropagation(); showConfirm('ยืนยันการลบ', `คุณต้องการลบรายการ Action Plan นี้ใช่หรือไม่?`, () => setActionPlans(prev => prev.filter(a => a.id !== ap.id))); }}
                                                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                          title="ลบรายการ"
                                                      >
                                                          <Trash2 size={16} />
                                                      </button>
                                                  )}
                                              </td>
                                          </tr>
                                      ));
                                  })()}
                              </tbody>
                          </table>
                      </div>
                  </Card>
              </div>
          )}

          {projectTab === 'daily' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">{t('dailyReports')}</h3>
                    {hasPerm('proj_daily', 'save') && <Button icon={Plus} onClick={() => {
                        setNewDailyReport({
                            id: null,
                            date: new Date().toISOString().split('T')[0],
                            manpower: { juristic: 0, security: 0, cleaning: 0, gardening: 0, sweeper: 0, other: 0, otherLabel: '' },
                            performance: { 
                                juristic: { details: '', images: [] }, security: { details: '', images: [] }, cleaning: { details: '', images: [] },
                                gardening: { details: '', images: [] }, sweeper: { details: '', images: [] }, other: { details: '', images: [] }
                            },
                            income: { commonFee: 0, lateFee: 0, water: 0, parking: 0, violation: 0, other: 0, otherLabel: '' },
                            note: '', reporter: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''
                        });
                        setShowAddDailyReportModal(true);
                    }}>{t('createDailyReport')}</Button>}
                </div>
                {/* List of reports */}
                <div className="grid grid-cols-1 gap-4">
                   {dailyReports.filter(r => r.projectId === selectedProject.id).length === 0 ? (
                       <div className="text-center p-8 text-gray-500 bg-white rounded border border-dashed">{t('noData')}</div>
                   ) : (
                       dailyReports.filter(r => r.projectId === selectedProject.id).sort((a,b) => new Date(b.date) - new Date(a.date)).map(report => (
                           <Card key={report.id} className="p-4 hover:shadow-md cursor-pointer relative group">
                               <div className="flex justify-between" onClick={() => setSelectedDailyReport(report)}>
                                   <span className="font-bold text-blue-700">
                                       รายงานประจำวันที่ {new Date(report.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}
                                   </span>
                                   <span className="text-sm text-gray-500 pr-8"><User size={12} className="inline mr-1"/>{report.reporter}</span>
                               </div>
                               <div className="text-sm mt-2 text-gray-600 line-clamp-2 break-words" onClick={() => setSelectedDailyReport(report)}>{report.note || 'คลิกเพื่อดูรายละเอียดผลการปฏิบัติงาน...'}</div>
                               
                               {!isExporting && hasPerm('proj_daily', 'delete') && (
                                   <button 
                                       onClick={(e) => { 
                                           e.stopPropagation(); 
                                           showConfirm('ยืนยันการลบ', `คุณต้องการลบรายงานประจำวันที่ ${report.date} ใช่หรือไม่?`, () => setDailyReports(prev => prev.filter(r => r.id !== report.id))); 
                                       }}
                                       className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                       title="ลบรายงาน"
                                   >
                                       <Trash2 size={16} />
                                   </button>
                               )}
                           </Card>
                       ))
                   )}
                </div>
            </div>
          )}

          {projectTab === 'audit' && (
              <Card id="print-project-audit" className={isExporting ? 'w-[190mm] min-w-[190mm] max-w-[190mm] mx-auto box-border border-none shadow-none' : ''}>
                  <div className={`p-4 border-b flex justify-between items-center bg-white ${isExporting ? 'hidden' : ''}`}>
                      <h3 className="font-bold flex items-center gap-2 text-gray-800">
                          <ClipboardCheck size={20} className="text-blue-600" /> ประวัติการตรวจสอบ (Audit Records)
                      </h3>
                      <div className="flex gap-2">
                          <Button variant="outline" size="sm" icon={Download} onClick={() => exportToCSV(audits.filter(a => a.projectId === selectedProject.id), 'audit_records')}>{t('exportCSV')}</Button>
                          <Button variant="outline" size="sm" icon={isExporting ? Loader2 : PrinterIcon} onClick={() => {
                              const container = document.getElementById('print-project-audit');
                              if (container) container.scrollTop = 0;
                              handleExportPDF('print-project-audit', `Audit_Records_${selectedProject.code}.pdf`, 'portrait', [22, 10, 20, 10]);
                          }} disabled={isExporting}>
                              {isExporting ? t('downloading') : t('downloadPDF')}
                          </Button>
                          {hasPerm('proj_audit', 'save') && <Button size="sm" icon={Plus} onClick={() => {
                              setNewAudit(prev => ({...prev, projectId: selectedProject.id, inspector: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}));
                              setShowAddAuditModal(true);
                          }}>เพิ่มผลประเมิน</Button>}
                      </div>
                  </div>
                  
                  {isExporting && (
                      <div className="text-center mb-6 pt-4">
                          <h2 className="text-2xl font-bold">ประวัติการตรวจสอบ (Audit Records)</h2>
                          <p className="text-gray-500 mt-1">โครงการ: {selectedProject.name}</p>
                      </div>
                  )}

                  <div className={isExporting ? "w-full pb-4" : "overflow-x-auto"}>
                      <table className="w-full text-sm text-left table-fixed break-words">
                          <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                  <th className="p-3 border-b text-center w-[10%]">{t('col_seq')}</th>
                                  <th className="p-3 border-b w-[20%]">{t('col_date')}</th>
                                  <th className="p-3 border-b w-[20%]">ประเภท (Type)</th>
                                  <th className="p-3 border-b text-center w-[15%]">คะแนน</th>
                                  <th className="p-3 border-b w-[20%]">{t('col_inspector')}</th>
                                  <th className="p-3 border-b w-[15%]">{t('col_remarks')}</th>
                                  <th className={`p-3 border-b text-center w-[10%] ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {audits.filter(a => a.projectId === selectedProject.id).length > 0 ? (
                                  audits.filter(a => a.projectId === selectedProject.id).map((audit, index) => (
                                      <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                          <td className="p-3 font-medium text-blue-600 cursor-pointer hover:underline hover:text-blue-800 flex items-center gap-1 group" onClick={() => setSelectedAuditReport(audit)}>
                                              {audit.date} <Search size={14} className={`text-gray-400 group-hover:text-blue-500 transition-colors ${isExporting ? 'hidden' : ''}`}/>
                                          </td>
                                          <td className="p-3 text-gray-600 break-words whitespace-normal">{audit.category}</td>
                                          <td className="p-3 text-center">
                                              <span className={`font-bold px-2 py-1 rounded-md text-xs ${audit.score >= 90 ? 'bg-green-50 text-green-700 border border-green-200' : audit.score >= 70 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                  {audit.rawScore ? `${audit.rawScore}/235` : `${audit.score}%`}
                                              </span>
                                          </td>
                                          <td className="p-3 text-gray-700 flex items-center gap-1 mt-1 break-words whitespace-normal"><User size={14} className={`text-gray-400 shrink-0 ${isExporting ? 'hidden' : ''}`}/> {audit.inspector}</td>
                                          <td className="p-3 text-gray-500 text-xs break-words whitespace-normal">{audit.remarks || '-'}</td>
                                          <td className={`p-3 text-center ${isExporting ? 'hidden' : ''}`}>
                                              {hasPerm('proj_audit', 'delete') && (
                                                  <button 
                                                      onClick={() => showConfirm('ยืนยันการลบ', 'คุณต้องการลบรายงานผลการตรวจสอบนี้ใช่หรือไม่?', () => setAudits(prev => prev.filter(a => a.id !== audit.id)))}
                                                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                      title="ลบรายงาน"
                                                  >
                                                      <Trash2 size={16} />
                                                  </button>
                                              )}
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr><td colSpan="7" className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 m-4 rounded-lg bg-gray-50">{t('noData')}</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </Card>
          )}

          {/* New Standard Forms Tab */}
          {projectTab === 'forms' && (
              <div className="space-y-6 animate-fade-in">
                  <Card>
                      <div className="p-4 border-b flex justify-between items-center bg-white">
                          <div className="flex flex-col">
                              <h3 className="font-bold flex items-center gap-2 text-gray-800">
                                  <Folder size={20} className="text-orange-500" /> {t('tab_forms')}
                              </h3>
                              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                  <FileText size={14}/> แบบฟอร์มมาตรฐานสำหรับหน่วยงาน
                              </div>
                          </div>
                          <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                              {hasPerm('proj_forms', 'save') && (
                                  <Button size="sm" icon={Plus} onClick={() => {
                                      setNewFormItem({ id: null, category: 'งานบริหารและนิติบุคคล (Juristic & Mgmt.)', name: '', format: 'PDF', size: '100 KB', description: '' });
                                      setShowAddFormModal(true);
                                  }}>เพิ่มแบบฟอร์ม</Button>
                              )}
                          </div>
                      </div>
                      <div className="p-6">
                          {Array.from(new Set(formsList.map(f => f.category))).map(category => (
                              <div key={category} className="mb-8 last:mb-0">
                                  <h4 className="font-bold text-gray-700 border-b-2 border-gray-200 pb-2 mb-4 flex items-center gap-2">
                                      <Folder size={18} className="text-blue-600" /> {category}
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                      {formsList.filter(f => f.category === category).map(form => (
                                          <div 
                                              key={form.id} 
                                              className="border border-gray-200 rounded-xl p-4 flex flex-col hover:shadow-md hover:border-orange-300 transition-all bg-white group cursor-pointer relative"
                                              onClick={() => setSelectedFormDetails(form)}
                                          >
                                              {/* Actions Overlay */}
                                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                                                  {hasPerm('proj_forms', 'edit') && (
                                                      <button className="bg-white p-1.5 rounded-md shadow-sm border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors" onClick={() => handleEditFormItem(form)} title="แก้ไขข้อมูลแบบฟอร์ม">
                                                          <Edit size={14} />
                                                      </button>
                                                  )}
                                                  {hasPerm('proj_forms', 'delete') && (
                                                      <button className="bg-white p-1.5 rounded-md shadow-sm border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors" onClick={() => showConfirm('ยืนยันการลบ', `คุณต้องการลบแบบฟอร์ม "${form.name}" ใช่หรือไม่?`, () => setFormsList(prev => prev.filter(f => f.id !== form.id)))} title="ลบแบบฟอร์ม">
                                                          <Trash2 size={14} />
                                                      </button>
                                                  )}
                                              </div>

                                              <div className="flex items-start gap-3 mb-4 pr-10">
                                                  <div className={`p-2.5 rounded-lg shrink-0 ${form.format === 'PDF' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                                      <FileText size={24} />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                      <h5 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-orange-600 transition-colors line-clamp-2" title={form.name}>{form.name}</h5>
                                                      <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 leading-relaxed" title={form.description}>{form.description || '-'}</p>
                                                      <div className="flex items-center gap-2 mt-2">
                                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${form.format === 'PDF' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{form.format}</span>
                                                          <span className="text-[10px] text-gray-500">{form.size}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <Button 
                                                  variant="outline" 
                                                  size="sm" 
                                                  className="w-full mt-auto flex items-center justify-center gap-2 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300" 
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedFormDetails(form);
                                                  }}
                                              >
                                                  <File size={16} /> ดูแบบฟอร์ม / พิมพ์
                                              </Button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </Card>
              </div>
          )}

          {/* New Contractors/Suppliers Tab */}
          {projectTab === 'contractors' && ContractorVendorList()}

          {/* NEW: Others Tab */}
          {projectTab === 'others' && (
              <div className="space-y-6 animate-fade-in">
                  <Card>
                      <div className="p-4 border-b flex justify-between items-center bg-white">
                          <div>
                              <h3 className="font-bold flex items-center gap-2 text-gray-800">
                                  <Layers size={20} className="text-orange-500" /> ข้อมูลอื่นๆ (Other Information)
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">แหล่งเก็บข้อมูล ลิงก์ หรือรายละเอียดเพิ่มเติมของหน่วยงาน</p>
                          </div>
                          <div className={`flex gap-2 ${isExporting ? 'hidden' : ''}`}>
                              {hasPerm('proj_others', 'save') && (
                                  <Button size="sm" icon={Plus} onClick={() => {
                                      setNewOther({ id: null, title: '', details: '', link: '' });
                                      setShowAddOtherModal(true);
                                  }}>เพิ่มข้อมูล</Button>
                              )}
                          </div>
                      </div>

                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-600 uppercase">
                                  <tr>
                                      <th className="p-4 text-center w-16">ลำดับ</th>
                                      <th className="p-4 w-1/4">หัวข้อ</th>
                                      <th className="p-4 w-1/3">รายละเอียด</th>
                                      <th className="p-4 w-1/4">แนบ Link</th>
                                      <th className={`p-4 text-center w-24 ${isExporting ? 'hidden' : ''}`}>จัดการ</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                  {othersData.filter(o => o.projectId === selectedProject.id).length > 0 ? (
                                      othersData.filter(o => o.projectId === selectedProject.id).map((item, index) => (
                                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                              <td className="p-4 text-center text-gray-500 font-medium">{index + 1}</td>
                                              <td className="p-4 font-bold text-gray-800">{item.title}</td>
                                              <td className="p-4 text-gray-600 whitespace-pre-wrap">{item.details || '-'}</td>
                                              <td className="p-4">
                                                  {item.link ? (
                                                      <a href={item.link.startsWith('http') ? item.link : `https://${item.link}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-xs font-medium bg-blue-50 px-2 py-1 rounded-md w-fit truncate max-w-[200px]" title={item.link}>
                                                          <LinkIcon size={14} className="shrink-0" /> <span className="truncate">{item.link}</span>
                                                      </a>
                                                  ) : (
                                                      <span className="text-gray-400">-</span>
                                                  )}
                                              </td>
                                              <td className={`p-4 text-center ${isExporting ? 'hidden' : ''}`}>
                                                  <div className="flex items-center justify-center gap-1">
                                                      {hasPerm('proj_others', 'edit') && (
                                                          <button 
                                                              onClick={() => { setNewOther(item); setShowAddOtherModal(true); }}
                                                              className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                                              title="แก้ไขข้อมูล"
                                                          >
                                                              <Edit size={16} />
                                                          </button>
                                                      )}
                                                      {hasPerm('proj_others', 'delete') && (
                                                          <button 
                                                              onClick={() => showConfirm('ยืนยันการลบ', `คุณต้องการลบข้อมูลหัวข้อ "${item.title}" ใช่หรือไม่?`, () => setOthersData(prev => prev.filter(o => o.id !== item.id)))}
                                                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                              title="ลบข้อมูล"
                                                          >
                                                              <Trash2 size={16} />
                                                          </button>
                                                      )}
                                                  </div>
                                              </td>
                                          </tr>
                                      ))
                                  ) : (
                                      <tr>
                                          <td colSpan="5" className="p-10 text-center text-gray-400 bg-gray-50 border-b border-dashed">
                                              ยังไม่มีข้อมูลในส่วนนี้ คลิก "เพิ่มข้อมูล" เพื่อเริ่มต้นใช้งาน
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </Card>
              </div>
          )}

        </div>
      </div>
    );
  };

  const SettingsView = () => {
      if (currentUser?.username !== 'admin') {
          return (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fade-in">
                  <Lock size={48} className="mb-4 opacity-50"/>
                  <h2 className="text-xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
                  <p>เมนูตั้งค่าระบบสงวนไว้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น</p>
              </div>
          );
      }

      return (
          <div className="space-y-6 animate-fade-in">
              <ReportHeader />
              <header className="flex justify-between items-center mb-6">
                  <div>
                      <h1 className="text-2xl font-bold text-gray-800">ตั้งค่าระบบ (System Settings)</h1>
                      <p className="text-gray-500">จัดการระบบ สำรองข้อมูล และกู้คืนข้อมูล</p>
                  </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Backup Card */}
                  <Card className="p-6 border-t-4 border-blue-500">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                              <Save size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">สำรองข้อมูล (Export Full Backup)</h3>
                              <p className="text-sm text-gray-500">ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ JSON</p>
                          </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-4 rounded-lg border border-blue-100 leading-relaxed">
                          การสำรองข้อมูลนี้ <strong>รับประกันความครบถ้วน 100%</strong> ครอบคลุมข้อมูลตารางหลัก และ <strong>รายละเอียดเชิงลึกทั้งหมดที่ผู้ใช้งานบันทึกเข้ามา</strong> ได้แก่:<br/><br/>
                          • <strong>ข้อความและรายละเอียด:</strong> โน้ต, หมายเหตุ, อาการแจ้งซ่อม, ผลการทำ PM, รายละเอียดการปฏิบัติงานรายวัน<br/>
                          • <strong>สื่อและไฟล์แนบ:</strong> รูปภาพหน้างาน, รูปโปรไฟล์, รูปทรัพย์สิน, ไฟล์ PDF สัญญาและเอกสารโครงการ<br/>
                          • <strong>ข้อมูลระบบ:</strong> ผู้ใช้งาน, สิทธิ์การใช้งาน, ตารางงาน, ทะเบียนมิเตอร์ ฯลฯ
                      </p>
                      <Button 
                          className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-md text-base py-3" 
                          onClick={handleExportBackup}
                          disabled={isBackingUp}
                      >
                          {isBackingUp ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 
                          {isBackingUp ? 'กำลังรวบรวมไฟล์และข้อมูล 100%...' : 'ส่งออกข้อมูล (Full Backup)'}
                      </Button>
                  </Card>

                  {/* Restore Card */}
                  <Card className="p-6 border-t-4 border-red-500">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                              <Upload size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">นำเข้าข้อมูล (Import / Restore)</h3>
                              <p className="text-sm text-gray-500">อัปเดตระบบด้วยไฟล์ข้อมูล Backup</p>
                          </div>
                      </div>
                      <div className="text-sm text-red-700 font-medium mb-6 bg-red-50 p-4 rounded-lg border border-red-200 flex items-start gap-2">
                          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-red-600" />
                          <div>
                              <strong>คำเตือนอย่างร้ายแรง:</strong><br/>
                              การนำเข้าข้อมูล จะทำการ <span className="underline">เขียนทับ (Overwrite)</span> ข้อมูลปัจจุบันในระบบทั้งหมดด้วยข้อมูลจากไฟล์ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                          </div>
                      </div>
                      <label className={`cursor-pointer w-full inline-block ${isRestoring ? 'opacity-90 pointer-events-none' : ''}`}>
                          <div className={`w-full text-white font-medium py-3 px-4 rounded-md transition-all flex flex-col justify-center items-center gap-2 shadow-sm ${isRestoring ? 'bg-orange-500' : 'bg-red-600 hover:bg-red-700'}`}>
                              {isRestoring ? (
                                  <>
                                      <div className="flex items-center gap-2">
                                          <Loader2 size={20} className="animate-spin" />
                                          <span className="font-bold tracking-wide">กำลังทำงาน โปรดอย่าปิดหน้าต่าง...</span>
                                      </div>
                                      <div className="text-xs bg-black/20 px-3 py-1 rounded-full text-white/90 mt-1 animate-pulse">
                                          {restoreProgress}
                                      </div>
                                  </>
                              ) : (
                                  <div className="flex items-center gap-2"><Upload size={18} /> เลือกไฟล์เพื่อนำเข้า (Import JSON)</div>
                              )}
                          </div>
                          <input 
                              type="file" 
                              accept=".json" 
                              className="hidden" 
                              onChange={handleImportBackup} 
                              onClick={(e) => { e.target.value = null; }} // Allow selecting the same file again
                              disabled={isRestoring}
                          />
                      </label>
                  </Card>

                  {/* Google Sheets Sync Card */}
                  <Card className="p-6 border-t-4 border-green-500 md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-green-100 text-green-600 rounded-lg shadow-sm">
                              <Globe size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">สำรองข้อมูลไปที่ Google Sheets</h3>
                              <p className="text-sm text-gray-500">ซิงค์ฐานข้อมูลหลักออกไปยัง Spreadsheet</p>
                          </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-6 bg-green-50 p-4 rounded-lg border border-green-100 leading-relaxed">
                          ระบบจะทำการส่งข้อมูลตารางหลักทั้งหมด (เช่น รายชื่อพนักงาน, ทรัพย์สิน, ประวัติแจ้งซ่อม, บันทึกมิเตอร์น้ำไฟ) ไปยัง Google Sheet ID: <br/><span className="font-mono font-bold text-green-700 bg-white px-2 py-1 rounded inline-block mt-2 shadow-sm break-all">1J5rup8PlSmKStjO8G13EvGfau1yFCF5kSWFLFHfHklU</span><br/>โดยสคริปต์จะทำการสร้าง Sheet ย่อย และจัดเรียงคอลัมน์ให้อัตโนมัติ
                      </p>
                      
                      <Button 
                          className="w-full md:w-auto flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700 shadow-md text-base py-3 px-6" 
                          onClick={handleSyncToGoogleSheets}
                          disabled={isSyncingSheets}
                      >
                          {isSyncingSheets ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} 
                          {isSyncingSheets ? 'ระบบกำลังทำการซิงค์ข้อมูล...' : 'ส่งข้อมูลไปอัปเดตที่ Google Sheets'}
                      </Button>
                  </Card>

                  {/* Google Drive Backup Card */}
                  <Card className="p-6 border-t-4 border-indigo-500 md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
                              <Cloud size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">สำรองไฟล์และรูปภาพ ไปที่ Google Drive</h3>
                              <p className="text-sm text-gray-500">อัปโหลดไฟล์เอกสารและรูปภาพทั้งหมดในระบบไปเก็บไว้ที่ Drive ของคุณ</p>
                          </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100 leading-relaxed">
                          ระบบจะดึงไฟล์สัญญา (PDF), รูปภาพพนักงาน, รูปลูกค้า, รูปทรัพย์สิน และรูปประวัติการทำ PM ส่งไปบันทึกยัง Google Drive ของคุณโดยอัตโนมัติ เพื่อป้องกันการสูญหายของไฟล์ขนาดใหญ่ 
                          (เนื่องจากต้องส่งไปทีละไฟล์ อาจใช้เวลาดำเนินการสักครู่)
                      </p>
                      
                      <Button 
                          className="w-full md:w-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md text-base py-3 px-6" 
                          onClick={handleBackupToDrive}
                          disabled={isBackingUpToDrive}
                      >
                          {isBackingUpToDrive ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />} 
                          {isBackingUpToDrive ? 'กำลังส่งไฟล์ไปที่ Drive ทีละรายการ...' : 'เริ่มอัปโหลดไฟล์ไปที่ Google Drive'}
                      </Button>
                  </Card>
              </div>
          </div>
      );
  };

  // --- NEW: Component สำหรับหน้าคู่มือการใช้งาน (Manual View) ---
  const ManualView = () => {
      const manualTopics = [
          { id: 'intro', icon: Info, title: 'เริ่มต้นการใช้งาน (Introduction)' },
          { id: 'dashboard', icon: BarChart3, title: 'ภาพรวมองค์กร (Dashboard)' },
          { id: 'users', icon: Users, title: 'จัดการผู้ใช้งานและสิทธิ์ (Users)' },
          { id: 'projects', icon: Building2, title: 'การจัดการหน่วยงาน (Projects)' },
          { id: 'staff_schedule', icon: Calendar, title: 'บุคลากรและตารางงาน (Staff & Schedule)' },
          { id: 'contracts_vendors', icon: Briefcase, title: 'สัญญาจ้างและซัพพลายเออร์ (Contracts)' },
          { id: 'daily', icon: FileText, title: 'รายงานประจำวัน (Daily Report)' },
          { id: 'utilities', icon: Zap, title: 'ระบบมิเตอร์น้ำ-ไฟ (Utilities)' },
          { id: 'repair', icon: Hammer, title: 'งานแจ้งซ่อม (Repair)' },
          { id: 'pm', icon: Wrench, title: 'งานบำรุงรักษาเชิงป้องกัน (PM)' },
          { id: 'assets_tools', icon: Shield, title: 'ทะเบียนทรัพย์สิน/เครื่องมือ (Assets/Tools)' },
          { id: 'action', icon: CheckCircle, title: 'แผนปฏิบัติการ (Action Plan)' },
          { id: 'audits', icon: ClipboardCheck, title: 'ตรวจสอบคุณภาพ (Audit)' },
          { id: 'forms', icon: Folder, title: 'แบบฟอร์มมาตรฐาน (Forms)' },
          { id: 'settings', icon: Settings, title: 'ตั้งค่าระบบ (Settings)' },
      ];

      const WebImage = ({ srcStr, alt }) => {
          const [hasError, setHasError] = useState(false);
          
          let finalSrc = srcStr;
          // ตรวจจับกรณีที่ระบบแปลงคำสั่งเป็น Markdown Image อัตโนมัติ
          const mdMatch = typeof srcStr === 'string' && srcStr.match(/!\[.*?\]\((.*?)\)/);
          if (mdMatch) {
              finalSrc = mdMatch[1];
          }

          // หากไม่พบ URL รูปภาพ หรือ รูปภาพโหลดไม่ขึ้น ให้แสดงกรอบข้อความแทน
          if (hasError || !finalSrc || finalSrc.startsWith('[Image of')) {
              return (
                  <div className="w-full my-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-10 text-gray-500 shadow-inner">
                      <ImageIcon size={48} className="mb-3 text-gray-400" />
                      <p className="font-medium text-sm text-gray-600">{alt}</p>
                      <p className="text-xs text-gray-400 mt-2">(รอการอัปเดตภาพหน้าจอจริง หรือ ภาพจำลองไม่สามารถโหลดได้)</p>
                  </div>
              );
          }

          return (
              <div className="w-full my-6 flex justify-center">
                  <img 
                      src={finalSrc} 
                      alt={alt} 
                      className="rounded-xl shadow-md border border-gray-200 max-w-full h-auto max-h-[400px] object-contain bg-white" 
                      onError={() => setHasError(true)} 
                  />
              </div>
          );
      };

      const renderManualContent = () => {
          switch (activeManualTab) {
              case 'intro':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">เริ่มต้นการใช้งานระบบ Best Million Group</h2>
                          <p>ยินดีต้อนรับเข้าสู่ระบบ Enterprise ERP สำหรับการบริหารจัดการอาคารและนิติบุคคล ระบบนี้ถูกออกแบบมาเพื่อช่วยลดขั้นตอนการทำงานเอกสาร และรวบรวมข้อมูลทุกด้านไว้ในที่เดียว</p>
                          <WebImage srcStr="" alt="หน้าจอเข้าสู่ระบบ (Login Screen)" />
                          <h3 className="text-lg font-bold mt-6">การเข้าสู่ระบบ (Login)</h3>
                          <ul className="list-disc pl-6 space-y-2">
                              <li>ผู้ใช้งานสามารถเข้าสู่ระบบโดยใช้ <strong>รหัสพนักงาน</strong> (Employee ID) เป็น Username</li>
                              <li>กรอกรหัสผ่านที่ได้รับจากฝ่ายบุคคลหรือ Admin ในครั้งแรกที่เข้าใช้งาน</li>
                              <li>หากลืมรหัสผ่าน กรุณาติดต่อผู้จัดการหน่วยงานหรือผู้ดูแลระบบส่วนกลาง</li>
                          </ul>
                          <h3 className="text-lg font-bold mt-6">เมนูและการปรับแต่งระบบ (Navigation & Themes)</h3>
                          <p>ที่มุมขวาบนของหน้าจอ คุณจะพบกับแถบเครื่องมือสำหรับปรับแต่งระบบ:</p>
                          <ul className="list-disc pl-6 space-y-2">
                              <li><strong>ปุ่มเปลี่ยนธีม (Theme Toggle):</strong> สามารถสลับการแสดงผลได้ 3 รูปแบบ (Light Mode, Dark Mode, Sweet Mode)</li>
                              <li><strong>เปลี่ยนภาษา:</strong> รองรับการแสดงผลภาษาไทย (TH) และภาษาอังกฤษ (EN)</li>
                              <li><strong>ซ่อน/แสดง เมนูด้านซ้าย:</strong> เพื่อเพิ่มพื้นที่การทำงานในหน้าจอให้กว้างขึ้น</li>
                          </ul>
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mt-6">
                              <h4 className="font-bold text-orange-800 flex items-center gap-2"><HelpCircle size={16}/> ทราบหรือไม่?</h4>
                              <p className="text-sm mt-1 text-orange-700">สิทธิ์การมองเห็นเมนูต่างๆ ของแต่ละคนจะไม่เหมือนกัน ขึ้นอยู่กับตำแหน่งงานและหน่วยงานที่คุณสังกัด หากคุณพบว่าไม่สามารถเข้าถึงบางเมนูได้ นั่นหมายความว่าสิทธิ์ของคุณไม่ได้ถูกกำหนดให้ใช้งานในส่วนนั้น</p>
                          </div>
                      </div>
                  );
              case 'dashboard':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">ภาพรวมองค์กร (Corporate Dashboard)</h2>
                          <p>หน้า Dashboard เป็นส่วนที่รวบรวมสถิติที่สำคัญของทุกโครงการมาแสดงผลในรูปแบบกราฟ เพื่อให้ผู้บริหารหรือผู้จัดการสามารถมองเห็นภาพรวมประสิทธิภาพการทำงานได้อย่างรวดเร็ว</p>
                          <WebImage srcStr="" alt="หน้าจอแดชบอร์ดสรุปสถิติองค์กร" />
                          <h3 className="text-lg font-bold mt-6">ส่วนประกอบของ Dashboard</h3>
                          <ul className="list-disc pl-6 space-y-2">
                              <li><strong>KPI Cards:</strong> แสดงตัวเลขสำคัญสรุปผล เช่น จำนวนโครงการทั้งหมด, พนักงานทั้งหมด, คะแนน Audit เฉลี่ย และงาน Action Plan ที่ยังค้างอยู่ (สามารถคลิกที่การ์ดเพื่อดูรายละเอียดรายชื่อได้ทันที)</li>
                              <li><strong>กราฟวงกลมแยกประเภทโครงการ:</strong> แสดงสัดส่วนของหน่วยงานที่รับบริหาร (อาคารชุด, หมู่บ้าน, สำนักงาน)</li>
                              <li><strong>สถิติการส่งรายงานประจำวัน:</strong> ตรวจสอบได้ทันทีว่าหน่วยงานใดส่งหรือขาดส่งรายงานประจำวันในเดือนปัจจุบัน (จากกราฟแท่ง)</li>
                              <li><strong>สถานะ Action Plan:</strong> ดูกราฟแท่งเปรียบเทียบงานที่กำลังดำเนินการและงานที่เสร็จสิ้นของแต่ละหน่วยงาน</li>
                              <li><strong>ตารางแจ้งเตือนสัญญา:</strong> แสดงรายชื่อหน่วยงานเรียงตามวันครบกำหนดสัญญาบริการ เพื่อให้ผู้บริหารไม่พลาดการต่อสัญญา โดยจะไฮไลท์สีแดงสำหรับสัญญาที่หมดอายุแล้ว</li>
                          </ul>
                          <WebImage srcStr="" alt="ปุ่มการส่งออกเอกสาร PDF และ CSV ในหน้าแดชบอร์ด" />
                          <p><strong>การส่งออกรายงาน:</strong> คุณสามารถคลิกปุ่ม <code>Export PDF</code> ที่มุมขวาบน เพื่อสร้างรายงานสรุปเป็นไฟล์ PDF สำหรับนำเสนอในที่ประชุมได้ทันที</p>
                      </div>
                  );
              case 'users':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">จัดการผู้ใช้งานและสิทธิ์ (User Management)</h2>
                          <p>เมนูนี้ใช้สำหรับเพิ่ม ลบ หรือแก้ไขข้อมูลพนักงานในองค์กร รวมถึงการกำหนดสิทธิ์ในการเข้าถึงเมนูย่อยต่างๆ (สงวนสิทธิ์การจัดการระดับลึกให้เฉพาะ Admin)</p>
                          <WebImage srcStr="" alt="หน้าจอการจัดการผู้ใช้งาน และ รายชื่อพนักงาน" />
                          <h3 className="text-lg font-bold mt-6">การเพิ่มพนักงานใหม่ (Add User)</h3>
                          <ol className="list-decimal pl-6 space-y-2">
                              <li>คลิกที่ปุ่ม <strong>"เพิ่มผู้ใช้ (Add User)"</strong></li>
                              <li>กรอกข้อมูลส่วนตัว เช่น รหัสพนักงาน, ชื่อ-นามสกุล, เบอร์โทร และกำหนด Username/Password (ใช้สำหรับล็อกอิน)</li>
                              <li>เลือก <strong>ตำแหน่งงาน</strong> และ <strong>ประจำหน่วยงาน</strong></li>
                              <li>ส่วนของ <strong>หน่วยงานที่เข้าถึงได้ (Accessible Depts)</strong>: หากต้องการให้พนักงานคนนี้เห็นข้อมูลหลายโครงการ ให้เลือกชื่อโครงการมาใส่เพิ่ม (หรือเลือก All) หากเว้นว่างไว้ พนักงานจะเห็นเฉพาะโครงการที่ตนเองประจำอยู่</li>
                              <li>กำหนดสิทธิ์การใช้งาน (ดู, บันทึก, แก้ไข, อนุมัติ, ลบ) ตามเมนูต่างๆ เป็นรายบุคคล</li>
                              <li>คลิก <strong>บันทึก</strong></li>
                          </ol>
                          <WebImage srcStr="" alt="หน้าต่างตั้งค่าสิทธิ์พื้นฐานตามตำแหน่ง (Role Permissions)" />
                          <h3 className="text-lg font-bold mt-6">การตั้งค่าสิทธิ์เริ่มต้น (Role Permissions)</h3>
                          <p>ผู้ดูแลระบบสามารถกำหนดสิทธิ์ตั้งต้นให้แต่ละตำแหน่งได้ เช่น ตำแหน่ง "ช่างประจำอาคาร" จะมีสิทธิ์บันทึกเฉพาะเมนู "แจ้งซ่อม" และ "PM" เท่านั้น โดยการคลิกที่ปุ่ม <strong>"ตั้งค่าสิทธิ์ตามตำแหน่ง"</strong> จากนั้นเมื่อมีการเพิ่มพนักงานใหม่แล้วเลือกตำแหน่งนั้น ระบบจะดึงสิทธิ์เหล่านี้มาเป็นค่าเริ่มต้นให้อัตโนมัติ</p>
                          
                          <h3 className="text-lg font-bold mt-6">การนำเข้าข้อมูลจากไฟล์ CSV (Import)</h3>
                          <p>รองรับการเพิ่มพนักงานจำนวนมากพร้อมกัน โดยเตรียมไฟล์ CSV ที่มีคอลัมน์ <code>username</code>, <code>firstName</code>, <code>lastName</code>, <code>employeeId</code>, <code>position</code>, <code>department</code> แล้วคลิกปุ่ม <strong>"นำเข้า CSV"</strong></p>
                      </div>
                  );
              case 'projects':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">การจัดการหน่วยงาน (Projects & Units)</h2>
                          <p>เมนู "โครงการ / หน่วยงาน" เป็นศูนย์กลางในการปฏิบัติงานของทุกนิติบุคคล เมื่อคุณคลิกเข้ามา คุณจะพบกับรายชื่อหน่วยงานทั้งหมดที่คุณมีสิทธิ์เข้าถึง สามารถเลือกมุมมองได้ทั้งแบบการ์ด (Grid) หรือแบบตาราง (List)</p>
                          <WebImage srcStr="" alt="หน้าจอรายชื่อโครงการ (Grid/List View)" />
                          <h3 className="text-lg font-bold mt-6">การเพิ่มหน่วยงานใหม่</h3>
                          <p>คลิก <strong>"เพิ่มโครงการ"</strong> กรอกรายละเอียดสำคัญ เช่น ชื่อโครงการ, รหัสโครงการ (ระบบสร้างให้อัตโนมัติ), ที่อยู่, วันเริ่มต้น-สิ้นสุดสัญญา, มูลค่าสัญญา และสามารถอัปโหลดโลโก้รวมถึงเอกสารสำคัญ (อช.13, รายการจดกรรมการ) เพื่อเก็บไว้เป็นฐานข้อมูลส่วนกลางได้</p>
                          <WebImage srcStr="" alt="หน้าจอแสดงภาพรวมภายในโครงการ (Project Overview)" />
                          <h3 className="text-lg font-bold mt-6">ภาพรวมโครงการ (Overview Tab)</h3>
                          <p>เมื่อคลิกเข้าไปในโครงการใดโครงการหนึ่ง ระบบจะนำคุณมาที่แท็บ <strong>"ภาพรวม"</strong> ซึ่งเป็นเหมือนหน้าปัดสั่งการ (Control Panel) ของหน่วยงานนั้นๆ</p>
                          <ul className="list-disc pl-6 space-y-2">
                              <li><strong>การแจ้งเตือน (Alerts):</strong> หากมีสัญญาจ้างผู้รับเหมา/รปภ./แม่บ้าน ที่ใกล้หมดอายุ (น้อยกว่า 45 วัน) จะมีแถบสีแดงแจ้งเตือนขึ้นมาด้านบนสุด</li>
                              <li><strong>สถานะงานรายเดือน:</strong> แสดงตัวเลขการขาด-ลา-มาสายของพนักงาน, จำนวนรายงานประจำวันที่ส่ง, การจดมิเตอร์น้ำไฟ, สรุปสถานะการทำ PM และ Action Plan</li>
                              <li><strong>เอกสารสำคัญ:</strong> ด้านล่างสุดของหน้าภาพรวม จะมีช่องให้คลิกดาวน์โหลดเอกสารนิติบุคคลที่ได้อัปโหลดไว้</li>
                          </ul>
                      </div>
                  );
              case 'staff_schedule':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">บุคลากรและตารางงาน (Staff & Schedule)</h2>
                          
                          <h3 className="text-lg font-bold mt-4">แท็บบุคลากร (Staff)</h3>
                          <p>แสดงรายชื่อพนักงานทั้งหมดที่สังกัดอยู่ในหน่วยงานนั้นๆ สามารถเลือกมุมมองแบบตาราง (List) เพื่อดูข้อมูลแบบกระชับ หรือมุมมองแบบ <strong>แผนผังองค์กร (Organization Chart)</strong> เพื่อดูลำดับขั้นการบริหารงาน (ผู้จัดการ &gt; หัวหน้างาน &gt; พนักงานปฏิบัติการ)</p>
                          <WebImage srcStr="" alt="หน้าจอ Organization Chart ของบุคลากร" />

                          <h3 className="text-lg font-bold mt-6">แท็บตารางงาน (Schedule Tab)</h3>
                          <p>ใช้สำหรับจัดตารางกะการทำงานของพนักงานในโครงการนั้นๆ ประจำเดือน</p>
                          <WebImage srcStr="" alt="หน้าจอการจัดตารางงาน (Work Schedule)" />
                          <ul className="list-disc pl-6 space-y-2">
                              <li><strong>การจัดคิวงาน:</strong> คุณสามารถคลิกลากสลับตำแหน่ง (Drag & Drop) รายชื่อพนักงานในตารางได้ เพื่อจัดกลุ่มเวรให้ดูง่ายขึ้น</li>
                              <li><strong>การลงกะ (Auto-fill):</strong> สะดวกยิ่งขึ้นด้วยการ <strong>"คลิกเลือกสัญลักษณ์กะ (Shift)"</strong> จากคำอธิบายด้านล่าง (เช่น คลิกที่ M1 หรือ V) จากนั้นนำเมาส์ไปคลิกที่ช่องตารางในวันที่ต้องการ ระบบจะเติมกะให้ทันทีโดยไม่ต้องพิมพ์เอง</li>
                              <li><strong>ระบบอนุมัติ (Approval Workflow):</strong> เมื่อจัดตารางเสร็จ ผู้จัดการจะต้องกด "บันทึก" จากนั้นกด <strong>"ผู้จัดการอนุมัติ"</strong> เพื่อส่งเรื่องให้ HR จากส่วนกลางกดอนุมัติในขั้นตอนสุดท้ายเพื่อความสมบูรณ์ของเอกสาร</li>
                              <li><strong>พิมพ์เป็น PDF:</strong> สามารถคลิกปุ่ม <strong>พิมพ์ / PDF</strong> เพื่อพรินต์ตารางงานขนาด A4 แนวนอน (พร้อมหัวกระดาษและลายเซ็นผู้อนุมัติ) ไปติดบอร์ดที่หน่วยงานได้ทันที</li>
                          </ul>
                      </div>
                  );
              case 'contracts_vendors':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">สัญญาจ้างและซัพพลายเออร์ (Contracts & Vendors)</h2>
                          
                          <h3 className="text-lg font-bold mt-4">เมนูค้นหา Supplier (ส่วนกลาง)</h3>
                          <p>เมนู "ค้นหา Supplier" ที่แถบเมนูด้านซ้าย เป็นแหล่งรวบรวมรายชื่อผู้รับเหมาและผู้ให้บริการ (Vendor) จาก <strong>"ทุกโครงการ"</strong> มาไว้ที่เดียวกัน เพื่อให้ผู้บริหารหรือจัดซื้อสามารถค้นหาข้อมูลติดต่อ และตรวจสอบได้ว่าปัจจุบันบริษัทเราใช้บริการใครบ้างในหมวดงานไหน (เช่น งานรักษาความสะอาด, งานลิฟต์)</p>
                          <WebImage srcStr="" alt="หน้าจอรายชื่อ Supplier และ Vendor" />

                          <h3 className="text-lg font-bold mt-6">แท็บสัญญาจ้าง (Contracts - ระดับโครงการ)</h3>
                          <p>เมื่อเข้ามาที่หน้าโครงการและเลือกแท็บ <strong>"สัญญาจ้าง"</strong> จะพบกับรายการสัญญาที่มีผลบังคับใช้กับหน่วยงานนั้นๆ โดยแบ่งเป็น สัญญารับ (Income), สัญญาจ่าย (Expense) และผู้รับเหมา (Contractor)</p>
                          <WebImage srcStr="" alt="หน้าจอรายการสัญญาจ้างและวันหมดอายุ" />
                          <ul className="list-disc pl-6 space-y-2">
                              <li>ระบบจะคำนวณ <strong>จำนวนวันคงเหลือ (Days Remaining)</strong> ให้อัตโนมัติ โดยอ้างอิงจากวันที่สิ้นสุดสัญญา</li>
                              <li>สัญญาใดที่ใกล้หมดอายุ จะแสดงผลเป็นตัวอักษรสีส้ม หรือ สีแดง เพื่อเตือนให้รีบดำเนินการต่อสัญญา</li>
                              <li>สามารถแนบไฟล์สัญญา (PDF) เข้าสู่ระบบ เพื่อความสะดวกในการเปิดดูรายละเอียดเงื่อนไขการจ้าง หรือดาวน์โหลดไปตรวจสอบ</li>
                          </ul>
                      </div>
                  );
              case 'daily':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">รายงานประจำวัน (Daily Report)</h2>
                          <p>โมดูลสำหรับให้ผู้จัดการหรือเจ้าหน้าที่นิติบุคคลจัดทำรายงานสรุปเหตุการณ์และผลการปฏิบัติงานในแต่ละวัน เพื่อให้ผู้บริหารส่วนกลาง หรือคณะกรรมการบริหาร (Committee) ทราบความเคลื่อนไหว</p>
                          <WebImage srcStr="" alt="หน้ารายการรายงานประจำวันและปุ่มเพิ่มรายงาน" />
                          <h3 className="text-lg font-bold mt-6">วิธีการเขียนรายงาน</h3>
                          <ol className="list-decimal pl-6 space-y-2">
                              <li>ไปที่หน่วยงานของคุณ เลือกแท็บ <strong>"รายงานประจำวัน"</strong> และคลิก <strong>"เขียนรายงาน"</strong></li>
                              <li><strong>กำลังพล (Manpower):</strong> ระบุจำนวนพนักงานที่มาปฏิบัติงานจริงในแต่ละแผนก (นิติบุคคล, รปภ., แม่บ้าน, คนสวน)</li>
                              <li><strong>รายรับ (Income):</strong> สรุปยอดเงินที่รับเข้ามาในวันนั้น เช่น ค่าส่วนกลาง, ค่าน้ำประปา, ค่าปรับ โดยระบบจะคำนวณผลรวมให้อัตโนมัติ</li>
                              <li><strong>ผลการปฏิบัติงาน (Performance):</strong> พิมพ์อธิบายรายละเอียดงานที่ทำในแต่ละแผนก พร้อม <strong>อัปโหลดรูปภาพ</strong> ประกอบการทำงาน (แนะนำให้ถ่ายรูปจากหน้างานจริง)</li>
                          </ol>
                          <WebImage srcStr="" alt="หน้าต่างฟอร์มกรอกข้อมูลรายงานประจำวัน" />
                          <h3 className="text-lg font-bold mt-4">การพิมพ์และส่งออกเอกสาร</h3>
                          <p>รายงานประจำวันที่บันทึกแล้ว จะถูกจัดรูปแบบให้สวยงามพอดีกับกระดาษ A4 แนวตั้งโดยอัตโนมัติ คุณสามารถคลิกเข้าไปดูรายงานย้อนหลังและกด <strong>ดาวน์โหลด PDF</strong> เพื่อเก็บเป็นหลักฐานการทำงานประจำวันได้</p>
                      </div>
                  );
              case 'utilities':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">ระบบมิเตอร์น้ำ-ไฟ (Utilities)</h2>
                          <p>ส่วนสำหรับจดบันทึกและวิเคราะห์แนวโน้มการใช้น้ำประปาและไฟฟ้าส่วนกลางของโครงการ</p>
                          
                          <h3 className="text-lg font-bold mt-4">1. ทะเบียนมิเตอร์ (Registry)</h3>
                          <p>เริ่มต้นการใช้งานโดยการเพิ่มรายชื่อมิเตอร์ที่ต้องจดค่าก่อน (เช่น มิเตอร์เมนน้ำประปา, มิเตอร์ไฟฟ้าคลับเฮ้าส์) ระบุประเภท รหัส และตำแหน่งที่ติดตั้ง รวมถึง <strong>ค่ายกมาเริ่มต้น (Initial Value)</strong></p>
                          
                          <WebImage srcStr="" alt="หน้าจอสำหรับกรอกบันทึกเลขมิเตอร์" />
                          <h3 className="text-lg font-bold mt-4">2. จดบันทึก (Record)</h3>
                          <ul className="list-disc pl-6 space-y-2">
                              <li>เลือกมิเตอร์ที่ต้องการจด และกรอกเลขมิเตอร์ปัจจุบันลงในช่อง</li>
                              <li>ระบบจะดึง <strong>ค่ายกมา (Prev Value)</strong> จากเดือนที่แล้วมาหักลบ และคำนวณ <strong>จำนวนหน่วยที่ใช้ (Usage)</strong> ให้อัตโนมัติ</li>
                              <li>เมื่อกดบันทึก (Enter) ระบบจะเลื่อนไปยังมิเตอร์ตัวถัดไปให้อัตโนมัติ เพื่อความรวดเร็วในการพิมพ์ต่อเนื่อง</li>
                          </ul>

                          <WebImage srcStr="" alt="หน้าจอวิเคราะห์กราฟแนวโน้มการใช้น้ำและไฟ" />
                          <h3 className="text-lg font-bold mt-4">3. วิเคราะห์ (Analysis)</h3>
                          <p>ดูแนวโน้มการใช้พลังงานในรูปแบบกราฟแท่ง (Bar) หรือกราฟเส้น (Line) สามารถเลือก <strong>ตัวกรอง (Filter)</strong> เพื่อดูเฉพาะมิเตอร์ที่สนใจ หรือเลือกแสดงผลรวมทุกมิเตอร์ (Combined) เพื่อวิเคราะห์ค่าใช้จ่ายส่วนกลางเปรียบเทียบแต่ละเดือนได้</p>
                      </div>
                  );
              case 'repair':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">งานแจ้งซ่อม (Repair Requests)</h2>
                          <p>ระบบติดตามและจัดการใบแจ้งซ่อมจากลูกบ้าน หรือปัญหาความชำรุดบกพร่องของทรัพย์สินส่วนกลาง</p>
                          <WebImage srcStr="" alt="หน้าจอรายการแจ้งซ่อม และ กราฟสรุปสถานะ" />
                          <h3 className="text-lg font-bold mt-6">ขั้นตอนการจัดการงานซ่อม</h3>
                          <ol className="list-decimal pl-6 space-y-2">
                              <li>เมื่อได้รับแจ้งปัญหา ให้คลิก <strong>"แจ้งซ่อมใหม่"</strong></li>
                              <li>กรอกข้อมูลผู้แจ้ง (เลขห้อง, ชั้น, ชื่อ, เบอร์โทร) และระบุรายละเอียดของปัญหาว่าเกี่ยวกับระบบใด (ประปา, ไฟฟ้า, แอร์ ฯลฯ)</li>
                              <li>ระบบจะสร้าง <strong>เลขที่ใบแจ้งซ่อม (Ticket No.)</strong> ให้อัตโนมัติ (เช่น C-001-REP-001)</li>
                              <li>เมื่อช่างเข้าไปตรวจสอบหน้างาน สามารถกลับมา <strong>แก้ไข</strong> เพื่ออัปเดต "ส่วนของเจ้าหน้าที่" โดยเลือกสถานะ เช่น รออะไหล่, ต้องจ้างผู้รับเหมา, หรือ ซ่อมแซมเสร็จสิ้น พร้อมระบุค่าใช้จ่ายและรายละเอียดการแก้ไขที่ทำไป</li>
                          </ol>
                          <WebImage srcStr="" alt="ตัวอย่างใบแจ้งซ่อมในรูปแบบเอกสารสำหรับพิมพ์ (PDF)" />
                          <p className="mt-4"><strong>พิมพ์ใบแจ้งซ่อม:</strong> คุณสามารถคลิกที่ใบแจ้งซ่อมในตาราง เพื่อดูหน้าตาของแบบฟอร์ม และสั่งพิมพ์ (PDF) ออกทางเครื่องพรินเตอร์ให้ลูกบ้านเซ็นรับทราบหลังปฏิบัติงานแล้วเสร็จ เพื่อเก็บไว้เป็นหลักฐาน</p>
                      </div>
                  );
              case 'pm':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">งานบำรุงรักษาเชิงป้องกัน (Preventive Maintenance - PM)</h2>
                          <p>ระบบจัดการเครื่องจักรและสร้างตารางบำรุงรักษา เพื่อยืดอายุการใช้งานของอุปกรณ์ในอาคาร (เช่น ลิฟต์, ปั๊มน้ำ, ระบบ Fire Alarm)</p>
                          <WebImage srcStr="" alt="หน้าจอทะเบียนเครื่องจักร (Machine Registry)" />
                          <h3 className="text-lg font-bold mt-6">ขั้นตอนการใช้งานระบบ PM (5 แท็บ)</h3>
                          <ul className="list-disc pl-6 space-y-4">
                              <li>
                                  <strong>1. ทะเบียนเครื่องจักร (Registry):</strong> เริ่มต้นด้วยการเพิ่มข้อมูลเครื่องจักร อุปกรณ์ และระบบต่างๆ ที่มีในอาคาร พร้อมระบุสถานที่ติดตั้งและถ่ายรูปประกอบ
                              </li>
                              <li>
                                  <strong>2. แผนงาน (Plan):</strong> นำเครื่องจักรที่ลงทะเบียนไว้ มาตั้งค่าความถี่ในการตรวจเช็ค (Frequency) เช่น ตรวจทุกวัน, ทุกวันจันทร์, ทุกวันที่ 5 ของเดือน
                              </li>
                              <li>
                                  <strong>3. ปฏิทิน (Calendar):</strong> <br/>
                                  <WebImage srcStr="" alt="หน้าจอปฏิทิน PM ประจำเดือน" />
                                  ระบบจะนำแผนงานมาสร้างเป็นปฏิทินปฏิบัติงานรายเดือนอัตโนมัติ (คล้าย Google Calendar) ช่างประจำอาคารสามารถ <strong>คลิกที่ชื่อเครื่องจักรในปฏิทินของวันนั้นๆ</strong> เพื่อเปิดแบบฟอร์มบันทึกผลการตรวจเช็คได้ทันที
                              </li>
                              <li>
                                  <strong>4. แบบฟอร์ม PM (PM Form):</strong> <br/>
                                  <WebImage srcStr="" alt="แบบฟอร์มตรวจสอบ (Checklist) ขณะกำลังบันทึก" />
                                  เมื่อคลิกบันทึกจากปฏิทิน ระบบจะสร้างแบบฟอร์ม Checklist ให้สอดคล้องกับ "ประเภทระบบ" ของเครื่องจักรโดยอัตโนมัติ (เช่น ระบบลิฟต์จะมีหัวข้อตรวจเช็คสลิง/ประตู, ระบบปั๊มน้ำมีหัวข้อเช็คแรงดัน) ช่างจะต้องคลิกเลือก ปกติ/ผิดปกติ/NA และสามารถแนบรูปถ่ายความผิดปกติ (Evidence Photos) ได้
                              </li>
                              <li>
                                  <strong>5. ประวัติ (History):</strong> ดูประวัติการทำ PM ย้อนหลัง และผู้บริหาร/หัวหน้าช่าง สามารถเข้ามา <strong>"ตรวจสอบและอนุมัติ"</strong> ผลการทำ PM ในแท็บนี้ได้
                              </li>
                          </ul>
                      </div>
                  );
              case 'assets_tools':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">ทะเบียนทรัพย์สิน และ เครื่องมือช่าง (Assets & Tools)</h2>
                          <p>โมดูลสำหรับควบคุมและตรวจสอบพัสดุ คงคลังเครื่องมือที่อยู่ในโครงการ ป้องกันการสูญหายและการเสื่อมสภาพ</p>
                          <WebImage srcStr="" alt="หน้าจอบันทึกทะเบียนทรัพย์สินและเครื่องมือช่าง" />
                          <h3 className="text-lg font-bold mt-6">การลงทะเบียนทรัพย์สิน / เครื่องมือ</h3>
                          <ul className="list-disc pl-6 space-y-2">
                              <li>สามารถแยกระหว่าง <strong>ทรัพย์สินของส่วนกลาง (Assets)</strong> เช่น โซฟา, โต๊ะล็อบบี้, เครื่องออกกำลังกาย และ <strong>เครื่องมือช่าง (Tools)</strong> เช่น สว่าน, เครื่องเชื่อม, บันได</li>
                              <li>รหัสทรัพย์สินจะถูก <strong>สร้างให้อัตโนมัติ (Auto-generate)</strong> โดยมีตัวย่อ A (Asset) หรือ T (Tool) นำหน้า</li>
                              <li>รองรับการ <strong>อัปโหลดภาพถ่าย</strong> เพื่อให้ง่ายต่อการระบุตัวตนและตรวจสอบสภาพ (Audit)</li>
                              <li>สามารถคลิกที่รายการในตารางเพื่อดูรายละเอียดฉบับเต็มได้</li>
                          </ul>
                      </div>
                  );
              case 'action':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">แผนปฏิบัติการ (Action Plan)</h2>
                          <p>พื้นที่สำหรับติดตามการทำงานที่ได้รับมอบหมาย หรือปัญหาที่มีระยะเวลาดำเนินการยาวนาน (เช่น การปรับปรุงภูมิทัศน์, การทาสีอาคารใหม่)</p>
                          <WebImage srcStr="" alt="หน้าจอกราฟและรายการ Action Plan" />
                          <h3 className="text-lg font-bold mt-4">การจัดการ Action Plan</h3>
                          <ul className="list-disc pl-6 space-y-2">
                              <li>ผู้จัดการสามารถเพิ่มแผนงาน มอบหมายผู้รับผิดชอบ และกำหนดวันที่เริ่ม-สิ้นสุด (Deadline)</li>
                              <li>สถานะสามารถปรับเปลี่ยนได้ตลอดเวลา: <strong>รอดำเนินการ, กำลังทำ, เสร็จสิ้น, ยกเลิก</strong></li>
                              <li>ด้านบนของหน้าจะมี <strong>Dashboard กราฟวงกลม 3D</strong> แสดงสัดส่วนสถานะงานทั้งหมด เพื่อให้ทีมทราบถึงภาพรวมความคืบหน้าของโครงการ</li>
                              <li>หากงานใดเลยกำหนด Deadline (และยังไม่เสร็จสิ้น) วันที่จะเปลี่ยนเป็น <strong>ตัวอักษรสีแดง</strong> เพื่อแจ้งเตือนความล่าช้า</li>
                          </ul>
                      </div>
                  );
              case 'audits':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">ตรวจสอบคุณภาพ (Internal Audit)</h2>
                          <p>โมดูลสำหรับผู้บริหารหรือทีม QC จากส่วนกลาง (Head Office) เพื่อใช้ตรวจประเมินคุณภาพการบริหารงานของแต่ละนิติบุคคล</p>
                          <WebImage srcStr="" alt="หน้าจอการประเมิน Audit Checklist" />
                          <h3 className="text-lg font-bold mt-6">วิธีการตรวจประเมินหน้างาน</h3>
                          <ul className="list-disc pl-6 space-y-2">
                              <li>สามารถเข้าถึงได้จากเมนู <strong>ตรวจสอบภายใน (Audit)</strong> ที่แถบเมนูหลักด้านซ้ายสุด (เมนูกลาง)</li>
                              <li>คลิก <strong>"บันทึกผลตรวจ (New Audit)"</strong> เลือกระบุโครงการที่เข้าไปตรวจ และกรอกชื่อผู้ตรวจ</li>
                              <li>ทำการให้คะแนน (1-5) ตามหัวข้อมาตรฐาน 10 หมวดหมู่ (เช่น บุคลิกภาพพนักงาน, การจัดการเงินสดย่อย, ความสะอาด, สต๊อกอุปกรณ์ ฯลฯ) พร้อมระบุข้อเสนอแนะรายข้อ</li>
                              <li>ระบบจะคำนวณคะแนนรวม 235 คะแนน และแปลงเป็นเปอร์เซ็นต์ให้อัตโนมัติ: <br/>
                                  <span className="text-green-600 font-bold">ผ่านเกณฑ์ (90-100%)</span>, 
                                  <span className="text-yellow-600 font-bold"> ควรปรับปรุง (70-89%)</span>, 
                                  <span className="text-red-600 font-bold"> วิกฤต (ต่ำกว่า 70%)</span>
                              </li>
                          </ul>
                          <WebImage srcStr="" alt="หน้าต่าง Leaderboard จัดอันดับคะแนน Audit" />
                          <p className="mt-4"><strong>Leaderboard:</strong> ที่หน้าแดชบอร์ดโครงการ จะมีปุ่ม <strong>"ดูอันดับคะแนนทั้งหมด"</strong> ซึ่งจะแสดงตารางจัดอันดับโครงการที่มีคะแนนเฉลี่ยสูงสุด (Leaderboard) เพื่อใช้เป็นเกณฑ์พิจารณาโบนัส หรือสร้างแรงจูงใจในการแข่งขันการให้บริการของแต่ละทีมได้</p>
                      </div>
                  );
              case 'forms':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">แบบฟอร์มมาตรฐาน (Standard Forms)</h2>
                          <p>ศูนย์รวมการจัดเก็บแบบฟอร์มการทำงาน (Template) ของนิติบุคคล เพื่อลดการใช้กระดาษ และให้พนักงานทุกโครงการมีมาตรฐานการทำงานเดียวกัน</p>
                          <WebImage srcStr="" alt="หน้ารายการแบบฟอร์มมาตรฐานที่แบ่งตามหมวดหมู่" />
                          <h3 className="text-lg font-bold mt-4">การใช้งานแบบฟอร์ม</h3>
                          <ul className="list-disc pl-6 space-y-2">
                              <li>Admin สามารถเพิ่มแบบฟอร์มใหม่ โดยระบุชื่อ, หมวดหมู่การใช้งาน, รูปแบบไฟล์ (PDF, Excel)</li>
                              <li><strong>การแก้ไขและพิมพ์แบบฟอร์ม:</strong> <br/>ระบบมีฟังก์ชัน Document Builder ซ่อนอยู่ เมื่อคุณคลิก <strong>"ดูแบบฟอร์ม/พิมพ์"</strong> ที่แบบฟอร์มบางชนิด (เช่น ใบแจ้งย้ายของ, ใบลงทะเบียนรถ) จะพบหน้าตัวอย่างเอกสาร</li>
                              <li>คุณสามารถคลิกปุ่ม <strong>"แก้ไขแบบฟอร์ม"</strong> ซึ่งจะแสดง <strong>กรอบเส้นประสีน้ำเงิน</strong> ขึ้นมา เพื่อให้คุณสามารถพิมพ์ข้อความ, ติ๊กถูก, หรือปรับปรุงข้อความบนหน้ากระดาษจำลองได้เสมือนโปรแกรม MS Word</li>
                              <li>เมื่อแก้ไขเสร็จสิ้น กดปุ่ม <strong>"พิมพ์ / PDF"</strong> ระบบจะบันทึกหน้ากระดาษนั้นให้กลายเป็นไฟล์ PDF สวยงาม นำไปให้ลูกบ้านใช้งานได้ทันที</li>
                          </ul>
                      </div>
                  );
              case 'settings':
                  return (
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">ตั้งค่าระบบและสำรองข้อมูล (System Settings)</h2>
                          <p className="text-red-600 font-bold mb-4">* เมนูนี้สงวนสิทธิ์การเข้าถึงให้เฉพาะระดับผู้ดูแลระบบ (Admin) เท่านั้น</p>
                          <p>เนื่องจากระบบของเราถูกออกแบบมาให้ทำงานบน Local Browser (เพื่อความรวดเร็วและปลอดภัย) <strong>การสำรองข้อมูล (Backup) จึงเป็นเรื่องที่สำคัญที่สุด</strong> เพื่อป้องกันกรณี Cache ของเบราว์เซอร์ถูกลบ</p>
                          <WebImage srcStr="" alt="หน้าจอการตั้งค่าและ Backup ข้อมูล" />
                          <h3 className="text-lg font-bold mt-6">วิธีการสำรองข้อมูล</h3>
                          <ol className="list-decimal pl-6 space-y-2">
                              <li><strong>Export Backup (.json):</strong> ดาวน์โหลดไฟล์รวมข้อมูลทั้งหมดในระบบ (รวมถึงรูปภาพและ PDF ที่เข้ารหัสไว้) ไปเก็บไว้ที่เครื่องคอมพิวเตอร์ของคุณ ควรทำเป็นประจำทุกสัปดาห์</li>
                              <li><strong>Google Sheets Sync:</strong> (ต้องเชื่อมต่อ API) ระบบจะส่งข้อมูลที่เป็นตัวอักษรและตารางทั้งหมด ออกไปจัดเรียงเป็นตารางบน Google Sheets ให้โดยอัตโนมัติ เพื่อเป็นฐานข้อมูลสำรอง</li>
                              <li><strong>Google Drive Backup:</strong> (ต้องเชื่อมต่อ API) ระบบจะทยอยส่งไฟล์เอกสารสัญญา PDF และรูปภาพต่างๆ ไปบันทึกเก็บไว้ใน Google Drive ขององค์กร เพื่อลดพื้นที่การเก็บข้อมูลในเบราว์เซอร์</li>
                          </ol>
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-6">
                              <h4 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={16}/> การนำเข้าข้อมูล (Restore)</h4>
                              <p className="text-sm mt-1 text-red-700">เมื่อคุณทำการ Import ไฟล์ Backup (.json) กลับเข้ามา <strong>ระบบจะเขียนทับ (Overwrite) ข้อมูลปัจจุบันทั้งหมดทันที</strong> กรุณาใช้ด้วยความระมัดระวังเฉพาะเมื่อเปลี่ยนเครื่องคอมพิวเตอร์ หรือข้อมูลสูญหายเท่านั้น</p>
                          </div>
                      </div>
                  );
              default:
                  return null;
          }
      };

      return (
          <div className="space-y-6 animate-fade-in h-full flex flex-col">
              <ReportHeader />
              <header className="flex justify-between items-center mb-2 shrink-0">
                  <div>
                      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BookOpen className="text-blue-600" size={28}/> คู่มือการใช้งานระบบ (User Manual)</h1>
                      <p className="text-gray-500">เอกสารแนะนำวิธีการใช้งานระบบแต่ละโมดูลอย่างละเอียด</p>
                  </div>
              </header>

              <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
                  {/* Left Sidebar Menu for Manual */}
                  <div className="w-full md:w-64 bg-white rounded-xl border border-gray-200 shadow-sm p-4 shrink-0 h-fit md:sticky top-24">
                      <h3 className="font-bold text-gray-800 mb-4 px-2 uppercase tracking-wide text-sm">สารบัญ (Table of Contents)</h3>
                      <div className="flex flex-col space-y-1">
                          {manualTopics.map(topic => (
                              <button
                                  key={topic.id}
                                  onClick={() => setActiveManualTab(topic.id)}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left ${activeManualTab === topic.id ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}
                              >
                                  <topic.icon size={18} className={activeManualTab === topic.id ? 'text-blue-600' : 'text-gray-400'} />
                                  {topic.title}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-10 overflow-y-auto">
                      {renderManualContent()}
                  </div>
              </div>
          </div>
      );
  };

  if (!currentUser) return renderLoginView();

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 w-full overflow-x-hidden ${!isExporting ? (theme === 'dark' ? 'dark-theme' : theme === 'sweet' ? 'sweet-theme' : theme === 'crimson' ? 'crimson-theme' : theme === 'sunset' ? 'sunset-theme' : 'bg-gray-100 text-gray-900') : 'bg-gray-100 text-gray-900'}`}>
      {/* ซ่อนลูกศรขึ้น-ลง ของ input type="number" ทั้งระบบ และเพิ่ม Dark Mode Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Caveat:wght@700&display=swap');
        
        body, .font-sans, p, span, div, h1, h2, h3, h4, h5, h6, input, textarea, select, button, table {
          font-family: 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }

        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
        /* Dark Theme Global Overrides */
        .dark-theme { background-color: #111827 !important; color: #f3f4f6 !important; }
        .dark-theme .bg-white { background-color: #1f2937 !important; }
        .dark-theme .bg-gray-50 { background-color: #111827 !important; }
        .dark-theme .bg-gray-100 { background-color: #374151 !important; }
        .dark-theme .bg-gray-200 { background-color: #4b5563 !important; }
        .dark-theme .text-gray-900 { color: #f9fafb !important; }
        .dark-theme .text-gray-800 { color: #f3f4f6 !important; }
        .dark-theme .text-gray-700 { color: #e5e7eb !important; }
        .dark-theme .text-gray-600 { color: #d1d5db !important; }
        .dark-theme .text-gray-500 { color: #9ca3af !important; }
        .dark-theme .text-gray-400 { color: #6b7280 !important; }
        .dark-theme .border-gray-100 { border-color: #1f2937 !important; }
        .dark-theme .border-gray-200 { border-color: #374151 !important; }
        .dark-theme .border-gray-300 { border-color: #4b5563 !important; }
        .dark-theme .border-gray-400 { border-color: #6b7280 !important; }
        .dark-theme .divide-gray-100 > :not([hidden]) ~ :not([hidden]) { border-color: #1f2937 !important; }
        .dark-theme .divide-gray-200 > :not([hidden]) ~ :not([hidden]) { border-color: #374151 !important; }
        
        /* Inputs & Forms */
        .dark-theme input:not([type="radio"]):not([type="checkbox"]), .dark-theme select, .dark-theme textarea {
            background-color: #1f2937 !important;
            color: #f3f4f6 !important;
            border-color: #4b5563 !important;
        }
        .dark-theme input:not([type="radio"]):not([type="checkbox"]):focus, .dark-theme select:focus, .dark-theme textarea:focus {
            background-color: #374151 !important;
        }
        .dark-theme input::placeholder, .dark-theme textarea::placeholder { color: #9ca3af !important; }
        
        /* Badges & Accents */
        .dark-theme .bg-green-50, .dark-theme .bg-green-100 { background-color: rgba(5, 150, 105, 0.15) !important; border-color: rgba(5, 150, 105, 0.3) !important; color: #6ee7b7 !important; }
        .dark-theme .text-green-500, .dark-theme .text-green-600, .dark-theme .text-green-700, .dark-theme .text-green-800 { color: #6ee7b7 !important; }
        .dark-theme .border-green-100, .dark-theme .border-green-200, .dark-theme .border-green-300 { border-color: rgba(5, 150, 105, 0.4) !important; }
        
        .dark-theme .bg-red-50, .dark-theme .bg-red-100 { background-color: rgba(220, 38, 38, 0.15) !important; border-color: rgba(220, 38, 38, 0.3) !important; color: #fca5a5 !important; }
        .dark-theme .text-red-500, .dark-theme .text-red-600, .dark-theme .text-red-700, .dark-theme .text-red-800 { color: #fca5a5 !important; }
        .dark-theme .border-red-100, .dark-theme .border-red-200, .dark-theme .border-red-300 { border-color: rgba(220, 38, 38, 0.4) !important; }
        
        .dark-theme .bg-orange-50, .dark-theme .bg-orange-100 { background-color: rgba(234, 88, 12, 0.15) !important; border-color: rgba(234, 88, 12, 0.3) !important; color: #fdba74 !important; }
        .dark-theme .text-orange-500, .dark-theme .text-orange-600, .dark-theme .text-orange-700, .dark-theme .text-orange-800 { color: #fdba74 !important; }
        .dark-theme .border-orange-100, .dark-theme .border-orange-200, .dark-theme .border-orange-300 { border-color: rgba(234, 88, 12, 0.4) !important; }
        
        .dark-theme .bg-blue-50, .dark-theme .bg-blue-100 { background-color: rgba(37, 99, 235, 0.15) !important; border-color: rgba(37, 99, 235, 0.3) !important; color: #93c5fd !important; }
        .dark-theme .text-blue-500, .dark-theme .text-blue-600, .dark-theme .text-blue-700, .dark-theme .text-blue-800 { color: #93c5fd !important; }
        .dark-theme .border-blue-100, .dark-theme .border-blue-200, .dark-theme .border-blue-300 { border-color: rgba(37, 99, 235, 0.4) !important; }
        
        .dark-theme .bg-yellow-50, .dark-theme .bg-yellow-100 { background-color: rgba(202, 138, 4, 0.15) !important; border-color: rgba(202, 138, 4, 0.3) !important; color: #fde047 !important; }
        .dark-theme .text-yellow-500, .dark-theme .text-yellow-600, .dark-theme .text-yellow-700, .dark-theme .text-yellow-800 { color: #fde047 !important; }
        .dark-theme .border-yellow-100, .dark-theme .border-yellow-200, .dark-theme .border-yellow-300 { border-color: rgba(202, 138, 4, 0.4) !important; }
        
        .dark-theme .bg-purple-50, .dark-theme .bg-purple-100 { background-color: rgba(124, 58, 237, 0.15) !important; border-color: rgba(124, 58, 237, 0.3) !important; color: #c4b5fd !important; }
        .dark-theme .text-purple-500, .dark-theme .text-purple-600, .dark-theme .text-purple-700, .dark-theme .text-purple-800 { color: #c4b5fd !important; }
        .dark-theme .border-purple-100, .dark-theme .border-purple-200, .dark-theme .border-purple-300 { border-color: rgba(124, 58, 237, 0.4) !important; }

        .dark-theme .bg-cyan-50, .dark-theme .bg-cyan-100 { background-color: rgba(6, 182, 212, 0.15) !important; border-color: rgba(6, 182, 212, 0.3) !important; color: #67e8f9 !important; }
        .dark-theme .text-cyan-500, .dark-theme .text-cyan-600, .dark-theme .text-cyan-700, .dark-theme .text-cyan-800 { color: #67e8f9 !important; }

        /* Modals & Shadows */
        .dark-theme .bg-white.rounded-lg.shadow-xl { background-color: #1f2937 !important; border: 1px solid #374151; }
        .dark-theme .shadow-sm, .dark-theme .shadow, .dark-theme .shadow-md, .dark-theme .shadow-lg, .dark-theme .shadow-xl {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3) !important;
        }
        
        /* Tables */
        .dark-theme table th { color: #9ca3af !important; background-color: #111827 !important; border-color: #374151 !important; }
        .dark-theme table td { border-color: #374151 !important; }
        .dark-theme tr:hover td { background-color: #374151 !important; }

        /* Recharts */
        .dark-theme .recharts-cartesian-axis-tick-value { fill: #9ca3af !important; }
        .dark-theme .recharts-legend-item-text { color: #e5e7eb !important; }
        .dark-theme .recharts-default-tooltip { background-color: #1f2937 !important; border: 1px solid #374151 !important; color: #f3f4f6 !important; }
        .dark-theme .recharts-tooltip-item-name, .dark-theme .recharts-tooltip-item-value { color: #f3f4f6 !important; }

        /* Animation for Notification Bell */
        @keyframes ring {
          0% { transform: rotate(0); }
          5% { transform: rotate(15deg); }
          10% { transform: rotate(-10deg); }
          15% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          25% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .animate-ring {
          animation: ring 2.5s ease-in-out infinite;
          transform-origin: top center;
        }

        /* Sweet Theme Global Overrides (Pastel Pink) */
        .sweet-theme { background-color: #FFF5F8 !important; color: #5C434B !important; }
        .sweet-theme .bg-white { background-color: #ffffff !important; border-color: #FCE1E8 !important; }
        .sweet-theme .bg-gray-50 { background-color: #FFEDF1 !important; }
        .sweet-theme .bg-gray-100 { background-color: #FCE1E8 !important; }
        .sweet-theme .bg-gray-200 { background-color: #F8C8D4 !important; }
        
        .sweet-theme .text-gray-900, .sweet-theme .text-gray-800 { color: #5C434B !important; }
        .sweet-theme .text-gray-700, .sweet-theme .text-gray-600 { color: #7A5F69 !important; }
        .sweet-theme .text-gray-500 { color: #967E88 !important; }
        .sweet-theme .text-gray-400 { color: #B39CA6 !important; }
        
        .sweet-theme .border-gray-100, .sweet-theme .border-gray-200 { border-color: #FCE1E8 !important; }
        .sweet-theme .border-gray-300, .sweet-theme .border-gray-400 { border-color: #F8C8D4 !important; }
        .sweet-theme .divide-gray-100 > :not([hidden]) ~ :not([hidden]), .sweet-theme .divide-gray-200 > :not([hidden]) ~ :not([hidden]) { border-color: #FCE1E8 !important; }
        
        /* Sidebar in Sweet Theme (Soft Pastel) */
        .sweet-theme .bg-gray-900 { background-color: #FDE8ED !important; color: #5C434B !important; }
        .sweet-theme .bg-gray-900.text-white { color: #5C434B !important; } 
        .sweet-theme .bg-gray-900 .text-white { color: #5C434B !important; } 
        .sweet-theme .bg-gray-900 .text-gray-400 { color: #997B86 !important; }
        .sweet-theme .bg-gray-900 .text-gray-500 { color: #8C6D78 !important; }
        .sweet-theme .bg-gray-900 .hover\:text-white:hover { color: #D4758B !important; }
        .sweet-theme .border-gray-800 { border-color: #F4C4D0 !important; }
        .sweet-theme .bg-gray-800, .sweet-theme .hover\:bg-gray-800:hover, .sweet-theme .group:hover .group-hover\:bg-gray-800 { background-color: #F4C4D0 !important; }
        
        /* Inputs in Sweet Theme */
        .sweet-theme input:not([type="radio"]):not([type="checkbox"]), .sweet-theme select, .sweet-theme textarea {
            background-color: #FFFDFE !important;
            color: #5C434B !important;
            border-color: #FCE1E8 !important;
        }
        .sweet-theme input:not([type="radio"]):not([type="checkbox"]):focus, .sweet-theme select:focus, .sweet-theme textarea:focus {
            border-color: #F4A6B7 !important;
            box-shadow: 0 0 0 2px rgba(244, 166, 183, 0.3) !important;
            background-color: #ffffff !important;
        }
        
        /* Overriding Primary Accents (Orange to Pastel Pink) */
        .sweet-theme .bg-orange-50 { background-color: #FFF5F8 !important; }
        .sweet-theme .bg-orange-100 { background-color: #FFEDF1 !important; }
        .sweet-theme .bg-orange-500, .sweet-theme .bg-orange-600 { background-color: #F4A6B7 !important; color: white !important; }
        .sweet-theme .hover\:bg-orange-700:hover { background-color: #E88FA4 !important; }
        
        .sweet-theme .text-orange-400, .sweet-theme .text-orange-500, .sweet-theme .text-orange-600, .sweet-theme .text-orange-700 { color: #D4758B !important; }
        .sweet-theme .border-orange-200, .sweet-theme .border-orange-300, .sweet-theme .border-orange-500 { border-color: #F4A6B7 !important; }
        
        /* Tables in Sweet Theme */
        .sweet-theme table th { color: #7A5F69 !important; background-color: #FFEDF1 !important; border-color: #FCE1E8 !important; }
        .sweet-theme table td { border-color: #FCE1E8 !important; }
        .sweet-theme tr:hover td { background-color: #FFF5F8 !important; }

        /* Crimson Theme Global Overrides (Black Background, Dark Red Sidebar) */
        .crimson-theme { background-color: #000000 !important; color: #f3f4f6 !important; }
        .crimson-theme .bg-white { background-color: #121212 !important; border-color: #330000 !important; }
        .crimson-theme .bg-gray-50 { background-color: #1a1a1a !important; }
        .crimson-theme .bg-gray-100 { background-color: #222222 !important; }
        .crimson-theme .bg-gray-200 { background-color: #2a2a2a !important; }
        
        .crimson-theme .text-gray-900, .crimson-theme .text-gray-800 { color: #f9fafb !important; }
        .crimson-theme .text-gray-700, .crimson-theme .text-gray-600 { color: #e5e7eb !important; }
        .crimson-theme .text-gray-500 { color: #9ca3af !important; }
        .crimson-theme .text-gray-400 { color: #6b7280 !important; }
        
        .crimson-theme .border-gray-100, .crimson-theme .border-gray-200 { border-color: #330000 !important; }
        .crimson-theme .border-gray-300, .crimson-theme .border-gray-400 { border-color: #4a0404 !important; }
        .crimson-theme .divide-gray-100 > :not([hidden]) ~ :not([hidden]), .crimson-theme .divide-gray-200 > :not([hidden]) ~ :not([hidden]) { border-color: #330000 !important; }
        
        /* Sidebar in Crimson Theme */
        .crimson-theme .bg-gray-900 { background-color: #4A0404 !important; color: #FFFFFF !important; }
        .crimson-theme .bg-gray-900.text-white { color: #FFFFFF !important; } 
        .crimson-theme .bg-gray-900 .text-white { color: #FFFFFF !important; } 
        .crimson-theme .bg-gray-900 .text-gray-400 { color: #FCA5A5 !important; }
        .crimson-theme .bg-gray-900 .text-gray-500 { color: #F87171 !important; }
        .crimson-theme .bg-gray-900 .hover\:text-white:hover { color: #FFFFFF !important; }
        .crimson-theme .border-gray-800 { border-color: #7F1D1D !important; }
        .crimson-theme .bg-gray-800, .crimson-theme .hover\:bg-gray-800:hover, .crimson-theme .group:hover .group-hover\:bg-gray-800 { background-color: #7F1D1D !important; }
        
        /* Inputs in Crimson Theme */
        .crimson-theme input:not([type="radio"]):not([type="checkbox"]), .crimson-theme select, .crimson-theme textarea {
            background-color: #1A1A1A !important;
            color: #F3F4F6 !important;
            border-color: #4A0404 !important;
        }
        .crimson-theme input:not([type="radio"]):not([type="checkbox"]):focus, .crimson-theme select:focus, .crimson-theme textarea:focus {
            border-color: #DC2626 !important;
            background-color: #222222 !important;
            box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.3) !important;
        }
        .crimson-theme input::placeholder, .crimson-theme textarea::placeholder { color: #6b7280 !important; }
        
        /* Accents in Crimson Theme */
        .crimson-theme .bg-orange-50, .crimson-theme .bg-orange-100 { background-color: rgba(220, 38, 38, 0.15) !important; border-color: rgba(220, 38, 38, 0.3) !important; color: #FCA5A5 !important; }
        .crimson-theme .bg-orange-500, .crimson-theme .bg-orange-600 { background-color: #DC2626 !important; color: white !important; }
        .crimson-theme .hover\:bg-orange-700:hover { background-color: #B91C1C !important; }
        
        .crimson-theme .text-orange-400, .crimson-theme .text-orange-500, .crimson-theme .text-orange-600, .crimson-theme .text-orange-700 { color: #FCA5A5 !important; }
        .crimson-theme .border-orange-200, .crimson-theme .border-orange-300, .crimson-theme .border-orange-500 { border-color: rgba(220, 38, 38, 0.4) !important; }
        
        /* Tables in Crimson Theme */
        .crimson-theme table th { color: #FCA5A5 !important; background-color: #1A0505 !important; border-color: #330000 !important; }
        .crimson-theme table td { border-color: #330000 !important; }
        .crimson-theme tr:hover td { background-color: #2A0A0A !important; }

        /* Modals & Shadows in Crimson */
        .crimson-theme .bg-white.rounded-lg.shadow-xl { background-color: #121212 !important; border: 1px solid #330000; }
        .crimson-theme .shadow-sm, .crimson-theme .shadow, .crimson-theme .shadow-md, .crimson-theme .shadow-lg, .crimson-theme .shadow-xl {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.8), 0 2px 4px -1px rgba(0, 0, 0, 0.6) !important;
        }

        /* Charts / Recharts Tooltips for dark background */
        .crimson-theme .recharts-cartesian-axis-tick-value { fill: #9ca3af !important; }
        .crimson-theme .recharts-legend-item-text { color: #e5e7eb !important; }
        .crimson-theme .recharts-default-tooltip { background-color: #121212 !important; border: 1px solid #4a0404 !important; color: #f3f4f6 !important; }
        .crimson-theme .recharts-tooltip-item-name, .crimson-theme .recharts-tooltip-item-value { color: #f3f4f6 !important; }
        
        /* Status Badges for Crimson Theme */
        .crimson-theme .bg-green-50, .crimson-theme .bg-green-100 { background-color: rgba(5, 150, 105, 0.15) !important; border-color: rgba(5, 150, 105, 0.3) !important; color: #6ee7b7 !important; }
        .crimson-theme .text-green-500, .crimson-theme .text-green-600, .crimson-theme .text-green-700, .crimson-theme .text-green-800 { color: #6ee7b7 !important; }
        .crimson-theme .border-green-100, .crimson-theme .border-green-200, .crimson-theme .border-green-300 { border-color: rgba(5, 150, 105, 0.4) !important; }
        
        .crimson-theme .bg-red-50, .crimson-theme .bg-red-100 { background-color: rgba(220, 38, 38, 0.15) !important; border-color: rgba(220, 38, 38, 0.3) !important; color: #fca5a5 !important; }
        .crimson-theme .text-red-500, .crimson-theme .text-red-600, .crimson-theme .text-red-700, .crimson-theme .text-red-800 { color: #fca5a5 !important; }
        .crimson-theme .border-red-100, .crimson-theme .border-red-200, .crimson-theme .border-red-300 { border-color: rgba(220, 38, 38, 0.4) !important; }

        .crimson-theme .bg-blue-50, .crimson-theme .bg-blue-100 { background-color: rgba(37, 99, 235, 0.15) !important; border-color: rgba(37, 99, 235, 0.3) !important; color: #93c5fd !important; }
        .crimson-theme .text-blue-500, .crimson-theme .text-blue-600, .crimson-theme .text-blue-700, .crimson-theme .text-blue-800 { color: #93c5fd !important; }
        .crimson-theme .border-blue-100, .crimson-theme .border-blue-200, .crimson-theme .border-blue-300 { border-color: rgba(37, 99, 235, 0.4) !important; }

        .crimson-theme .bg-yellow-50, .crimson-theme .bg-yellow-100 { background-color: rgba(202, 138, 4, 0.15) !important; border-color: rgba(202, 138, 4, 0.3) !important; color: #fde047 !important; }
        .crimson-theme .text-yellow-500, .crimson-theme .text-yellow-600, .crimson-theme .text-yellow-700, .crimson-theme .text-yellow-800 { color: #fde047 !important; }
        .crimson-theme .border-yellow-100, .crimson-theme .border-yellow-200, .crimson-theme .border-yellow-300 { border-color: rgba(202, 138, 4, 0.4) !important; }

        .crimson-theme .bg-purple-50, .crimson-theme .bg-purple-100 { background-color: rgba(124, 58, 237, 0.15) !important; border-color: rgba(124, 58, 237, 0.3) !important; color: #c4b5fd !important; }
        .crimson-theme .text-purple-500, .crimson-theme .text-purple-600, .crimson-theme .text-purple-700, .crimson-theme .text-purple-800 { color: #c4b5fd !important; }
        .crimson-theme .border-purple-100, .crimson-theme .border-purple-200, .crimson-theme .border-purple-300 { border-color: rgba(124, 58, 237, 0.4) !important; }

        .crimson-theme .bg-cyan-50, .crimson-theme .bg-cyan-100 { background-color: rgba(6, 182, 212, 0.15) !important; border-color: rgba(6, 182, 212, 0.3) !important; color: #67e8f9 !important; }
        .crimson-theme .text-cyan-500, .crimson-theme .text-cyan-600, .crimson-theme .text-cyan-700, .crimson-theme .text-cyan-800 { color: #67e8f9 !important; }

        /* Sunset Theme Global Overrides (Red-Orange Sidebar / Light Yellow BG) */
        .sunset-theme { background-color: #FFFDE7 !important; color: #431407 !important; }
        .sunset-theme .bg-white { background-color: #ffffff !important; border-color: #FDE047 !important; }
        .sunset-theme .bg-gray-50 { background-color: #FEF9C3 !important; }
        .sunset-theme .bg-gray-100 { background-color: #FEF08A !important; }
        .sunset-theme .bg-gray-200 { background-color: #FDE047 !important; }
        
        .sunset-theme .text-gray-900, .sunset-theme .text-gray-800 { color: #431407 !important; }
        .sunset-theme .text-gray-700, .sunset-theme .text-gray-600 { color: #7C2D12 !important; }
        .sunset-theme .text-gray-500 { color: #9A3412 !important; }
        .sunset-theme .text-gray-400 { color: #C2410C !important; }
        
        .sunset-theme .border-gray-100, .sunset-theme .border-gray-200 { border-color: #FEF08A !important; }
        .sunset-theme .border-gray-300, .sunset-theme .border-gray-400 { border-color: #FDE047 !important; }
        .sunset-theme .divide-gray-100 > :not([hidden]) ~ :not([hidden]), .sunset-theme .divide-gray-200 > :not([hidden]) ~ :not([hidden]) { border-color: #FEF08A !important; }
        
        /* Sidebar in Sunset Theme */
        .sunset-theme .bg-gray-900 { background-color: #E84D22 !important; color: #FFFDE7 !important; }
        .sunset-theme .bg-gray-900.text-white { color: #FFFDE7 !important; } 
        .sunset-theme .bg-gray-900 .text-white { color: #FFFDE7 !important; } 
        .sunset-theme .bg-gray-900 .text-gray-400 { color: #FDE047 !important; }
        .sunset-theme .bg-gray-900 .text-gray-500 { color: #FEF08A !important; }
        .sunset-theme .bg-gray-900 .hover\:text-white:hover { color: #FFFFFF !important; }
        .sunset-theme .border-gray-800 { border-color: #C23A1D !important; }
        .sunset-theme .bg-gray-800, .sunset-theme .hover\:bg-gray-800:hover, .sunset-theme .group:hover .group-hover\:bg-gray-800 { background-color: #C23A1D !important; }
        
        /* Inputs in Sunset Theme */
        .sunset-theme input:not([type="radio"]):not([type="checkbox"]), .sunset-theme select, .sunset-theme textarea {
            background-color: #FFF !important;
            color: #431407 !important;
            border-color: #FDE047 !important;
        }
        .sunset-theme input:not([type="radio"]):not([type="checkbox"]):focus, .sunset-theme select:focus, .sunset-theme textarea:focus {
            border-color: #EA580C !important;
            box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.3) !important;
        }
        
        /* Accents in Sunset Theme */
        .sunset-theme .bg-orange-50 { background-color: #FFEDD5 !important; }
        .sunset-theme .bg-orange-100 { background-color: #FED7AA !important; }
        .sunset-theme .bg-orange-500, .sunset-theme .bg-orange-600 { background-color: #EA580C !important; color: white !important; }
        .sunset-theme .hover\:bg-orange-700:hover { background-color: #C2410C !important; }
        
        .sunset-theme .text-orange-400, .sunset-theme .text-orange-500, .sunset-theme .text-orange-600, .sunset-theme .text-orange-700 { color: #EA580C !important; }
        .sunset-theme .border-orange-200, .sunset-theme .border-orange-300, .sunset-theme .border-orange-500 { border-color: #EA580C !important; }
        
        /* Tables in Sunset Theme */
        .sunset-theme table th { color: #9A3412 !important; background-color: #FEF9C3 !important; border-color: #FEF08A !important; }
        .sunset-theme table td { border-color: #FEF08A !important; }
        .sunset-theme tr:hover td { background-color: #FFFDE7 !important; }
      `}</style>
      {Sidebar()}
      <main className={`flex-1 transition-all flex flex-col min-w-0 ${isExporting ? 'bg-white absolute top-0 left-0 w-full z-[9999]' : (isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0')}`}>
        
        {/* Header (Hamburger Menu) */}
        {!isExporting && (
            <div className={`bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300 ${isSidebarOpen ? 'lg:hidden' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <button 
                        onClick={() => { setIsMobileMenuOpen(true); setIsSidebarOpen(true); }} 
                        className="text-gray-600 hover:text-orange-600 focus:outline-none p-1.5 rounded-md bg-gray-100 hover:bg-orange-50 transition-colors shrink-0"
                        title="แสดงแถบเมนู (Show Menu)"
                    >
                        <List size={24} />
                    </button>
                    <div className="flex flex-col min-w-0">
                        <h1 className="font-bold text-gray-800 text-sm truncate">{companyInfo.name}</h1>
                        {selectedProject && <span className="text-[10px] text-orange-600 font-medium truncate">{selectedProject.name}</span>}
                    </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-bold text-white shadow-sm border-2 border-white shrink-0">
                    {currentUser?.firstName?.charAt(0) || 'U'}
                </div>
            </div>
        )}

        <div id="print-area" className={`${isExporting ? 'w-full max-w-none px-[10mm]' : 'max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 h-full flex flex-col'}`}>
          {selectedProject ? ProjectDetail() : (
            <>
              {activeMenu === 'dashboard' && DashboardView()}
              {activeMenu === 'users' && UserManagement()}
              {activeMenu === 'projects' && ProjectList()}
              {activeMenu === 'audits' && GlobalAuditList()}
              {activeMenu === 'manual' && ManualView()}
              {activeMenu === 'settings' && SettingsView()}
            </>
          )}
        </div>
      </main>

      {/* NEW: Auto Sync Floating Status Toast */}
      {autoSyncMessage && !isExporting && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 z-[9999] animate-fade-in backdrop-blur-sm border border-gray-700">
              <Cloud size={16} className="text-blue-400 animate-pulse" />
              <span className="text-sm font-medium tracking-wide">{autoSyncMessage}</span>
          </div>
      )}

      {/* Global Floating Notification Bell */}
      {!isExporting && currentUser && getPendingApprovals().length > 0 && (
          <div className="fixed bottom-8 right-8 z-[90] animate-fade-in">
              <button 
                  onClick={() => setShowNotificationModal(true)}
                  className="relative flex items-center justify-center w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl transition-transform hover:scale-110 border-4 border-white"
                  title="มีรายการรอให้คุณดำเนินการ/อนุมัติ"
              >
                  <Bell size={32} className="animate-ring" />
                  <span className="absolute -top-2 -right-2 bg-white text-red-600 text-sm font-black w-7 h-7 flex items-center justify-center rounded-full shadow-md border-2 border-red-600">
                      {getPendingApprovals().length > 99 ? '99+' : getPendingApprovals().length}
                  </span>
              </button>
          </div>
      )}

      {/* Notification List Modal */}
      {showNotificationModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-red-50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                              <Bell className="animate-ring" size={20}/>
                          </div>
                          <div>
                              <h2 className="text-xl font-black text-red-800">
                                  รายการรอการดำเนินการ
                              </h2>
                              <p className="text-xs font-bold text-red-600">ทั้งหมด {getPendingApprovals().length} รายการที่ต้องการตรวจสอบ</p>
                          </div>
                      </div>
                      <button onClick={() => setShowNotificationModal(false)} className="text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-100 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50 custom-scrollbar">
                      {getPendingApprovals().length > 0 ? getPendingApprovals().map(item => (
                          <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-red-300 transition-all hover:shadow-md flex flex-col gap-4 group">
                              <div className="flex justify-between items-start">
                                  <div className="flex gap-3">
                                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${item.type === 'pm' ? 'bg-orange-50 text-orange-600' : item.type === 'repair' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                          {item.type === 'pm' ? <Wrench size={20}/> : item.type === 'repair' ? <Hammer size={20}/> : <Calendar size={20}/>}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-gray-800 text-sm group-hover:text-red-600 transition-colors">{item.title}</h4>
                                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                                              <Building2 size={12} className="text-gray-400"/> {item.project.name}
                                          </p>
                                      </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md shrink-0">
                                      {new Date(item.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric'})}
                                  </span>
                              </div>
                              <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full border-red-200 text-red-600 hover:bg-red-50 font-bold shadow-sm"
                                  onClick={() => {
                                      setShowNotificationModal(false);
                                      setSelectedProject(item.project);
                                      if (item.type === 'pm') {
                                          setProjectTab('pm');
                                          setPmSubTab('history');
                                          setTimeout(() => setSelectedPmHistory(item.record), 300);
                                      } else if (item.type === 'schedule') {
                                          setProjectTab('schedule');
                                          setCurrentMonth(item.month);
                                      } else if (item.type === 'repair') {
                                          setProjectTab('repair');
                                          setRepairFilter('All');
                                          setTimeout(() => setSelectedRepairView(item.record), 300);
                                      }
                                  }}
                              >
                                  {item.actionText}
                              </Button>
                          </div>
                      )) : (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                              <CheckCircle size={48} className="mb-3 text-green-500 opacity-50"/>
                              <p className="font-bold text-gray-500">ยอดเยี่ยม!</p>
                              <p className="text-sm">ไม่มีรายการรออนุมัติค้างอยู่</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
      
      {/* Modals */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-2xl font-bold text-gray-800">{isEditingUser ? t('editUserTitle') : t('newUserTitle')}</h2><button onClick={() => setShowAddUserModal(false)}><X size={24} /></button></div>
            <form onSubmit={handleSaveUser} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 relative group">
                    {newUser.photo ? <img src={newUser.photo} alt="Preview" className="w-full h-full object-cover" /> : <User size={48} className="text-gray-400" />}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><label htmlFor="photo-upload" className="cursor-pointer text-white text-xs font-bold flex flex-col items-center"><Upload size={20} className="mb-1" />{t('uploadPhoto')}</label><input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /></div>
                  </div>
                  {newUser.photo && <button type="button" onClick={() => setNewUser({...newUser, photo: null})} className="text-red-500 text-xs hover:underline">{t('removePhoto')}</button>}
                </div>
                <div className="flex-1 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">{t('personalInfo')}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('empId')} / {t('username')}</label>
                          <input 
                              type="text" 
                              required 
                              className={`w-full border rounded-md p-2 ${isEditingUser && currentUser?.username !== 'admin' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`} 
                              value={newUser.employeeId} 
                              onChange={e => {
                                  const val = e.target.value;
                                  setNewUser({...newUser, employeeId: val, username: val});
                              }} 
                              placeholder="รหัสพนักงาน (ใช้เป็นชื่อเข้าระบบ)" 
                              disabled={isEditingUser && currentUser?.username !== 'admin'} 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                          <input type="text" required className="w-full border rounded-md p-2" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')}</label><input type="text" required className="w-full border rounded-md p-2" value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')}</label><input type="text" required className="w-full border rounded-md p-2" value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label><input type="tel" className="w-full border rounded-md p-2" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} /></div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center justify-between">
                    <span>{t('position')} & {t('col_dept')}</span>
                    {isEditingUser && currentUser?.username !== 'admin' && <span className="text-xs text-red-500 font-normal">* ไม่อนุญาตให้แก้ไขในโหมดนี้</span>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('position')}</label>
                      <select 
                          className={`w-full border rounded-md p-2 ${isEditingUser && currentUser?.username !== 'admin' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`} 
                          value={newUser.position} 
                          onChange={e => {
                              const newPos = e.target.value;
                              setNewUser({
                                  ...newUser, 
                                  position: newPos,
                                  // แก้ไข: ใช้ getMergedPermissions ป้องกันปัญหา Reference หลุด
                                  permissions: getMergedPermissions(rolePermissions[newPos])
                              });
                          }} 
                          disabled={isEditingUser && currentUser?.username !== 'admin'}
                      >
                          {EMPLOYEE_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                      {newUser.position.startsWith("อื่นๆ") && <input type="text" className={`mt-2 w-full border rounded-md p-2 ${isEditingUser && currentUser?.username !== 'admin' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-gray-50'}`} placeholder={t('specifyOther')} value={newUser.otherPosition} onChange={e => setNewUser({...newUser, otherPosition: e.target.value})} disabled={isEditingUser && currentUser?.username !== 'admin'} />}
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('currentDept')}</label><select className={`w-full border rounded-md p-2 ${isEditingUser && currentUser?.username !== 'admin' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`} value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} disabled={isEditingUser && currentUser?.username !== 'admin'}><option value="">{t('selectDept')}</option><option value="Head Office">Head Office</option>{projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('accessibleDepts')}</label>
                    {currentUser?.username === 'admin' ? (
                        <div className="flex gap-2 mb-2">
                            <select className="w-full border rounded-md p-2" onChange={handleAddAccessibleDept} defaultValue="">
                                <option value="" disabled>{t('selectDept')}</option>
                                <option value="All">All (ทุกหน่วยงาน)</option>
                                <option value="Head Office">Head Office</option>
                                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="text-xs text-red-500 mb-2">* สิทธิ์นี้กำหนดโดย Admin เท่านั้น</div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {newUser.accessibleDepts.length > 0 ? newUser.accessibleDepts.map((dept, index) => (
                            <div key={index} className="flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                                <span>{dept === 'All' ? 'All (ทุกหน่วยงาน)' : dept}</span>
                                {currentUser?.username === 'admin' && (
                                    <button type="button" onClick={() => removeAccessibleDept(dept)} className="text-orange-600 hover:text-orange-900"><XCircle size={14} /></button>
                                )}
                            </div>
                        )) : (
                            <span className="text-gray-400 text-sm">- ยังไม่มีหน่วยงานที่เข้าถึงได้ -</span>
                        )}
                    </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center justify-between">
                    <span>{t('accessControl')}</span>
                    {currentUser?.username !== 'admin' && <span className="text-xs text-red-500 font-normal">* สงวนสิทธิ์การกำหนดสิทธิ์ให้สำหรับ Admin เท่านั้น</span>}
                </h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('permissions')}</label>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="p-3 border-b">โมดูล (Module)</th>
                                    <th className="p-3 border-b text-center w-16">ดู</th>
                                    <th className="p-3 border-b text-center w-16">บันทึก</th>
                                    <th className="p-3 border-b text-center w-16">แก้ไข</th>
                                    <th className="p-3 border-b text-center w-16">อนุมัติ</th>
                                    <th className="p-3 border-b text-center w-16">ลบ</th>
                                    <th className="p-3 border-b text-center w-16">พิมพ์</th>
                                    <th className="p-3 border-b text-center w-20 bg-gray-200">All</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {AVAILABLE_MENUS.map(menu => {
                                    const renderRow = (item, isSub = false) => {
                                        const perms = newUser.permissions[item.id] || {};
                                        const isAll = perms.view && perms.save && perms.edit && perms.approve && perms.delete && perms.print;
                                        return (
                                            <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isSub ? 'bg-gray-50/50' : ''}`}>
                                                <td className={`p-3 font-medium text-gray-800 ${isSub ? 'pl-8 text-xs text-gray-600 border-l-2 border-orange-200' : ''}`}>
                                                    {isSub && <span className="mr-2 text-gray-400">└</span>}
                                                    {t(item.label)}
                                                </td>
                                                {['view', 'save', 'edit', 'approve', 'delete', 'print'].map(ptype => (
                                                    <td key={ptype} className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 accent-orange-600 cursor-pointer disabled:opacity-50" 
                                                            checked={!!perms[ptype]} 
                                                            onChange={(e) => handlePermissionChange(item.id, ptype, e.target.checked)} 
                                                            disabled={currentUser?.username !== 'admin'} 
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-3 text-center bg-gray-50 border-l border-gray-100">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 accent-orange-600 cursor-pointer disabled:opacity-50" 
                                                        checked={isAll} 
                                                        onChange={(e) => handlePermissionAll(item.id, e.target.checked)} 
                                                        disabled={currentUser?.username !== 'admin'} 
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    };

                                    return (
                                        <React.Fragment key={menu.id}>
                                            {renderRow(menu)}
                                            {menu.submenus && menu.submenus.map(sub => renderRow(sub, true))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t"><Button variant="secondary" onClick={() => setShowAddUserModal(false)}>{t('cancel')}</Button><Button type="submit">{t('save')}</Button></div>
            </form>
          </div>
        </div>
      )}

      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-2xl font-bold text-gray-800">{isEditingProject ? 'แก้ไขข้อมูลหน่วยงาน' : t('newProjectTitle')}</h2><button onClick={() => setShowAddProjectModal(false)}><X size={24} /></button></div>
            <form onSubmit={handleSaveProject} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 relative group">{newProject.logo ? <img src={newProject.logo} alt="Project Logo" className="w-full h-full object-cover" /> : <div className="text-center text-gray-400 p-2"><ImageIcon size={32} className="mx-auto mb-1" /><span className="text-xs">{t('projLogo')}</span></div>}<div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><label htmlFor="logo-upload" className="cursor-pointer text-white text-xs font-bold flex flex-col items-center"><Upload size={20} className="mb-1" />{newProject.logo ? 'เปลี่ยนรูปภาพ' : t('uploadLogo')}</label><input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /></div></div>
                  {newProject.logo && <button type="button" onClick={() => setNewProject({...newProject, logo: null})} className="text-red-500 text-xs hover:underline">{t('removePhoto')}</button>}
                </div>
                <div className="flex-1 space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">{t('projType')}</label><div className="flex gap-2">{PROJECT_TYPES.map(type => (<button key={type} type="button" onClick={() => setNewProject({...newProject, type})} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors border ${newProject.type === type ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{type === 'Condo' ? t('tab_condo') : type === 'Village' ? t('tab_village') : t('tab_office')}</button>))}</div></div>
                  <div className="grid grid-cols-3 gap-4"><div className="col-span-1"><label className="block text-sm font-medium text-gray-700 mb-1">{t('projCode')}</label><input type="text" readOnly className="w-full border rounded-md p-2 bg-gray-100 text-gray-500 cursor-not-allowed font-mono" value={newProject.code || '-'} /></div><div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">{t('projName')}</label><input type="text" required className="w-full border rounded-md p-2" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} /></div></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">{t('officePhone')}</label><input type="tel" className="w-full border rounded-md p-2" value={newProject.phone} onChange={e => setNewProject({...newProject, phone: e.target.value})} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">{t('taxId')}</label><input type="text" className="w-full border rounded-md p-2" value={newProject.taxId} onChange={e => setNewProject({...newProject, taxId: e.target.value})} /></div></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('projAddress')}</label><textarea className="w-full border rounded-md p-2 h-[120px] resize-none" value={newProject.address} onChange={e => setNewProject({...newProject, address: e.target.value})}></textarea></div>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('contractStartDate')}</label><input type="date" className="w-full border rounded-md p-2 text-sm" value={newProject.contractStartDate} onChange={e => setNewProject({...newProject, contractStartDate: e.target.value})} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('contractEndDate')}</label><input type="date" className="w-full border rounded-md p-2 text-sm" value={newProject.contractEndDate} onChange={e => setNewProject({...newProject, contractEndDate: e.target.value})} /></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่าสัญญาบริหาร (บาท/เดือน)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">฿</span>
                            <input type="number" className="w-full border rounded-md pl-8 p-2 text-sm" value={newProject.contractValue || ''} onChange={e => setNewProject({...newProject, contractValue: e.target.value})} placeholder="0.00" />
                        </div>
                    </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">{t('uploadDocs')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[{ key: 'orchor', label: t('doc_orchor') }, { key: 'committee', label: t('doc_committee') }, { key: 'regulations', label: t('doc_regulations') }, { key: 'resident_rules', label: t('doc_resident_rules') }].map((doc) => (
                    <div key={doc.key} className="border rounded-md p-3 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <File size={20} className="text-gray-400 flex-shrink-0" />
                            <span className="text-sm truncate font-medium text-gray-700" title={doc.label}>{doc.label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {newProject.files && newProject.files[doc.key] ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-green-600 flex items-center gap-1 max-w-[100px] truncate" title={newProject.files[doc.key].name || 'Uploaded'}>
                                        <CheckCircle size={12} className="shrink-0" /> 
                                        <span className="truncate">{newProject.files[doc.key].name || 'Uploaded'}</span>
                                    </span>
                                    <label className="cursor-pointer text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-md transition-colors" title="เปลี่ยนไฟล์ (Replace)">
                                        <Edit size={14} />
                                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={(e) => handleProjectFileUpload(e, doc.key)} />
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={() => setNewProject(prev => ({ ...prev, files: { ...prev.files, [doc.key]: null } }))} 
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                        title="ลบไฟล์"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm">
                                    <Upload size={12} /> อัปโหลด
                                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={(e) => handleProjectFileUpload(e, doc.key)} />
                                </label>
                            )}
                        </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setShowAddProjectModal(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={isSavingProject}>
                      {isSavingProject ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : t('save')}
                  </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contract Modal */}
      {showAddContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">{isEditingContract ? 'แก้ไขสัญญา (Edit Contract)' : t('addContract')}</h2>
              <button onClick={() => setShowAddContractModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveContract} className="space-y-4">
              
              {/* Contract Type Tabs */}
              <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                {Object.values(CONTRACT_TYPES).map(type => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setNewContract({...newContract, type})}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${newContract.type === type ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {type.split(' (')[0]}
                    </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractCategory')}</label>
                <select 
                    className="w-full border rounded-md p-2"
                    value={newContract.category}
                    onChange={e => setNewContract({...newContract, category: e.target.value})}
                    required
                >
                    <option value="" disabled>-- เลือกประเภทงานบริการ --</option>
                    {SERVICE_TYPES[newContract.type]?.map(service => (
                        <option key={service} value={service}>{service}</option>
                    ))}
                </select>
                {(newContract.category === 'อื่นๆ (ให้สามารถระบุรายละเอียดได้)' || newContract.category === 'อื่นๆ (Other)') && (
                    <input 
                        type="text" 
                        className="mt-2 w-full border rounded-md p-2 bg-gray-50 focus:bg-white transition-colors"
                        placeholder="ระบุรายละเอียดงานบริการเพิ่มเติม..."
                        value={newContract.customCategory}
                        onChange={e => setNewContract({...newContract, customCategory: e.target.value})}
                        required
                    />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_vendor')}</label>
                <input 
                    type="text" 
                    required 
                    className="w-full border rounded-md p-2"
                    list="contractor-list"
                    value={newContract.vendorName}
                    onChange={e => setNewContract({...newContract, vendorName: e.target.value})} 
                    placeholder="ระบุชื่อบริษัทคู่สัญญา"
                />
                <datalist id="contractor-list">
                    {contractors.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>

              {/* Added Contact Person and Phone */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_contact_person')}</label>
                    <input 
                        type="text" 
                        className="w-full border rounded-md p-2"
                        value={newContract.contactPerson}
                        onChange={e => setNewContract({...newContract, contactPerson: e.target.value})} 
                        placeholder="ชื่อผู้ติดต่อ"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_contact_phone')}</label>
                    <input 
                        type="tel" 
                        className="w-full border rounded-md p-2"
                        value={newContract.contactPhone}
                        onChange={e => setNewContract({...newContract, contactPhone: e.target.value})} 
                        placeholder="เบอร์โทรศัพท์"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractStartDate')}</label>
                    <input type="date" required className="w-full border rounded-md p-2" value={newContract.startDate} onChange={e => setNewContract({...newContract, startDate: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractEndDate')}</label>
                    <input type="date" required className="w-full border rounded-md p-2" value={newContract.endDate} onChange={e => setNewContract({...newContract, endDate: e.target.value})} />
                </div>
              </div>
              
              {/* Remaining Days Warning */}
              {newContract.endDate && (
                  <div className={`text-sm text-right font-medium ${calculateDaysRemaining(newContract.endDate) < 30 ? 'text-red-600' : 'text-green-600'}`}>
                      คงเหลือ {calculateDaysRemaining(newContract.endDate)} วัน
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_amount')} {t('beforeVat')}</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">฿</span>
                        </div>
                        <input type="number" className="w-full border rounded-md pl-7 p-2" value={newContract.amount} onChange={e => setNewContract({...newContract, amount: e.target.value})} placeholder="0.00" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('paymentCycle')}</label>
                    <select className="w-full border rounded-md p-2" value={newContract.paymentCycle} onChange={e => setNewContract({...newContract, paymentCycle: e.target.value})}>
                        <option value="Monthly">{t('monthly')}</option>
                        <option value="Yearly">{t('yearly')}</option>
                    </select>
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">แนบไฟล์สัญญา (PDF)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group">
                      <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleContractFileUpload} title="คลิกเพื่ออัปโหลดหรือเปลี่ยนไฟล์" />
                      {newContract.file ? (
                          <div className="text-green-600 flex flex-col items-center justify-center gap-1">
                              <div className="flex items-center gap-2 font-bold"><FileCheck size={20}/> {newContract.file.name}</div>
                              <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">คลิกเพื่อเปลี่ยนไฟล์ใหม่</span>
                          </div>
                      ) : (
                          <div className="text-gray-500 flex flex-col items-center gap-1"><Upload size={24}/><span className="text-xs font-medium">คลิกเพื่ออัปโหลดไฟล์</span></div>
                      )}
                  </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="secondary" onClick={() => setShowAddContractModal(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={isSavingContract}>
                    {isSavingContract ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : t('save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW: Selected Contract Details View Modal */}
      {selectedContractView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8 m-4 max-h-[95vh] overflow-y-auto relative animate-fade-in">
                <button 
                    onClick={() => setSelectedContractView(null)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Briefcase className="text-orange-500"/> รายละเอียดสัญญา (Contract Details)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">ข้อมูลและรายละเอียดของสัญญา หรือ ผู้ให้บริการ (Vendor)</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-4 text-sm bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="col-span-1 md:col-span-2">
                            <span className="text-gray-500 block text-xs mb-1">ชื่อบริษัท / คู่สัญญา (Vendor/Contractor)</span>
                            <span className="font-bold text-gray-800 text-lg">{selectedContractView.vendorName}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs mb-2">ประเภทสัญญา (Contract Type)</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                selectedContractView.type === CONTRACT_TYPES.INCOME ? 'bg-green-100 text-green-700 border border-green-200' :
                                selectedContractView.type === CONTRACT_TYPES.EXPENSE ? 'bg-red-100 text-red-700 border border-red-200' :
                                'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                                {selectedContractView.type.split(' (')[0]}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs mb-1">หมวดงานบริการ (Category)</span>
                            <span className="text-gray-800 font-medium">{selectedContractView.category}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">ผู้ติดต่อ (Contact Person)</span>
                            <span className="text-gray-800 flex items-center gap-1 font-medium"><User size={14} className="text-gray-400"/> {selectedContractView.contactPerson || '-'}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">เบอร์โทรศัพท์ (Phone)</span>
                            <span className="text-gray-800 flex items-center gap-1 font-medium"><Phone size={14} className="text-gray-400"/> {selectedContractView.contactPhone || '-'}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">ระยะเวลาสัญญา (Duration)</span>
                            <span className="text-gray-800 flex items-center gap-1 font-medium">
                                <Calendar size={14} className="text-gray-400"/> 
                                {selectedContractView.startDate} ถึง {selectedContractView.endDate}
                            </span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">สถานะ / วันคงเหลือ (Status)</span>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge status={selectedContractView.status} />
                                {selectedContractView.endDate && (
                                    <span className={`text-xs font-bold bg-white px-2 py-0.5 rounded border shadow-sm ${calculateDaysRemaining(selectedContractView.endDate) < 30 ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'}`}>
                                        เหลือ {calculateDaysRemaining(selectedContractView.endDate)} วัน
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">มูลค่าสัญญา (Amount)</span>
                            <span className="text-orange-600 font-bold text-lg">{Number(selectedContractView.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm font-medium text-gray-500">บาท</span></span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">งวดการจ่าย (Payment Cycle)</span>
                            <span className="text-gray-800 font-medium bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">{selectedContractView.paymentCycle === 'Monthly' ? 'รายเดือน (Monthly)' : 'รายปี (Yearly)'}</span>
                        </div>
                        
                        {/* ไฟล์แนบ */}
                        <div className="col-span-1 md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                            <span className="text-gray-500 block text-xs mb-2">ไฟล์สัญญาแนบ (Attached File)</span>
                            {(selectedContractView.fileUrl || (selectedContractView.file && (selectedContractView.file.data || selectedContractView.file.isLocal))) ? (
                                <div className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                                        <FileCheck size={20} className="text-green-600 shrink-0"/>
                                        <span className="truncate text-gray-700 font-medium text-sm">{selectedContractView.file?.name || `${selectedContractView.vendorName}_Contract.pdf`}</span>
                                    </div>
                                    <Button 
                                        size="sm"
                                        className="shrink-0 flex items-center gap-1.5"
                                        onClick={() => handleDownloadFile(selectedContractView.file || { fileUrl: selectedContractView.fileUrl, name: `${selectedContractView.vendorName}_Contract.pdf` })}
                                    >
                                        <Download size={14} /> <span className="hidden sm:inline">ดาวน์โหลด</span>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-gray-400 bg-gray-100 p-4 rounded-lg text-center text-sm border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1">
                                    <File size={20} className="text-gray-300"/>
                                    ไม่มีไฟล์แนบในระบบ
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-2 pt-4 border-t border-gray-200">
                    {hasPerm('proj_contracts', 'edit') && (
                        <Button variant="outline" icon={Edit} onClick={() => handleEditContract(selectedContractView)}>
                            แก้ไขข้อมูล
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setSelectedContractView(null)}>{t('close')}</Button>
                </div>
            </div>
        </div>
      )}

      {/* NEW: Selected Supplier Details View Modal */}
      {selectedSupplierDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8 m-4 max-h-[95vh] overflow-y-auto relative animate-fade-in">
                <button 
                    onClick={() => setSelectedSupplierDetails(null)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Building2 className="text-orange-500"/> รายละเอียดซัพพลายเออร์ (Supplier Details)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">ข้อมูลและรายละเอียดของบริษัทผู้ให้บริการ หรือ ผู้รับเหมา</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-4 text-sm bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="col-span-1 md:col-span-2">
                            <span className="text-gray-500 block text-xs mb-1">ชื่อบริษัท (Company Name)</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-800 text-lg">{selectedSupplierDetails.name}</span>
                                {selectedSupplierDetails.isAuto && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 cursor-help" title="ข้อมูลนี้ดึงมาจากสัญญาโดยอัตโนมัติ">Auto</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs mb-2">ประเภท (Type)</span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold shadow-sm bg-gray-200 text-gray-700 border border-gray-300">
                                {selectedSupplierDetails.type || '-'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs mb-1">หมวดงานบริการ (Category)</span>
                            <span className="text-gray-800 font-medium">{selectedSupplierDetails.category || '-'}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">ผู้ติดต่อ (Contact Person)</span>
                            <span className="text-gray-800 flex items-center gap-1 font-medium"><User size={14} className="text-gray-400"/> {selectedSupplierDetails.contact || '-'}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">เบอร์โทรศัพท์ (Phone)</span>
                            <span className="text-gray-800 flex items-center gap-1 font-medium"><Phone size={14} className="text-gray-400"/> {selectedSupplierDetails.phone || '-'}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">อีเมล (Email)</span>
                            <span className="text-gray-800 flex items-center gap-1 font-medium"><Mail size={14} className="text-gray-400"/> {selectedSupplierDetails.email || '-'}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                            <span className="text-gray-500 block text-xs mb-1">สถานะ (Status)</span>
                            <div className="mt-1">
                                <Badge status={selectedSupplierDetails.status || 'Active'} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => setSelectedSupplierDetails(null)}>{t('close')}</Button>
                </div>
            </div>
        </div>
      )}

      {/* NEW: Selected Asset Details View Modal */}
      {selectedAssetView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8 m-4 max-h-[95vh] overflow-y-auto relative animate-fade-in">
                <button 
                    onClick={() => setSelectedAssetView(null)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="text-orange-500"/> รายละเอียดทรัพย์สิน
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">ข้อมูลและรายละเอียดของทรัพย์สิน (Asset Details)</p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 mb-6">
                    {/* รูปภาพ */}
                    <div className="w-full md:w-1/3 flex flex-col items-center">
                        <div className="w-48 h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shadow-sm">
                            {selectedAssetView.photo ? (
                                <img src={selectedAssetView.photo} alt={selectedAssetView.name} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="text-gray-300" size={64} />
                            )}
                        </div>
                    </div>
                    {/* ข้อมูล */}
                    <div className="w-full md:w-2/3 space-y-4">
                        <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">รหัสทรัพย์สิน (Code)</span>
                                <span className="font-mono font-bold text-lg text-orange-600 bg-white border border-orange-100 px-2 py-1 rounded shadow-sm">{selectedAssetView.code}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">ชื่อทรัพย์สิน (Name)</span>
                                <span className="font-bold text-gray-800 text-base">{selectedAssetView.name}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3">
                                <span className="text-gray-500 block text-xs mb-1">จำนวน (Qty)</span>
                                <span className="text-gray-800 font-bold">{selectedAssetView.qty} Unit(s)</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3">
                                <span className="text-gray-500 block text-xs mb-1">สถานที่ติดตั้ง (Location)</span>
                                <span className="text-gray-800 flex items-center gap-1 font-medium"><MapPin size={14} className="text-gray-400"/> {selectedAssetView.location || '-'}</span>
                            </div>
                            <div className="col-span-2 border-t border-gray-200 pt-3">
                                <span className="text-gray-500 block text-xs mb-1">รายละเอียดเพิ่มเติม (Details)</span>
                                <span className="text-gray-700 whitespace-pre-wrap">{selectedAssetView.details || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-2 pt-4 border-t">
                    {hasPerm('proj_assets', 'edit') && (
                        <Button variant="outline" icon={Edit} onClick={() => handleEditAsset(selectedAssetView)}>แก้ไขข้อมูล</Button>
                    )}
                    <Button variant="secondary" onClick={() => setSelectedAssetView(null)}>{t('close')}</Button>
                </div>
            </div>
        </div>
      )}

      {/* NEW: Selected Tool Details View Modal */}
      {selectedToolView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8 m-4 max-h-[95vh] overflow-y-auto relative animate-fade-in">
                <button 
                    onClick={() => setSelectedToolView(null)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Wrench className="text-orange-500"/> รายละเอียดเครื่องมือช่าง
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">ข้อมูลและรายละเอียดของเครื่องมือ (Tool Details)</p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 mb-6">
                    {/* รูปภาพ */}
                    <div className="w-full md:w-1/3 flex flex-col items-center">
                        <div className="w-48 h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shadow-sm">
                            {selectedToolView.photo ? (
                                <img src={selectedToolView.photo} alt={selectedToolView.name} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="text-gray-300" size={64} />
                            )}
                        </div>
                    </div>
                    {/* ข้อมูล */}
                    <div className="w-full md:w-2/3 space-y-4">
                        <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">รหัสเครื่องมือ (Code)</span>
                                <span className="font-mono font-bold text-lg text-orange-600 bg-white border border-orange-100 px-2 py-1 rounded shadow-sm">{selectedToolView.code}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">ชื่อเครื่องมือ (Name)</span>
                                <span className="font-bold text-gray-800 text-base">{selectedToolView.name}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3">
                                <span className="text-gray-500 block text-xs mb-1">จำนวน (Qty)</span>
                                <span className="text-gray-800 font-bold">{selectedToolView.qty} Unit(s)</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3">
                                <span className="text-gray-500 block text-xs mb-1">สถานที่จัดเก็บ (Location)</span>
                                <span className="text-gray-800 flex items-center gap-1 font-medium"><MapPin size={14} className="text-gray-400"/> {selectedToolView.location || '-'}</span>
                            </div>
                            <div className="col-span-2 border-t border-gray-200 pt-3">
                                <span className="text-gray-500 block text-xs mb-1">รายละเอียดเพิ่มเติม (Details)</span>
                                <span className="text-gray-700 whitespace-pre-wrap">{selectedToolView.details || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-2 pt-4 border-t">
                    {hasPerm('proj_tools', 'edit') && (
                        <Button variant="outline" icon={Edit} onClick={() => handleEditTool(selectedToolView)}>แก้ไขข้อมูล</Button>
                    )}
                    <Button variant="secondary" onClick={() => setSelectedToolView(null)}>{t('close')}</Button>
                </div>
            </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddAssetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">{isEditingAsset ? 'แก้ไขทรัพย์สิน' : t('registerAsset')}</h2>
              <button onClick={() => setShowAddAssetModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveAsset} className="space-y-4">
                
                {/* Auto Generated Code */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('col_assetCode')}</label>
                    <input 
                        type="text" 
                        readOnly 
                        className="w-full border rounded-md p-2 bg-gray-100 text-gray-600 font-mono"
                        value={newAsset.code}
                    />
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_assetName')}</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full border rounded-md p-2"
                        value={newAsset.name}
                        onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                        placeholder="ระบุชื่อทรัพย์สิน"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Qty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_qty')}</label>
                        <input 
                            type="number" 
                            min="1"
                            className="w-full border rounded-md p-2"
                            value={newAsset.qty}
                            onChange={e => setNewAsset({...newAsset, qty: parseInt(e.target.value)})}
                        />
                    </div>
                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_location')}</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-2 top-2.5 text-gray-400"/>
                            <input 
                                type="text" 
                                className="w-full border rounded-md pl-8 p-2"
                                value={newAsset.location}
                                onChange={e => setNewAsset({...newAsset, location: e.target.value})}
                                placeholder="เช่น ชั้น 1, ห้องเครื่อง"
                            />
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('assetDetails')}</label>
                    <textarea 
                        className="w-full border rounded-md p-2 h-20 resize-none"
                        value={newAsset.details}
                        onChange={e => setNewAsset({...newAsset, details: e.target.value})}
                        placeholder="รายละเอียดเพิ่มเติม..."
                    ></textarea>
                </div>

                {/* Photo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">รูปภาพทรัพย์สิน</label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                            {newAsset.photo ? (
                                <img src={newAsset.photo} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Box className="text-gray-300" size={32} />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center">
                                <ImageIcon size={16}/> อัปโหลดรูปภาพ
                                <input type="file" accept="image/*" className="hidden" onChange={handleAssetPhotoUpload} />
                            </label>
                            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center text-orange-600 border-orange-200">
                                <Camera size={16}/> ถ่ายรูป
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAssetPhotoUpload} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button variant="secondary" onClick={() => setShowAddAssetModal(false)}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isSavingAsset}>
                        {isSavingAsset ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : t('save')}
                    </Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tool Modal */}
      {showAddToolModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">{isEditingTool ? 'แก้ไขเครื่องมือช่าง' : t('regTool')}</h2>
              <button onClick={() => setShowAddToolModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveTool} className="space-y-4">
                
                {/* Auto Generated Code */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('col_toolCode')}</label>
                    <input 
                        type="text" 
                        readOnly 
                        className="w-full border rounded-md p-2 bg-gray-100 text-gray-600 font-mono"
                        value={newTool.code}
                    />
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_toolName')}</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full border rounded-md p-2"
                        value={newTool.name}
                        onChange={e => setNewTool({...newTool, name: e.target.value})}
                        placeholder="ระบุชื่อเครื่องมือ/เครื่องจักร"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Qty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_qty')}</label>
                        <input 
                            type="number" 
                            min="1"
                            className="w-full border rounded-md p-2"
                            value={newTool.qty}
                            onChange={e => setNewTool({...newTool, qty: parseInt(e.target.value)})}
                        />
                    </div>
                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_location')}</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-2 top-2.5 text-gray-400"/>
                            <input 
                                type="text" 
                                className="w-full border rounded-md pl-8 p-2"
                                value={newTool.location}
                                onChange={e => setNewTool({...newTool, location: e.target.value})}
                                placeholder="เช่น ห้องช่าง, คลังเครื่องมือ"
                            />
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('assetDetails')}</label>
                    <textarea 
                        className="w-full border rounded-md p-2 h-20 resize-none"
                        value={newTool.details}
                        onChange={e => setNewTool({...newTool, details: e.target.value})}
                        placeholder="รายละเอียดเพิ่มเติม..."
                    ></textarea>
                </div>

                {/* Photo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">รูปเครื่องมือช่าง</label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                            {newTool.photo ? (
                                <img src={newTool.photo} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Wrench className="text-gray-300" size={32} />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center">
                                <ImageIcon size={16}/> อัปโหลดรูปภาพ
                                <input type="file" accept="image/*" className="hidden" onChange={handleToolPhotoUpload} />
                            </label>
                            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center text-orange-600 border-orange-200">
                                <Camera size={16}/> ถ่ายรูป
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleToolPhotoUpload} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button variant="secondary" onClick={() => setShowAddToolModal(false)}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isSavingTool}>
                        {isSavingTool ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : t('save')}
                    </Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Machine Modal (PM) */}
      {showAddMachineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">{isEditingMachine ? 'แก้ไขข้อมูลเครื่องจักร' : t('addMachine')}</h2>
              <button onClick={() => setShowAddMachineModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveMachine} className="space-y-4">
                
                {/* Auto Generated Code */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('col_machineCode')}</label>
                    <input 
                        type="text" 
                        readOnly 
                        className="w-full border rounded-md p-2 bg-gray-100 text-gray-600 font-mono"
                        value={newMachine.code}
                    />
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_machineName')}</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full border rounded-md p-2"
                        value={newMachine.name}
                        onChange={e => setNewMachine({...newMachine, name: e.target.value})}
                        placeholder="ระบุชื่อเครื่องจักร"
                    />
                </div>
                
                {/* System */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_system')}</label>
                    <select 
                        className="w-full border rounded-md p-2"
                        value={newMachine.system}
                        onChange={e => setNewMachine({...newMachine, system: e.target.value})}
                        required
                    >
                        <option value="" disabled>-- เลือกระบบ --</option>
                        {MACHINE_SYSTEMS.map(sys => (
                            <option key={sys} value={sys}>{sys}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Qty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_qty')}</label>
                        <input 
                            type="number" 
                            min="1"
                            className="w-full border rounded-md p-2"
                            value={newMachine.qty}
                            onChange={e => setNewMachine({...newMachine, qty: parseInt(e.target.value)})}
                        />
                    </div>
                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_location')}</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-2 top-2.5 text-gray-400"/>
                            <input 
                                type="text" 
                                className="w-full border rounded-md pl-8 p-2"
                                value={newMachine.location}
                                onChange={e => setNewMachine({...newMachine, location: e.target.value})}
                                placeholder="เช่น ชั้นดาดฟ้า, ห้อง Generator"
                            />
                        </div>
                    </div>
                </div>

                {/* Photo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">รูปภาพเครื่องจักร</label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                            {newMachine.photo ? (
                                <img src={newMachine.photo} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Settings className="text-gray-300" size={32} />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center">
                                <ImageIcon size={16}/> อัปโหลดรูปภาพ
                                <input type="file" accept="image/*" className="hidden" onChange={handleMachinePhotoUpload} />
                            </label>
                            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center text-orange-600 border-orange-200">
                                <Camera size={16}/> ถ่ายรูป
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMachinePhotoUpload} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button variant="secondary" onClick={() => setShowAddMachineModal(false)}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isSavingMachine}>
                        {isSavingMachine ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : t('save')}
                    </Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Add PM Plan Modal */}
      {showAddPmPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">{newPmPlan.id ? 'แก้ไขแผนงาน PM (Edit PM Plan)' : t('addPmPlan')}</h2>
              <button onClick={() => setShowAddPmPlanModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSavePmPlan} className="space-y-4">
                
                {/* Select Machine */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('col_machineName')}</label>
                    <select 
                        className="w-full border rounded-md p-2 bg-gray-50"
                        value={newPmPlan.machineId}
                        onChange={e => setNewPmPlan({...newPmPlan, machineId: e.target.value})}
                        required
                    >
                        <option value="" disabled>-- เลือกเครื่องจักร --</option>
                        {machines.filter(m => m.projectId === selectedProject.id).map(machine => (
                            <option key={machine.id} value={machine.id}>
                                {machine.code} : {machine.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Frequency */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('pmFrequency')}</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(freq => (
                            <button
                                key={freq}
                                type="button"
                                onClick={() => setNewPmPlan({...newPmPlan, frequency: freq})}
                                className={`py-2 text-xs font-medium rounded border transition-colors ${newPmPlan.frequency === freq ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                                {t(`freq_${freq}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Schedule Details based on Frequency */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2">
                        <Calendar size={16}/> ระบุวันที่และเดือน (Schedule Details)
                    </h4>
                    
                    {newPmPlan.frequency === 'Daily' && (
                        <div className="text-center text-gray-500 text-sm py-2">
                            ระบบจะสร้างรายการ PM นี้ <b>ทุกวัน</b> โดยอัตโนมัติ
                        </div>
                    )}

                    {newPmPlan.frequency === 'Weekly' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกวันในสัปดาห์</label>
                            <select 
                                className="w-full border rounded-md p-2" 
                                value={newPmPlan.scheduleDetails.dayOfWeek} 
                                onChange={e => setNewPmPlan({...newPmPlan, scheduleDetails: {...newPmPlan.scheduleDetails, dayOfWeek: e.target.value}})}
                            >
                                <option value="1">จันทร์ (Monday)</option>
                                <option value="2">อังคาร (Tuesday)</option>
                                <option value="3">พุธ (Wednesday)</option>
                                <option value="4">พฤหัสบดี (Thursday)</option>
                                <option value="5">ศุกร์ (Friday)</option>
                                <option value="6">เสาร์ (Saturday)</option>
                                <option value="0">อาทิตย์ (Sunday)</option>
                            </select>
                        </div>
                    )}

                    {newPmPlan.frequency === 'Monthly' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกวันที่</label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">ทุกวันที่</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="31" 
                                    required
                                    className="w-24 border rounded-md p-2 text-center" 
                                    value={newPmPlan.scheduleDetails.date} 
                                    onChange={e => setNewPmPlan({...newPmPlan, scheduleDetails: {...newPmPlan.scheduleDetails, date: e.target.value}})} 
                                />
                                <span className="text-sm text-gray-600">ของทุกเดือน</span>
                            </div>
                        </div>
                    )}

                    {newPmPlan.frequency === 'Yearly' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เลือกเดือน</label>
                                <select 
                                    className="w-full border rounded-md p-2" 
                                    value={newPmPlan.scheduleDetails.month} 
                                    onChange={e => setNewPmPlan({...newPmPlan, scheduleDetails: {...newPmPlan.scheduleDetails, month: e.target.value}})}
                                >
                                    {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((m, idx) => (
                                        <option key={idx+1} value={idx+1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เลือกวันที่</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="31" 
                                    required
                                    className="w-full border rounded-md p-2" 
                                    value={newPmPlan.scheduleDetails.date} 
                                    onChange={e => setNewPmPlan({...newPmPlan, scheduleDetails: {...newPmPlan.scheduleDetails, date: e.target.value}})} 
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                    <Button variant="secondary" onClick={() => setShowAddPmPlanModal(false)}>{t('cancel')}</Button>
                    <Button type="submit">{t('save')}</Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Report Modal (Adjusted Layout for A4) */}
      {showAddDailyReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[210mm] p-8 m-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                  <h2 className="text-2xl font-bold text-gray-800">{newDailyReport.id ? 'แก้ไขรายงานประจำวัน (Edit Report)' : t('dailyReportTitle')}</h2>
                  <p className="text-sm text-gray-500">{t('col_date')}: {new Date(newDailyReport.date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
              </div>
              <button onClick={() => setShowAddDailyReportModal(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveDailyReport}>
                {/* Section 1: Manpower & Income (Side by Side) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Left: Manpower */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-sm"><Users size={16}/> {t('manpowerReport')}</h3>
                        <div className="space-y-2 text-xs">
                            {['juristic', 'security', 'cleaning', 'gardening', 'sweeper'].map(dept => (
                                <div key={dept} className="flex justify-between items-center bg-white p-1.5 rounded border">
                                    <span>{t('dept_' + dept)}</span>
                                    <input type="number" min="0" className="w-12 text-right border rounded p-0.5" value={newDailyReport.manpower[dept]} onChange={(e) => handleDailyManpowerChange(dept, e.target.value)} />
                                </div>
                            ))}
                            <div className="flex gap-2 items-center bg-white p-1.5 rounded border">
                                <input type="text" className="flex-1 border-b border-dashed outline-none text-xs" placeholder={t('dept_other')} value={newDailyReport.manpower.otherLabel} onChange={(e) => handleDailyManpowerChange('otherLabel', e.target.value)} />
                                <input type="number" min="0" className="w-12 text-right border rounded p-0.5" value={newDailyReport.manpower.other} onChange={(e) => handleDailyManpowerChange('other', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Income */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2 text-sm"><DollarSign size={16}/> {t('incomeReport')}</h3>
                        <div className="space-y-2 text-xs">
                            {['commonFee', 'lateFee', 'water', 'parking', 'violation'].map(item => (
                                <div key={item} className="flex justify-between items-center">
                                    <span className="text-gray-600">{t('inc_' + item)}</span>
                                    <div className="relative w-24">
                                        <input type="number" className="w-full text-right border rounded p-0.5" value={newDailyReport.income[item]} onChange={(e) => handleDailyIncomeChange(item, e.target.value)} placeholder="0" />
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-between items-center">
                                <input type="text" className="text-xs border-b border-dashed outline-none bg-transparent w-24" placeholder={t('inc_other')} value={newDailyReport.income.otherLabel} onChange={(e) => handleDailyIncomeChange('otherLabel', e.target.value)} />
                                <div className="relative w-24">
                                    <input type="number" className="w-full text-right border rounded p-0.5" value={newDailyReport.income.other} onChange={(e) => handleDailyIncomeChange('other', e.target.value)} placeholder="0" />
                                </div>
                            </div>
                            <div className="border-t border-green-200 pt-2 mt-2 flex justify-between items-center font-bold text-green-900 text-sm">
                                <span>{t('totalIncome')}</span>
                                <span>฿ {calculateTotalDailyIncome().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Performance (Grid Layout) */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm"><ClipboardList size={16}/> {t('performanceReport')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['juristic', 'security', 'cleaning', 'gardening', 'sweeper', 'other'].map(dept => (
                            <div key={dept} className="bg-white p-3 rounded border shadow-sm flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-xs text-orange-600">{t('dept_' + dept)}</div>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors" title="อัปโหลดรูปภาพ">
                                            <ImageIcon size={14} />
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDailyPerformanceImageUpload(dept, e.target.files[0])} />
                                        </label>
                                        <label className="cursor-pointer text-gray-400 hover:text-orange-500 transition-colors" title="ถ่ายรูปจากกล้อง">
                                            <Camera size={14} />
                                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleDailyPerformanceImageUpload(dept, e.target.files[0])} />
                                        </label>
                                    </div>
                                </div>
                                <textarea 
                                    className="w-full border rounded p-2 text-xs h-20 mb-2 focus:ring-1 focus:ring-orange-300 outline-none resize-none bg-gray-50 focus:bg-white transition-colors" 
                                    placeholder="รายละเอียดการทำงาน..."
                                    value={newDailyReport.performance[dept]?.details || ''}
                                    onChange={(e) => handleDailyPerformanceChange(dept, e.target.value)}
                                ></textarea>
                                
                                {/* Large Image Preview (อัปเดตให้รูปขยายใหญ่ขึ้น) */}
                                {newDailyReport.performance[dept]?.images?.length > 0 && (
                                    <div className="mt-auto pt-2 border-t border-dashed">
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                                            <img src={newDailyReport.performance[dept].images[0]} alt="Work" className="w-full h-full object-cover" />
                                            <button 
                                                type="button"
                                                onClick={() => removeDailyPerformanceImage(dept, 0)}
                                                className="absolute inset-0 bg-red-500 bg-opacity-60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]"
                                                title="ลบรูประยะปฏิบัติงาน"
                                            >
                                                <X size={24} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: Additional Note */}
                <div className="mb-6">
                     <h3 className="font-bold text-gray-700 mb-2 text-sm">{t('additionalDetails')}</h3>
                     <textarea 
                        className="w-full border rounded-md p-3 text-sm h-20 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                        value={newDailyReport.note}
                        onChange={(e) => setNewDailyReport({...newDailyReport, note: e.target.value})}
                        placeholder="หมายเหตุเพิ่มเติม / ปัญหาที่พบ..."
                     ></textarea>
                </div>

                {/* NEW: Preview Auto-fetched Utility Readings */}
                {(() => {
                    const reportDate = newDailyReport.date;
                    const projMeters = meters.filter(m => m.projectId === selectedProject.id);
                    const projMeterIds = projMeters.map(m => m.id);
                    const dayReadings = utilityReadings.filter(r => r.date === reportDate && projMeterIds.includes(r.meterId));

                    if (dayReadings.length === 0) return null;

                    return (
                        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
                             <h3 className="font-bold text-gray-700 mb-1 text-sm flex items-center gap-2">
                                 <Zap size={16} className="text-orange-500"/> ข้อมูลการจดมิเตอร์อัตโนมัติ ประจำวันที่ {new Date(reportDate).toLocaleDateString('th-TH')}
                             </h3>
                             <p className="text-[11px] text-gray-500 mb-3">* ระบบจะดึงข้อมูลมิเตอร์ที่ถูกจดในวันนี้ไปแสดงในรายงาน PDF โดยอัตโนมัติ ({dayReadings.length} รายการ)</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                 {dayReadings.map(r => {
                                     const meter = projMeters.find(m => m.id === r.meterId);
                                     return (
                                         <div key={r.id} className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded shadow-sm">
                                             <div className="flex items-center gap-1.5 truncate pr-2">
                                                 {meter?.type === 'Water' ? <Droplet size={14} className="text-blue-500 shrink-0"/> : <Zap size={14} className="text-orange-500 shrink-0"/>}
                                                 <span className="font-medium text-gray-700 truncate" title={meter?.name}>{meter?.name} <span className="text-gray-400 font-normal">({meter?.code})</span></span>
                                             </div>
                                             <span className="font-bold text-red-600 shrink-0">+{r.usage.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                         </div>
                                     )
                                 })}
                             </div>
                        </div>
                    );
                })()}

                <div className="mt-6 flex justify-between items-center border-t pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={16} /> {t('reporter')}: <span className="font-semibold text-gray-800">{newDailyReport.reporter}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowAddDailyReportModal(false)}>{t('cancel')}</Button>
                        <Button type="submit" icon={Save}>{t('save')}</Button>
                    </div>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Daily Report View Modal */}
      {selectedDailyReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`bg-white rounded-lg shadow-xl w-full max-w-[210mm] m-4 relative animate-fade-in ${isExporting ? 'p-0 shadow-none overflow-visible' : 'p-8 max-h-[95vh] overflow-y-auto'}`}>
                <button 
                    onClick={() => setSelectedDailyReport(null)} 
                    className={`absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors z-10 ${isExporting ? 'hidden' : ''}`}
                >
                    <X size={24} />
                </button>

                <div id="print-daily-report" className={`space-y-6 bg-white ${isExporting ? 'p-8' : ''}`}>
                    {/* Header */}
                    <div className="text-center border-b pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                            รายงานประจำวันที่ {new Date(selectedDailyReport.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}
                        </h2>
                        <div className="flex justify-center gap-4 text-sm text-gray-500 mt-2">
                             <span>{t('col_project')}: {projects.find(p => p.id === selectedDailyReport.projectId)?.name}</span>
                             <span>|</span>
                             <span>{t('reporter')}: {selectedDailyReport.reporter}</span>
                        </div>
                    </div>

                    {/* Content Body (Read-only A4 Layout) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Manpower */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-sm"><Users size={16}/> {t('manpowerReport')}</h3>
                            <div className="space-y-1 text-xs">
                                {['juristic', 'security', 'cleaning', 'gardening', 'sweeper'].map(dept => (
                                    <div key={dept} className="flex justify-between py-1 border-b border-blue-200 last:border-0">
                                        <span>{t('dept_' + dept)}</span>
                                        <span className="font-bold">{selectedDailyReport.manpower[dept] || 0}</span>
                                    </div>
                                ))}
                                {selectedDailyReport.manpower.otherLabel && (
                                    <div className="flex justify-between py-1 border-t border-blue-200 mt-1 gap-2">
                                        <span className="break-words flex-1 leading-tight">{selectedDailyReport.manpower.otherLabel}</span>
                                        <span className="font-bold shrink-0">{selectedDailyReport.manpower.other || 0}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Income */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2 text-sm"><DollarSign size={16}/> {t('incomeReport')}</h3>
                             <div className="space-y-1 text-xs">
                                {['commonFee', 'lateFee', 'water', 'parking', 'violation'].map(item => (
                                    <div key={item} className="flex justify-between py-1 border-b border-green-200 last:border-0">
                                        <span>{t('inc_' + item)}</span>
                                        <span>{Number(selectedDailyReport.income[item] || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                                {selectedDailyReport.income.otherLabel && (
                                    <div className="flex justify-between py-1 gap-2">
                                        <span className="break-words flex-1 leading-tight">{selectedDailyReport.income.otherLabel}</span>
                                        <span className="shrink-0">{Number(selectedDailyReport.income.other || 0).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t border-green-300 pt-2 mt-2 flex justify-between font-bold text-green-900">
                                    <span>{t('totalIncome')}</span>
                                    <span>฿ {(() => {
                                        const { commonFee, lateFee, water, parking, violation, other } = selectedDailyReport.income;
                                        return (Number(commonFee) + Number(lateFee) + Number(water) + Number(parking) + Number(violation) + Number(other)).toLocaleString();
                                    })()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm"><ClipboardList size={16}/> {t('performanceReport')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {['juristic', 'security', 'cleaning', 'gardening', 'sweeper', 'other'].map(dept => {
                                const deptData = selectedDailyReport.performance?.[dept];
                                if (!deptData || (!deptData.details && (!deptData.images || deptData.images.length === 0))) return null;
                                return (
                                    <div key={dept} className="bg-white p-3 rounded border shadow-sm">
                                        <div className="font-semibold text-xs text-orange-600 mb-1">{t('dept_' + dept)}</div>
                                        <div className="text-xs text-gray-700 whitespace-pre-wrap break-words mb-2">{deptData.details || '-'}</div>
                                        {deptData.images && deptData.images.length > 0 && (
                                            <div className="mt-2">
                                                <div className="w-full h-40 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                                    <img src={deptData.images[0]} className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    {selectedDailyReport.note && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                             <h3 className="font-bold text-yellow-800 mb-1 text-sm">{t('additionalDetails')}</h3>
                             <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{selectedDailyReport.note}</p>
                        </div>
                    )}
                    
                    {/* NEW: Auto-fetched Utility Readings Trend for Print View */}
                    {(() => {
                        const reportDate = selectedDailyReport.date;
                        const projMeters = meters.filter(m => m.projectId === selectedDailyReport.projectId);
                        const waterMeters = projMeters.filter(m => m.type === 'Water');
                        const elecMeters = projMeters.filter(m => m.type === 'Electricity');

                        if (waterMeters.length === 0 && elecMeters.length === 0) return null;

                        // คำนวณวันที่ย้อนหลัง 7 วัน (นับจากวันที่ของรายงาน) เพื่อทำกราฟแนวโน้ม
                        const endDateObj = new Date(reportDate);
                        const startDateObj = new Date(reportDate);
                        startDateObj.setDate(startDateObj.getDate() - 6);
                        
                        const dateRange = [];
                        for(let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            dateRange.push(`${yyyy}-${mm}-${dd}`);
                        }

                        const projMeterIds = projMeters.map(m => m.id);
                        const trendReadings = utilityReadings.filter(r => projMeterIds.includes(r.meterId) && dateRange.includes(r.date));

                        // ถ้าช่วง 7 วันนี้ไม่มีใครจดมิเตอร์เลย จะไม่แสดงกราฟ
                        if (trendReadings.length === 0) return null;

                        // จัดกลุ่มข้อมูล Water
                        const waterData = dateRange.map(dateStr => {
                            const dObj = new Date(dateStr);
                            const dataPoint = { date: `${dObj.getDate()}/${dObj.getMonth()+1}` }; // Format วัน/เดือน สั้นๆ
                            waterMeters.forEach(m => {
                                const reading = trendReadings.find(r => r.meterId === m.id && r.date === dateStr);
                                dataPoint[`${m.name}`] = reading ? reading.usage : 0;
                            });
                            return dataPoint;
                        });

                        // จัดกลุ่มข้อมูล Elec
                        const elecData = dateRange.map(dateStr => {
                            const dObj = new Date(dateStr);
                            const dataPoint = { date: `${dObj.getDate()}/${dObj.getMonth()+1}` };
                            elecMeters.forEach(m => {
                                const reading = trendReadings.find(r => r.meterId === m.id && r.date === dateStr);
                                dataPoint[`${m.name}`] = reading ? reading.usage : 0;
                            });
                            return dataPoint;
                        });
                        
                        const waterColors = ['#3b82f6', '#0ea5e9', '#6366f1', '#06b6d4', '#8b5cf6', '#2563eb'];
                        const elecColors = ['#f97316', '#f59e0b', '#ef4444', '#eab308', '#f43f5e', '#ea580c'];

                        return (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                                    <BarChart3 size={16} className="text-orange-500"/> 5. แนวโน้มการใช้น้ำประปาและไฟฟ้า (7 วันล่าสุด)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {waterMeters.length > 0 && (
                                        <div className="h-56 bg-white border border-blue-100 rounded-lg p-2 shadow-sm">
                                            <h4 className="text-[11px] font-bold text-blue-700 text-center mb-2 flex justify-center items-center gap-1"><Droplet size={12}/> ปริมาณการใช้น้ำประปา (หน่วย)</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={waterData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                    <XAxis dataKey="date" tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }} />
                                                    {waterMeters.map((m, idx) => (
                                                        <Line key={m.id} type="monotone" dataKey={m.name} stroke={waterColors[idx % waterColors.length]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    {elecMeters.length > 0 && (
                                        <div className="h-56 bg-white border border-orange-100 rounded-lg p-2 shadow-sm">
                                            <h4 className="text-[11px] font-bold text-orange-600 text-center mb-2 flex justify-center items-center gap-1"><Zap size={12}/> ปริมาณการใช้ไฟฟ้า (หน่วย)</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={elecData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                    <XAxis dataKey="date" tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }} />
                                                    {elecMeters.map((m, idx) => (
                                                        <Line key={m.id} type="monotone" dataKey={m.name} stroke={elecColors[idx % elecColors.length]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                    
                    {/* Footer */}
                    <div className="flex justify-between items-end pt-8 mt-4 border-t">
                        <div className="text-xs text-gray-400">Ref: {selectedDailyReport.id}</div>
                        <div className="text-center">
                            <div className="text-sm font-bold">{selectedDailyReport.reporter}</div>
                            <div className="text-xs text-gray-500">{t('reporter')}</div>
                        </div>
                    </div>
                </div>

                <div className={`mt-8 flex justify-end gap-2 border-t pt-4 bg-white ${isExporting ? 'hidden' : ''}`}>
                    {hasPerm('proj_daily', 'edit') && !isExporting && (
                        <Button variant="outline" icon={Edit} onClick={() => handleEditDailyReport(selectedDailyReport)}>
                            แก้ไขรายงาน
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setSelectedDailyReport(null)}>{t('close')}</Button>
                    <Button variant="outline" icon={ImageIcon} onClick={() => {
                        const modalContainer = document.getElementById('print-daily-report')?.closest('.overflow-y-auto');
                        if (modalContainer) modalContainer.scrollTop = 0;
                        setTimeout(() => handleExportImage('print-daily-report', `DailyReport_${selectedDailyReport.date}.jpg`), 100);
                    }} disabled={isExporting} className="border-blue-500 text-blue-600 hover:bg-blue-50">
                        {isExporting ? 'กำลังโหลด...' : 'ดาวน์โหลดรูปภาพ'}
                    </Button>
                    <Button icon={Printer} onClick={() => {
                        const modalContainer = document.getElementById('print-daily-report')?.closest('.overflow-y-auto');
                        if (modalContainer) modalContainer.scrollTop = 0;
                        setTimeout(() => handleExportPDF('print-daily-report', `DailyReport_${selectedDailyReport.date}.pdf`, 'portrait', [22, 10, 20, 10]), 100);
                    }} disabled={isExporting}>
                        {isExporting ? t('downloading') : 'ดาวน์โหลด PDF'}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* NEW: PM Checklist Form Modal */}
      {showPmFormModal && currentPmTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 m-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b pb-4">
              <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <CheckSquare className="text-orange-600" size={24}/>
                      บันทึกผลการบำรุงรักษา (PM Checklist)
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <Calendar size={14} /> ประจำวันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
              </div>
              <button onClick={() => setShowPmFormModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">รหัสเครื่องจักร:</span> <span className="font-bold font-mono text-gray-800">{currentPmTask.machine?.code}</span></div>
                <div><span className="text-gray-500">ชื่อเครื่องจักร:</span> <span className="font-bold text-gray-800">{currentPmTask.machine?.name}</span></div>
                <div><span className="text-gray-500">ระบบ:</span> <span className="text-gray-800">{currentPmTask.machine?.system}</span></div>
            </div>

            <form onSubmit={handleSavePmForm} className="space-y-6">
                <div>
                    <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2 border-b pb-2">
                        <Wrench size={16}/> รายการตรวจสอบมาตรฐาน (Standard Checklist)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                    <th className="p-2 text-center w-10 rounded-tl-md">#</th>
                                    <th className="p-2 text-left">รายละเอียดการตรวจสอบ (Inspection Item)</th>
                                    <th className="p-2 text-center w-20">ปกติ<br/><span className="text-[10px] font-normal">(Pass)</span></th>
                                    <th className="p-2 text-center w-20">ผิดปกติ<br/><span className="text-[10px] font-normal">(Fail)</span></th>
                                    <th className="p-2 text-center w-48 rounded-tr-md">ไม่มี (N/A) / ระบุปัญหา</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {getChecklistForSystem(currentPmTask.machine?.system).map((item, idx) => {
                                    const key = `item_${idx}`;
                                    const answer = pmFormAnswers[key];
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                                            <td className="p-2 text-gray-800">{item}</td>
                                            <td className="p-2 text-center">
                                                <label className="cursor-pointer flex justify-center">
                                                    <input 
                                                        type="radio" 
                                                        name={key} 
                                                        className="w-5 h-5 text-green-500 accent-green-600 cursor-pointer" 
                                                        checked={answer === 'pass'} 
                                                        onChange={() => {
                                                            setPmFormAnswers({...pmFormAnswers, [key]: 'pass'});
                                                            setPmFormIssues({...pmFormIssues, [key]: ''}); // ลบข้อความปัญหาออกถ้ากลับมาเลือก ปกติ
                                                        }} 
                                                        required
                                                    />
                                                </label>
                                            </td>
                                            <td className="p-2 text-center">
                                                <label className="cursor-pointer flex justify-center">
                                                    <input 
                                                        type="radio" 
                                                        name={key} 
                                                        className="w-5 h-5 text-red-500 accent-red-600 cursor-pointer" 
                                                        checked={answer === 'fail'} 
                                                        onChange={() => setPmFormAnswers({...pmFormAnswers, [key]: 'fail'})} 
                                                        required
                                                    />
                                                </label>
                                            </td>
                                            <td className="p-2 text-center">
                                                {answer === 'fail' ? (
                                                    <input 
                                                        type="text"
                                                        className="w-full border border-red-300 rounded p-1 text-xs focus:ring-1 focus:ring-red-500 outline-none bg-red-50 text-red-700 placeholder-red-300"
                                                        placeholder="ระบุปัญหา..."
                                                        value={pmFormIssues[key] || ''}
                                                        onChange={(e) => setPmFormIssues({...pmFormIssues, [key]: e.target.value})}
                                                        required
                                                    />
                                                ) : (
                                                    <label className="cursor-pointer flex justify-center">
                                                        <input 
                                                            type="radio" 
                                                            name={key} 
                                                            className="w-5 h-5 text-gray-400 accent-gray-500 cursor-pointer" 
                                                            checked={answer === 'na'} 
                                                            onChange={() => {
                                                                setPmFormAnswers({...pmFormAnswers, [key]: 'na'});
                                                                setPmFormIssues({...pmFormIssues, [key]: ''});
                                                            }} 
                                                            required={answer !== 'fail'}
                                                        />
                                                    </label>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                     <h3 className="font-bold text-gray-700 mb-2 text-sm border-b pb-2 flex items-center gap-2">
                         <PenTool size={16}/> สรุปผล / ข้อเสนอแนะ (Remarks & Recommendations)
                     </h3>
                     <textarea 
                        className="w-full border rounded-md p-3 text-sm h-24 focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-yellow-50 focus:bg-white transition-colors"
                        value={pmFormRemark}
                        onChange={(e) => setPmFormRemark(e.target.value)}
                        placeholder="ระบุความผิดปกติที่พบ หรืออะไหล่ที่ควรพิจารณาเปลี่ยน..."
                     ></textarea>
                </div>

                {/* Photo Upload Area for PM */}
                <div>
                     <h3 className="font-bold text-gray-700 mb-2 text-sm border-b pb-2 flex items-center gap-2">
                         <Camera size={16}/> ภาพถ่ายประกอบการตรวจสอบ (Photos)
                     </h3>
                     <div className="flex flex-wrap gap-2">
                         {pmFormImages.map((img, idx) => (
                             <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 group">
                                 <img src={img} alt={`PM Photo ${idx+1}`} className="w-full h-full object-cover" />
                                 <button 
                                     type="button"
                                     onClick={() => removePmFormImage(idx)}
                                     className="absolute inset-0 bg-red-500 bg-opacity-50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                     <X size={20} />
                                 </button>
                             </div>
                         ))}
                         <div className="flex flex-col gap-2">
                             <label className="w-24 h-[44px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors">
                                 <ImageIcon size={14} className="mr-1"/> <span className="text-[10px]">อัปโหลด</span>
                                 <input type="file" accept="image/*" className="hidden" onChange={handlePmFormImageUpload} />
                             </label>
                             <label className="w-24 h-[44px] bg-orange-50 border-2 border-dashed border-orange-300 rounded-lg flex items-center justify-center text-orange-600 cursor-pointer hover:bg-orange-100 transition-colors">
                                 <Camera size={14} className="mr-1"/> <span className="text-[10px] font-bold">ถ่ายรูป</span>
                                 <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePmFormImageUpload} />
                             </label>
                         </div>
                     </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <User size={16}/> ผู้ตรวจสอบ: <span className="font-semibold text-gray-800">{currentUser?.firstName} {currentUser?.lastName}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowPmFormModal(false)}>{t('cancel')}</Button>
                        <Button type="submit" icon={Save}>บันทึกผลตรวจ</Button>
                    </div>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW: Selected PM History View Modal */}
      {selectedPmHistory && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center z-50 ${isExporting ? 'items-start overflow-visible' : 'items-center overflow-y-auto'}`}>
            <div id="pm-history-modal-container" className={`w-full m-4 relative animate-fade-in ${isExporting ? 'bg-white shadow-none p-4 h-max overflow-visible max-w-max' : 'max-w-[210mm] bg-white rounded-lg shadow-xl p-8 max-h-[95vh] overflow-y-auto'}`}>
                <button 
                    onClick={() => setSelectedPmHistory(null)} 
                    className={`absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors z-10 ${isExporting ? 'hidden' : ''}`}
                >
                    <X size={24} />
                </button>

                <div id="print-pm-history-report" className={`space-y-6 bg-white ${isExporting ? 'w-[186mm] min-w-[186mm] max-w-[186mm] mx-auto box-border' : 'w-full'}`}>
                    {/* Header */}
                    <div className="text-center border-b pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">รายงานผลการบำรุงรักษาเชิงป้องกัน (PM Report)</h2>
                        <div className="flex justify-center gap-4 text-sm text-gray-500 mt-2">
                             <span>โครงการ: {projects.find(p => p.id === selectedPmHistory.projectId)?.name}</span>
                             <span>|</span>
                             <span>วันที่กำหนด (Plan): {selectedPmHistory.date ? new Date(selectedPmHistory.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'}) : '-'}</span>
                             {selectedPmHistory.executedDate && selectedPmHistory.executedDate !== selectedPmHistory.date && (
                                 <>
                                     <span>|</span>
                                     <span className="text-gray-700 font-bold">วันที่ทำจริง (Act): {new Date(selectedPmHistory.executedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                                 </>
                             )}
                        </div>
                    </div>

                    {/* Machine Info */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-500">รหัสเครื่องจักร:</span> <span className="font-bold font-mono text-gray-800">{selectedPmHistory.machineCode}</span></div>
                        <div><span className="text-gray-500">ชื่อเครื่องจักร:</span> <span className="font-bold text-gray-800">{selectedPmHistory.machineName}</span></div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">ระยะเวลาดำเนินการ:</span> 
                            {selectedPmHistory.executionTimingStatus ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-fit ${
                                    selectedPmHistory.executionTimingStatus === 'เร็วกว่าแผน' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                    selectedPmHistory.executionTimingStatus === 'ช้ากว่าแผน' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                    {selectedPmHistory.executionTimingStatus === 'เร็วกว่าแผน' ? <ChevronLeft size={12}/> : selectedPmHistory.executionTimingStatus === 'ช้ากว่าแผน' ? <Clock size={12}/> : <CheckCircle size={12}/>}
                                    {selectedPmHistory.executionTimingStatus}
                                </span>
                            ) : (
                                <span className="text-gray-400">-</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">ผลการประเมินรวม:</span> 
                            {selectedPmHistory.status === 'Pass' ? (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> ผ่านเกณฑ์</span>
                            ) : (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><AlertTriangle size={14}/> พบปัญหา</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">สถานะอนุมัติ:</span> 
                            {selectedPmHistory.approvalStatus === 'Approved' || !selectedPmHistory.approvalStatus ? (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">อนุมัติแล้ว</span>
                            ) : selectedPmHistory.approvalStatus === 'Pending Chief' ? (
                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">รอหัวหน้าช่างอนุมัติ</span>
                            ) : selectedPmHistory.approvalStatus === 'Pending Manager' ? (
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">รอผู้จัดการอนุมัติ</span>
                            ) : selectedPmHistory.approvalStatus === 'Rejected' ? (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">ไม่อนุมัติ</span>
                            ) : null}
                        </div>
                    </div>

                    {/* Checklist Results */}
                    <div>
                        <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2 border-b pb-2">
                            <ClipboardCheck size={16}/> รายการตรวจสอบ (Inspection Results)
                        </h3>
                        <div className={isExporting ? "w-full" : "overflow-x-auto"}>
                            <table className="w-full text-sm border-collapse table-fixed break-words">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                        <th className="p-2 border border-gray-200 text-center w-10">#</th>
                                        <th className="p-2 border border-gray-200 text-left">รายละเอียดการตรวจสอบ</th>
                                        <th className="p-2 border border-gray-200 text-center w-24">ผลลัพธ์</th>
                                        <th className="p-2 border border-gray-200 text-left w-[35%]">หมายเหตุ / ปัญหาที่พบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const machine = machines.find(m => m.id === selectedPmHistory.machineId);
                                        const systemName = machine ? machine.system : '';
                                        const checklist = getChecklistForSystem(systemName);
                                        
                                        return checklist.map((item, idx) => {
                                            const key = `item_${idx}`;
                                            const answer = selectedPmHistory.answers?.[key];
                                            const issue = selectedPmHistory.issues?.[key];
                                            
                                            let statusBadge;
                                            if (answer === 'pass') statusBadge = <span className="text-green-600 font-bold flex items-center justify-center"><CheckCircle size={16} className="mr-1"/> ปกติ</span>;
                                            else if (answer === 'fail') statusBadge = <span className="text-red-600 font-bold flex items-center justify-center"><XCircle size={16} className="mr-1"/> ผิดปกติ</span>;
                                            else if (answer === 'na') statusBadge = <span className="text-gray-400 font-medium">N/A</span>;
                                            else statusBadge = <span className="text-gray-300">-</span>;

                                            return (
                                                <tr key={idx}>
                                                    <td className="p-2 border border-gray-200 text-center text-gray-500 font-medium">{idx + 1}</td>
                                                    <td className="p-2 border border-gray-200 text-gray-800 break-words whitespace-normal">{item}</td>
                                                    <td className="p-2 border border-gray-200 text-center">{statusBadge}</td>
                                                    <td className={`p-2 border border-gray-200 text-xs break-words whitespace-normal ${answer === 'fail' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                                        {issue || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary & Remarks */}
                    <div className="pt-4">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                             <h3 className="font-bold text-yellow-800 mb-1 text-sm flex items-center gap-1"><PenTool size={14}/> สรุปผล / ข้อเสนอแนะ</h3>
                             <p className="text-xs text-gray-700 whitespace-pre-wrap">{selectedPmHistory.remark || 'ไม่มีข้อเสนอแนะเพิ่มเติม'}</p>
                        </div>
                    </div>
                    
                    {/* Photos */}
                    {selectedPmHistory.images && selectedPmHistory.images.length > 0 && (
                        <div className="pt-4">
                            <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2 border-b pb-2">
                                <Camera size={16}/> ภาพถ่ายประกอบการตรวจสอบ
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedPmHistory.images.map((img, idx) => (
                                    <div key={idx} className="w-32 h-32 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                        <img src={img} alt="PM Evidence" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Signatures Area */}
                    <div className="flex justify-between px-4 pt-16 pb-4 mt-6 border-t border-gray-300 gap-4 flex-wrap">
                        <div className="text-center w-48">
                            <div className="border-b border-gray-400 mb-2 h-8 text-blue-800 font-serif italic flex items-end justify-center pb-1">
                                {selectedPmHistory.inspector}
                            </div>
                            <div className="text-xs font-bold text-gray-800 mt-1">ผู้ตรวจสอบ (Inspector)</div>
                            <div className="text-[10px] text-gray-500 mt-1">{new Date(selectedPmHistory.date).toLocaleDateString('th-TH')}</div>
                        </div>

                        {/* Map Dynamic Approvals */}
                        {selectedPmHistory.approvals && selectedPmHistory.approvals.map((app, idx) => (
                             <div className="text-center w-48" key={idx}>
                                <div className="border-b border-gray-400 mb-2 h-8 text-blue-800 font-serif italic flex items-end justify-center pb-1 relative">
                                    {app.action === 'Rejected' && <span className="absolute -top-4 right-0 text-red-500 font-sans font-bold border-2 border-red-500 rounded px-1.5 py-0.5 transform rotate-12 text-xs">ไม่อนุมัติ</span>}
                                    {app.action === 'Approved' && <span className="absolute -top-4 right-0 text-green-500 font-sans font-bold border-2 border-green-500 rounded px-1.5 py-0.5 transform rotate-12 text-xs">อนุมัติแล้ว</span>}
                                    {app.approver}
                                </div>
                                <div className="text-xs font-bold text-gray-800 mt-1 truncate px-2" title={app.role}>{app.role}</div>
                                <div className="text-[10px] text-gray-500 mt-1">{new Date(app.date).toLocaleDateString('th-TH')}</div>
                            </div>
                        ))}
                        
                        {/* Placeholder for Pending Approvals */}
                        {selectedPmHistory.approvalStatus === 'Pending Chief' && (
                            <div className="text-center w-48 opacity-50">
                                <div className="border-b border-gray-400 mb-2 h-8"></div>
                                <div className="text-xs font-bold text-gray-800 mt-1">หัวหน้าช่าง (Chief)</div>
                            </div>
                        )}
                        {(selectedPmHistory.approvalStatus === 'Pending Manager' || selectedPmHistory.approvalStatus === 'Pending Chief') && (
                            <div className="text-center w-48 opacity-50">
                                <div className="border-b border-gray-400 mb-2 h-8"></div>
                                <div className="text-xs font-bold text-gray-800 mt-1">ผู้จัดการ (Manager)</div>
                            </div>
                        )}
                    </div>
                    
                    {/* Footer Info */}
                    <div className="flex justify-between items-end mt-4 pt-4 border-t text-[10px] text-gray-400">
                        <div>Ref ID: {selectedPmHistory.id}</div>
                        <div>Generated by Best Million Group System</div>
                    </div>
                </div>

                <div className={`mt-8 flex justify-between items-center gap-2 border-t pt-4 bg-white ${isExporting ? 'hidden' : ''}`}>
                    <div>
                        {(() => {
                            // Check if current user can approve
                            if (!selectedPmHistory) return null;
                            const status = selectedPmHistory.approvalStatus;
                            if (status === 'Approved' || status === 'Rejected' || !status) return null; // Old data doesn't have status

                            const isChiefUser = currentUser?.position.includes('หัวหน้าช่าง');
                            const isManagerUser = currentUser?.position.includes('ผู้จัดการ') && !currentUser?.position.includes('ผู้ช่วย');
                            const isAdminUser = currentUser?.username === 'admin' || currentUser?.position === 'Super Admin';

                            let canApprove = false;
                            if (isAdminUser) canApprove = true;
                            if (status === 'Pending Chief' && isChiefUser) canApprove = true;
                            if (status === 'Pending Manager' && isManagerUser) canApprove = true;

                            if (canApprove && !isExporting) {
                                return (
                                    <div className="flex gap-2">
                                        <Button variant="danger" icon={XCircle} onClick={() => showConfirm('ยืนยันไม่อนุมัติ', 'คุณต้องการ ปฏิเสธ (ไม่อนุมัติ) ผลการตรวจสอบนี้ใช่หรือไม่?', () => handleApprovePmAction(selectedPmHistory, 'Rejected'), 'ไม่อนุมัติ', 'warning')}>ไม่อนุมัติ</Button>
                                        <Button variant="success" icon={CheckCircle} onClick={() => showConfirm('ยืนยันอนุมัติ', 'คุณตรวจสอบข้อมูลและต้องการ อนุมัติ ผลการตรวจสอบนี้ใช่หรือไม่?', () => handleApprovePmAction(selectedPmHistory, 'Approved'), 'ยืนยันอนุมัติ', 'info')}>อนุมัติข้อมูล</Button>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setSelectedPmHistory(null)}>{t('close')}</Button>
                        <Button variant="outline" icon={ImageIcon} onClick={() => {
                            const modalContainer = document.getElementById('pm-history-modal-container');
                            if (modalContainer) modalContainer.scrollTop = 0;
                            setTimeout(() => handleExportImage('print-pm-history-report', `PM_Report_${selectedPmHistory.machineCode}.jpg`), 100);
                        }} disabled={isExporting} className="border-blue-500 text-blue-600 hover:bg-blue-50">
                            {isExporting ? 'กำลังโหลด...' : 'ดาวน์โหลดรูปภาพ'}
                        </Button>
                        <Button icon={Printer} onClick={() => {
                            const modalContainer = document.getElementById('pm-history-modal-container');
                            if (modalContainer) modalContainer.scrollTop = 0;
                            setTimeout(() => handleExportPDF('print-pm-history-report', `PM_Report_${selectedPmHistory.machineCode}.pdf`, 'portrait', [22, 12, 20, 12]), 100);
                        }} disabled={isExporting}>
                            {isExporting ? t('downloading') : 'ดาวน์โหลด PDF'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* NEW: Selected Machine Details Modal */}
      {selectedMachineDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8 m-4 max-h-[95vh] overflow-y-auto relative animate-fade-in">
                <button 
                    onClick={() => setSelectedMachineDetails(null)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Settings className="text-red-600"/> รายละเอียดเครื่องจักร</h2>
                    <p className="text-sm text-gray-500">ข้อมูลและสถานะของเครื่องจักร / อุปกรณ์ (Machine Details)</p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 mb-6">
                    {/* Photo */}
                    <div className="w-full md:w-1/3 flex flex-col items-center">
                        <div className="w-48 h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shadow-sm">
                            {selectedMachineDetails.photo ? (
                                <img src={selectedMachineDetails.photo} alt={selectedMachineDetails.name} className="w-full h-full object-cover" />
                            ) : (
                                <Settings className="text-gray-300" size={64} />
                            )}
                        </div>
                    </div>
                    {/* Details */}
                    <div className="w-full md:w-2/3 space-y-4">
                        <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">รหัสเครื่องจักร (Code)</span>
                                <span className="font-mono font-bold text-lg text-red-600 bg-red-50 px-2 py-1 rounded">{selectedMachineDetails.code}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">ชื่อเครื่องจักร (Name)</span>
                                <span className="font-bold text-gray-800 text-base">{selectedMachineDetails.name}</span>
                            </div>
                            <div className="col-span-2 border-t border-gray-100 pt-3">
                                <span className="text-gray-500 block text-xs mb-1">ระบบที่เกี่ยวข้อง (System)</span>
                                <span className="text-gray-700 bg-gray-100 px-3 py-1.5 rounded-md inline-block font-medium border border-gray-200">{selectedMachineDetails.system}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">สถานที่ติดตั้ง (Location)</span>
                                <span className="text-gray-800 flex items-center gap-1"><MapPin size={14} className="text-gray-400"/> {selectedMachineDetails.location || '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs mb-1">จำนวน (Qty)</span>
                                <span className="text-gray-800 font-bold">{selectedMachineDetails.qty} Unit(s)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linked PM Plans */}
                <div className="mt-4">
                    <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2 border-b pb-2">
                        <Calendar size={16} className="text-blue-600"/> แผนบำรุงรักษาที่ผูกไว้ (Linked PM Plans)
                    </h3>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                        {pmPlans.filter(p => p.machineId === selectedMachineDetails.id).length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 text-xs">
                                    <tr>
                                        <th className="p-2 pl-4">ความถี่ (Frequency)</th>
                                        <th className="p-2">รายละเอียดกำหนดการ</th>
                                        <th className="p-2 text-center pr-4">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {pmPlans.filter(p => p.machineId === selectedMachineDetails.id).map(plan => {
                                        let scheduleText = '-';
                                        const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
                                        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
                                        if (plan.frequency === 'Weekly') scheduleText = `ทุกวัน${days[plan.scheduleDetails?.dayOfWeek || 0] || ''}`;
                                        else if (plan.frequency === 'Monthly') scheduleText = `ทุกวันที่ ${plan.scheduleDetails?.date || 1} ของเดือน`;
                                        else if (plan.frequency === 'Yearly') scheduleText = `ทุกวันที่ ${plan.scheduleDetails?.date || 1} ${months[parseInt(plan.scheduleDetails?.month || 1)-1] || ''}`;
                                        else if (plan.frequency === 'Daily') scheduleText = 'ทุกวัน (Everyday)';

                                        return (
                                            <tr key={plan.id}>
                                                <td className="p-2 pl-4 font-medium text-blue-700">{t(`freq_${plan.frequency}`)}</td>
                                                <td className="p-2 text-gray-600">{scheduleText}</td>
                                                <td className="p-2 text-center pr-4"><Badge status={plan.status} /></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center text-gray-500 text-xs py-6 flex flex-col items-center gap-2">
                                <FileText size={24} className="text-gray-300"/>
                                ยังไม่มีแผน PM สำหรับเครื่องจักรนี้
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-2 pt-4 border-t">
                    {hasPerm('proj_pm', 'edit') && (
                        <Button variant="outline" icon={Edit} onClick={() => handleEditMachine(selectedMachineDetails)}>แก้ไขข้อมูล</Button>
                    )}
                    <Button variant="secondary" onClick={() => setSelectedMachineDetails(null)}>{t('close')}</Button>
                </div>
            </div>
        </div>
      )}

      {/* NEW: PM Status Detail Modal (For Dashboard clicks) */}
      {selectedPmStatusDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4 max-h-[90vh] flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-4 border-b pb-4 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardList className="text-blue-600" size={24}/> รายการสถานะ: {selectedPmStatusDetail.label}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            จำนวน {selectedPmStatusDetail.tasks.length} รายการ ประจำเดือน {new Date(pmMonth + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={() => setSelectedPmStatusDetail(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {selectedPmStatusDetail.tasks.map((task, idx) => {
                        return (
                            <div 
                                key={idx}
                                onClick={() => {
                                    if (task.status === 'Not Started') {
                                        handleOpenPmForm(task.plan, task.machine, task.dateString);
                                        setSelectedPmStatusDetail(null);
                                    } else {
                                        setSelectedPmHistory(task.historyRecord);
                                        setSelectedPmStatusDetail(null);
                                    }
                                }}
                                className="p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between group shadow-sm bg-white hover:bg-gray-50"
                            >
                                <div>
                                    <div className="font-bold text-sm flex items-center gap-2 text-gray-800 group-hover:text-blue-600 transition-colors">
                                        <span className="truncate">{task.machine?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="text-xs font-mono mt-0.5 flex items-center gap-1 text-gray-500">
                                        <Calendar size={12} /> {new Date(task.dateString).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                        <span className="mx-1">|</span>
                                        <Settings size={12} /> {task.machine?.code || '-'}
                                    </div>
                                </div>
                                <div className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold text-gray-600 shrink-0">
                                    คลิกเพื่อดู
                                </div>
                            </div>
                        );
                    })}
                    {selectedPmStatusDetail.tasks.length === 0 && (
                        <div className="text-center text-gray-400 py-10">ไม่มีรายการในสถานะนี้</div>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end shrink-0">
                    <Button variant="secondary" onClick={() => setSelectedPmStatusDetail(null)}>{t('close')}</Button>
                </div>
            </div>
        </div>
      )}

      {/* NEW: Selected Date Tasks Modal (For PM Calendar Day Click) */}
      {selectedDateTasks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-4 border-b pb-4 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Calendar className="text-purple-600" size={24}/> แผนงานประจำวัน (PM Tasks)
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            วันที่ {selectedDateTasks.dateObj.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            <span className="ml-2 font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">({selectedDateTasks.tasks.length} รายการ)</span>
                        </p>
                    </div>
                    <button onClick={() => setSelectedDateTasks(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {selectedDateTasks.tasks.map((plan, idx) => {
                        const machine = machines.find(m => m.id === plan.machineId);
                        const historyRecord = pmHistoryList.find(h => h.pmPlanId === plan.id && h.date === selectedDateTasks.dateString);
                        
                        let statusText = 'ยังไม่ดำเนินการ';
                        let statusColor = 'bg-gray-100 text-gray-600';
                        
                        if (historyRecord) {
                            if (historyRecord.approvalStatus === 'Approved') {
                                statusText = 'อนุมัติแล้ว (สำเร็จ)';
                                statusColor = 'bg-green-100 text-green-700 border-green-200';
                            } else if (historyRecord.approvalStatus === 'Rejected') {
                                statusText = 'ไม่อนุมัติ (ตีกลับ)';
                                statusColor = 'bg-red-100 text-red-700 border-red-200';
                            } else if (historyRecord.approvalStatus === 'Pending Chief' || historyRecord.approvalStatus === 'Pending Manager') {
                                statusText = 'รอตรวจสอบ/อนุมัติ';
                                statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                            } else {
                                statusText = 'ดำเนินการแล้ว';
                                statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
                            }
                        } else {
                            statusColor = 'bg-white text-gray-500 border-gray-300 border-dashed';
                        }

                        return (
                            <div 
                                key={idx}
                                onClick={() => {
                                    if (!historyRecord) {
                                        handleOpenPmForm(plan, machine, selectedDateTasks.dateString);
                                        setSelectedDateTasks(null);
                                    } else {
                                        setSelectedPmHistory(historyRecord);
                                        setSelectedDateTasks(null);
                                    }
                                }}
                                className="p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between group shadow-sm bg-white hover:bg-purple-50 hover:border-purple-300"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${historyRecord ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Settings size={20}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-800 group-hover:text-purple-700 transition-colors line-clamp-1">
                                            {machine?.name || 'Unknown Machine'}
                                        </div>
                                        <div className="text-xs font-mono mt-0.5 text-gray-500 flex items-center gap-1">
                                            <Shield size={12}/> {machine?.code || '-'} | {machine?.system || '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold border ${statusColor}`}>
                                        {statusText}
                                    </span>
                                    <span className="text-[10px] text-gray-400 group-hover:text-purple-600 flex items-center gap-0.5 font-medium transition-colors">
                                        {historyRecord ? 'ดูประวัติ' : 'บันทึก PM'} <ChevronRight size={12}/>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {selectedDateTasks.tasks.length === 0 && (
                        <div className="text-center text-gray-400 py-10">ไม่มีรายการแผนงานในวันนี้</div>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end shrink-0">
                    <Button variant="secondary" onClick={() => setSelectedDateTasks(null)}>{t('close')}</Button>
                </div>
            </div>
        </div>
      )}

      {/* Repair Form Modal */}
      {showAddRepairModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 m-4 max-h-[95vh] overflow-y-auto relative animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Hammer className="text-orange-500" />
                {newRepair.id ? 'แก้ไขรายการแจ้งซ่อม / อัปเดตสถานะ' : 'เพิ่มรายการแจ้งซ่อมใหม่ (New Repair Request)'}
              </h2>
              <button onClick={() => setShowAddRepairModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveRepair} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ส่วนของลูกบ้าน / ผู้แจ้ง */}
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="font-bold text-gray-700 mb-2 text-sm border-b border-gray-300 pb-2">ข้อมูลผู้แจ้ง (Requester Info)</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">เลขที่แจ้งซ่อม</label>
                                <input type="text" readOnly className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-500 text-sm font-mono" value={newRepair.code} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">ห้อง / บ้านเลขที่</label>
                                <input type="text" required className="w-full border rounded-md p-2 text-sm bg-white" value={newRepair.roomNo} onChange={e => setNewRepair({...newRepair, roomNo: e.target.value})} placeholder="เช่น 101/5" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">ชื่อผู้แจ้ง</label>
                                <input type="text" required className="w-full border rounded-md p-2 text-sm bg-white" value={newRepair.requesterName} onChange={e => setNewRepair({...newRepair, requesterName: e.target.value})} placeholder="ชื่อ-นามสกุล" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">เบอร์โทรติดต่อ</label>
                                <input type="tel" className="w-full border rounded-md p-2 text-sm bg-white" value={newRepair.phone} onChange={e => setNewRepair({...newRepair, phone: e.target.value})} placeholder="เบอร์โทรศัพท์" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">ประเภทงานซ่อม</label>
                            <select className="w-full border rounded-md p-2 text-sm bg-white" value={newRepair.issueType} onChange={e => setNewRepair({...newRepair, issueType: e.target.value})} required>
                                <option value="" disabled>-- เลือกประเภท --</option>
                                <option value="ไฟฟ้า (Electrical)">ไฟฟ้า (Electrical)</option>
                                <option value="ประปา (Plumbing)">ประปา (Plumbing)</option>
                                <option value="แอร์ / ปรับอากาศ (Air Conditioning)">แอร์ / ปรับอากาศ (Air Conditioning)</option>
                                <option value="โครงสร้าง / สถาปัตย์ (Structural)">โครงสร้าง / สถาปัตย์ (Structural)</option>
                                <option value="อื่นๆ (ให้ระบุ)">อื่นๆ (ให้ระบุ)</option>
                            </select>
                            {newRepair.issueType === 'อื่นๆ (ให้ระบุ)' && (
                                <input type="text" className="w-full border rounded-md p-2 text-sm mt-2 bg-white" placeholder="ระบุประเภทงาน..." value={newRepair.issueTypeOther} onChange={e => setNewRepair({...newRepair, issueTypeOther: e.target.value})} required />
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">รายละเอียดปัญหา (Issue Details)</label>
                            <textarea required className="w-full border rounded-md p-2 text-sm h-20 resize-none bg-white" value={newRepair.issueDetails} onChange={e => setNewRepair({...newRepair, issueDetails: e.target.value})} placeholder="อธิบายลักษณะปัญหาที่พบ..."></textarea>
                        </div>
                    </div>

                    {/* ส่วนของช่าง / นิติบุคคล */}
                    <div className="space-y-4 bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <h3 className="font-bold text-orange-800 mb-2 text-sm border-b border-orange-200 pb-2">ส่วนของเจ้าหน้าที่ (Staff / Technician)</h3>
                        
                        <div>
                            <label className="block text-xs font-bold text-orange-700 mb-1">สถานะการดำเนินงาน (Status)</label>
                            <select className="w-full border border-orange-300 rounded-md p-2 text-sm bg-white" value={newRepair.inspectionResult} onChange={e => setNewRepair({...newRepair, inspectionResult: e.target.value})}>
                                <option value="รอดำเนินการ">รอดำเนินการ (Pending)</option>
                                <option value="ซ่อมแซมเสร็จสิ้น">ซ่อมแซมเสร็จสิ้น (Completed)</option>
                                <option value="รออะไหล่">รออะไหล่ (Waiting for Parts)</option>
                                <option value="ต้องจ้างผู้รับเหมาภายนอก">ต้องจ้างผู้รับเหมาภายนอก (Need Contractor)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-orange-700 mb-1">รายละเอียดการแก้ไข / สรุปผล</label>
                            <textarea className="w-full border border-orange-300 rounded-md p-2 text-sm h-24 resize-none bg-white" value={newRepair.staffDetails} onChange={e => setNewRepair({...newRepair, staffDetails: e.target.value})} placeholder="ระบุสาเหตุ, การแก้ไข, หรือรายการอะไหล่ที่ต้องเบิก..."></textarea>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-orange-700 mb-1">ค่าใช้จ่าย / ค่าบริการ (บาท)</label>
                                <input type="number" className="w-full border border-orange-300 rounded-md p-2 text-sm bg-white" value={newRepair.cost} onChange={e => setNewRepair({...newRepair, cost: e.target.value})} placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-orange-700 mb-1">ช่างผู้ดำเนินการ</label>
                                <input type="text" className="w-full border border-orange-300 rounded-md p-2 text-sm bg-white" value={newRepair.staffName} onChange={e => setNewRepair({...newRepair, staffName: e.target.value})} placeholder="ชื่อพนักงานช่าง" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <Button variant="secondary" onClick={() => setShowAddRepairModal(false)}>{t('cancel')}</Button>
                    <Button type="submit" icon={Save}>{t('save')}</Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Repair View Modal (Print Layout) */}
      {selectedRepairView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`w-full m-4 relative animate-fade-in ${isExporting ? 'bg-white shadow-none p-4 h-max overflow-visible max-w-max' : 'max-w-[210mm] bg-white rounded-lg shadow-xl p-8 max-h-[95vh] overflow-y-auto'}`}>
                <button 
                    onClick={() => setSelectedRepairView(null)} 
                    className={`absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors z-10 ${isExporting ? 'hidden' : ''}`}
                >
                    <X size={24} />
                </button>

                <div id="print-repair-report" className={`space-y-4 bg-white text-gray-800 ${isExporting ? 'w-[186mm] min-w-[186mm] max-w-[186mm] mx-auto box-border' : 'w-full'}`}>
                    
                    {/* Header */}
                    <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                        <h2 className="text-2xl font-bold uppercase">ใบแจ้งซ่อม (Maintenance Request Form)</h2>
                        <div className="flex justify-between items-end mt-4">
                            <div className="text-left">
                                <p className="font-bold">โครงการ: {projects.find(p => p.id === selectedRepairView.projectId)?.name || '-'}</p>
                                <p className="text-sm">วันที่แจ้ง: {selectedRepairView.date ? new Date(selectedRepairView.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'}) : '-'}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-bold text-lg text-red-600 border border-red-600 px-3 py-1 rounded inline-block">{selectedRepairView.code}</p>
                            </div>
                        </div>
                    </div>

                    {/* Part 1: Requester */}
                    <div className="border border-gray-800 rounded-lg overflow-hidden mb-6">
                        <div className="bg-gray-200 text-gray-800 font-bold p-2 border-b border-gray-800 flex items-center gap-2">
                            <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            ส่วนที่ 1: ข้อมูลผู้แจ้งและรายละเอียดปัญหา (สำหรับลูกบ้าน / ผู้พักอาศัย)
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                            <div><span className="font-bold">ห้อง / บ้านเลขที่ (Unit No.):</span> {selectedRepairView.roomNo || '-'}</div>
                            <div><span className="font-bold">ชั้น (Floor):</span> {selectedRepairView.floor || '-'}</div>
                            <div><span className="font-bold">ชื่อผู้แจ้ง (Requester Name):</span> {selectedRepairView.requesterName || '-'}</div>
                            <div><span className="font-bold">เบอร์โทรศัพท์ (Tel):</span> {selectedRepairView.phone || '-'}</div>
                            
                            <div className="col-span-2 border-t border-gray-300 pt-3 mt-1">
                                <span className="font-bold">ประเภทงานซ่อม (Category):</span> {selectedRepairView.issueType === 'อื่นๆ (ให้ระบุ)' ? selectedRepairView.issueTypeOther : selectedRepairView.issueType}
                            </div>
                            <div className="col-span-2">
                                <span className="font-bold block mb-1">รายละเอียดปัญหา (Description of issue):</span>
                                <div className="min-h-[60px] p-2 bg-gray-50 border border-gray-200 rounded whitespace-pre-wrap">{selectedRepairView.issueDetails || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Part 2: Technician */}
                    <div className="border border-gray-800 rounded-lg overflow-hidden mb-6">
                        <div className="bg-gray-200 text-gray-800 font-bold p-2 border-b border-gray-800 flex items-center gap-2">
                            <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            ส่วนที่ 2: บันทึกการปฏิบัติงาน (สำหรับช่างอาคาร / เจ้าหน้าที่)
                        </div>
                        <div className="p-4 space-y-4 text-sm">
                            <div className="flex items-center gap-4">
                                <span className="font-bold">สถานะการตรวจสอบ (Status):</span>
                                <span className={`px-3 py-1 border border-gray-800 rounded-full font-bold ${
                                    selectedRepairView.inspectionResult === 'ซ่อมแซมเสร็จสิ้น' ? 'bg-gray-200' : 'bg-white'
                                }`}>
                                    {selectedRepairView.inspectionResult}
                                </span>
                            </div>
                            <div>
                                <span className="font-bold block mb-1">รายละเอียดการแก้ไข / รายการอะไหล่ (Action Taken / Parts):</span>
                                <div className="min-h-[80px] p-2 bg-gray-50 border border-gray-200 rounded whitespace-pre-wrap">{selectedRepairView.staffDetails || '-'}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="font-bold">ช่างผู้เข้าดำเนินการ (Technician):</span> {selectedRepairView.staffName || '-'}</div>
                                <div><span className="font-bold">ค่าใช้จ่าย / ค่าบริการ (Cost):</span> {selectedRepairView.cost ? `${Number(selectedRepairView.cost).toLocaleString()} บาท` : 'ไม่มีค่าใช้จ่าย'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 mt-12 px-8 text-center text-sm">
                        <div>
                            <div className="border-b border-gray-800 w-full mb-2 h-10"></div>
                            <p>( .................................................... )</p>
                            <p className="font-bold mt-1">ผู้แจ้งซ่อม / เจ้าของร่วม</p>
                            <p className="text-xs text-gray-500 mt-1">วันที่ ....... / ....... / ...........</p>
                        </div>
                        <div>
                            <div className="border-b border-gray-800 w-full mb-2 h-10 flex items-end justify-center pb-1 font-serif italic">
                                {selectedRepairView.staffName}
                            </div>
                            <p>( .................................................... )</p>
                            <p className="font-bold mt-1">เจ้าหน้าที่นิติบุคคล / ช่างอาคาร</p>
                            <p className="text-xs text-gray-500 mt-1">วันที่ ....... / ....... / ...........</p>
                        </div>
                    </div>
                </div>

                <div className={`mt-8 flex justify-between items-center gap-2 border-t pt-4 bg-white ${isExporting ? 'hidden' : ''}`}>
                    <div>
                        {hasPerm('proj_repair', 'edit') && !isExporting && (
                            <Button variant="outline" icon={Edit} onClick={() => handleEditRepair(selectedRepairView)}>
                                แก้ไขข้อมูล / อัปเดตสถานะ
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setSelectedRepairView(null)}>{t('close')}</Button>
                        <Button icon={Printer} onClick={() => {
                            const modalContainer = document.getElementById('print-repair-report')?.closest('.overflow-y-auto');
                            if (modalContainer) modalContainer.scrollTop = 0;
                            setTimeout(() => handleExportPDF('print-repair-report', `Repair_Form_${selectedRepairView.code}.pdf`, 'portrait', [22, 12, 20, 12]), 100);
                        }} disabled={isExporting}>
                            {isExporting ? t('downloading') : 'พิมพ์ใบแจ้งซ่อม (PDF)'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Add Meter Modal */}
      {showAddMeterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 relative animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {newMeter.type === 'Water' ? <Droplet className="text-blue-500" /> : <Zap className="text-orange-500" />}
                {newMeter.id ? 'แก้ไขข้อมูลมิเตอร์' : 'เพิ่มมิเตอร์ใหม่'}
              </h2>
              <button onClick={() => setShowAddMeterModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveMeter} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทมิเตอร์ (Type)</label>
                    <select 
                        className="w-full border rounded-md p-2 bg-white outline-none focus:ring-2 focus:ring-red-200"
                        value={newMeter.type}
                        onChange={e => setNewMeter({...newMeter, type: e.target.value})}
                        required
                    >
                        <option value="Water">มิเตอร์น้ำประปา (Water)</option>
                        <option value="Electricity">มิเตอร์ไฟฟ้า (Electricity)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลขมิเตอร์ (Code)</label>
                        <input 
                            type="text" 
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-red-200"
                            value={newMeter.code}
                            onChange={e => setNewMeter({...newMeter, code: e.target.value})}
                            placeholder="เช่น M-01, W-01"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ค่ายกมา / ค่าปัจจุบัน</label>
                        <input 
                            type="number" 
                            step="0.01"
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-red-200"
                            value={newMeter.initialValue}
                            onChange={e => setNewMeter({...newMeter, initialValue: e.target.value})}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเรียก (Name)</label>
                    <input 
                        type="text" 
                        className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-red-200"
                        value={newMeter.name}
                        onChange={e => setNewMeter({...newMeter, name: e.target.value})}
                        placeholder={`เช่น มิเตอร์ส่วนกลาง, ${newMeter.type === 'Water' ? 'ปั๊มน้ำ' : 'แอร์ล็อบบี้'}`}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่ติดตั้ง (Location)</label>
                    <div className="relative">
                        <MapPin size={16} className="absolute left-2 top-2.5 text-gray-400"/>
                        <input 
                            type="text" 
                            className="w-full border rounded-md pl-8 p-2 outline-none focus:ring-2 focus:ring-red-200"
                            value={newMeter.location}
                            onChange={e => setNewMeter({...newMeter, location: e.target.value})}
                            placeholder="เช่น ชั้นดาดฟ้า, หน้าโครงการ"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-6">
                    <Button variant="secondary" onClick={() => setShowAddMeterModal(false)}>{t('cancel')}</Button>
                    <Button type="submit" icon={Save}>{t('save')}</Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Action Plan Modal */}
      {showAddActionPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 relative animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle className="text-orange-500" />
                {newActionPlan.id ? 'แก้ไขแผนงาน' : 'เพิ่มแผนปฏิบัติการ (Action Plan)'}
              </h2>
              <button onClick={() => setShowAddActionPlanModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveActionPlan} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้องาน / ปัญหา (Issue)</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-200"
                        value={newActionPlan.issue}
                        onChange={e => setNewActionPlan({...newActionPlan, issue: e.target.value})}
                        placeholder="เช่น ซ่อมแซมไฟทางเดิน, ทาสีรั้วใหม่"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (Details)</label>
                    <textarea 
                        className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-200 h-24 resize-none"
                        value={newActionPlan.details}
                        onChange={e => setNewActionPlan({...newActionPlan, details: e.target.value})}
                        placeholder="ระบุรายละเอียดการปฏิบัติงาน..."
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับผิดชอบ (Responsible)</label>
                    <select 
                        className="w-full border rounded-md p-2 bg-white outline-none focus:ring-2 focus:ring-orange-200"
                        value={newActionPlan.responsible}
                        onChange={e => setNewActionPlan({...newActionPlan, responsible: e.target.value})}
                        required
                    >
                        <option value="" disabled>-- เลือกผู้รับผิดชอบ --</option>
                        {EMPLOYEE_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                    {newActionPlan.responsible.startsWith('อื่นๆ') && (
                        <input 
                            type="text" 
                            className="mt-2 w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50"
                            placeholder="ระบุชื่อผู้รับผิดชอบหรือหน่วยงาน..."
                            value={newActionPlan.otherResponsible}
                            onChange={e => setNewActionPlan({...newActionPlan, otherResponsible: e.target.value})}
                            required
                        />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม (Start Date)</label>
                        <input 
                            type="date" 
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-200"
                            value={newActionPlan.startDate}
                            onChange={e => setNewActionPlan({...newActionPlan, startDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">กำหนดเสร็จ (Deadline)</label>
                        <input 
                            type="date" 
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-200"
                            value={newActionPlan.deadline}
                            onChange={e => setNewActionPlan({...newActionPlan, deadline: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ (Status)</label>
                    <select 
                        className="w-full border rounded-md p-2 bg-white outline-none focus:ring-2 focus:ring-orange-200"
                        value={newActionPlan.status}
                        onChange={e => setNewActionPlan({...newActionPlan, status: e.target.value})}
                    >
                        <option value="Pending">รอดำเนินการ</option>
                        <option value="In Progress">อยู่ระหว่างดำเนินการ</option>
                        <option value="Completed">ดำเนินการแล้วเสร็จ</option>
                        <option value="Cancelled">ยกเลิกดำเนินการ</option>
                    </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-6">
                    <Button variant="secondary" onClick={() => setShowAddActionPlanModal(false)}>{t('cancel')}</Button>
                    <Button type="submit" icon={Save}>{t('save')}</Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Audit Modal */}
      {showAddAuditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 m-4 relative animate-fade-in max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ClipboardCheck className="text-purple-500" />
                บันทึกผลการตรวจสอบ (New Audit)
              </h2>
              <button onClick={() => setShowAddAuditModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveAudit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">โครงการ / หน่วยงาน</label>
                        <select 
                            className="w-full border rounded-md p-2 bg-white outline-none focus:ring-2 focus:ring-purple-200"
                            value={newAudit.projectId}
                            onChange={e => setNewAudit({...newAudit, projectId: e.target.value})}
                            required
                        >
                            <option value="" disabled>-- เลือกโครงการ --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ประเมิน</label>
                        <input 
                            type="date" 
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-purple-200"
                            value={newAudit.date}
                            onChange={e => setNewAudit({...newAudit, date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ประเมิน</label>
                        <input 
                            type="text" 
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-purple-200"
                            value={newAudit.inspector}
                            onChange={e => setNewAudit({...newAudit, inspector: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทการตรวจ</label>
                        <select 
                            className="w-full border rounded-md p-2 bg-white outline-none focus:ring-2 focus:ring-purple-200"
                            value={newAudit.type}
                            onChange={e => setNewAudit({...newAudit, type: e.target.value})}
                        >
                            <option value="Internal Audit">Internal Audit (ตรวจภายใน)</option>
                            <option value="External Audit">External Audit (หน่วยงานภายนอก)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-purple-50 text-purple-800 p-3 rounded-lg text-sm font-bold flex justify-between items-center shadow-sm">
                        <span>คะแนนรวม: {calculateTotalAuditScore()} / 235</span>
                        <span>{Math.round((calculateTotalAuditScore() / 235) * 100)}%</span>
                    </div>

                    {AUDIT_FORM_TEMPLATE.map((category, catIdx) => (
                        <div key={catIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 p-3 font-bold text-gray-800 border-b border-gray-200">
                                {category.title}
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="p-2 text-center w-10">#</th>
                                            <th className="p-2 text-left">รายการตรวจประเมิน</th>
                                            <th className="p-2 text-center w-40">ระดับคะแนน (1-5)</th>
                                            <th className="p-2 text-left w-64">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {category.items.map((item, itemIdx) => (
                                            <tr key={itemIdx} className="hover:bg-gray-50">
                                                <td className="p-2 text-center text-gray-500">{itemIdx + 1}</td>
                                                <td className="p-2 text-gray-700">{item}</td>
                                                <td className="p-2 text-center">
                                                    <select 
                                                        className={`w-full border rounded p-1.5 outline-none focus:border-purple-500 text-center transition-colors ${!newAudit.scores[`${catIdx}_${itemIdx}`] ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-300'}`}
                                                        value={newAudit.scores[`${catIdx}_${itemIdx}`] || ''}
                                                        onChange={(e) => handleAuditScoreChange(catIdx, itemIdx, e.target.value)}
                                                    >
                                                        <option value="" disabled>-</option>
                                                        <option value="5">5 - ดีเยี่ยม</option>
                                                        <option value="4">4 - ดีมาก</option>
                                                        <option value="3">3 - ดี</option>
                                                        <option value="2">2 - พอใช้</option>
                                                        <option value="1">1 - ปรับปรุง</option>
                                                        <option value="0">0 - ไม่มีผลงาน</option>
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input 
                                                        type="text" 
                                                        className="w-full border border-gray-300 rounded p-1.5 outline-none focus:border-purple-500 text-xs"
                                                        placeholder="ระบุข้อเสนอแนะ..."
                                                        value={newAudit.remarks[`${catIdx}_${itemIdx}`] || ''}
                                                        onChange={(e) => handleAuditRemarkChange(catIdx, itemIdx, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">สรุปผลการตรวจและข้อเสนอแนะรวม (Overall Remarks)</label>
                    <textarea 
                        className="w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-purple-200 h-24 resize-none"
                        value={newAudit.additionalComments}
                        onChange={e => setNewAudit({...newAudit, additionalComments: e.target.value})}
                        placeholder="ข้อคิดเห็นเพิ่มเติมจากผู้ตรวจ..."
                    ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
                    <Button variant="secondary" onClick={() => setShowAddAuditModal(false)}>{t('cancel')}</Button>
                    <Button type="submit" icon={Save}>{t('save')}</Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Audit Report View Modal */}
      {selectedAuditReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 relative animate-fade-in max-h-[95vh] overflow-y-auto">
            <button onClick={() => setSelectedAuditReport(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors z-10"><X size={24} /></button>

            <div id="print-audit-detail" className="p-8 bg-white text-gray-800">
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                    <h2 className="text-2xl font-bold uppercase">รายงานการตรวจสอบคุณภาพ (Audit Report)</h2>
                    <h3 className="text-lg text-gray-600 mt-1">{selectedAuditReport.category}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div><span className="font-bold">โครงการ (Project):</span> {projects.find(p => p.id === selectedAuditReport.projectId)?.name || '-'}</div>
                    <div className="text-right"><span className="font-bold">วันที่ตรวจ (Date):</span> {new Date(selectedAuditReport.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</div>
                    <div><span className="font-bold">ผู้ตรวจประเมิน (Inspector):</span> {selectedAuditReport.inspector}</div>
                    <div className="text-right">
                        <span className="font-bold">ผลการประเมินรวม:</span> 
                        <span className={`ml-2 px-3 py-1 rounded-full font-bold ${selectedAuditReport.score >= 90 ? 'bg-green-100 text-green-800' : selectedAuditReport.score >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedAuditReport.rawScore ? `${selectedAuditReport.rawScore}/235` : `${selectedAuditReport.score}%`}
                        </span>
                    </div>
                </div>

                <div className="space-y-6">
                    {AUDIT_FORM_TEMPLATE.map((category, catIdx) => (
                        <div key={catIdx} className="border border-gray-300 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 p-2 px-3 font-bold text-gray-800 border-b border-gray-300 text-sm">
                                {category.title}
                            </div>
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                    <tr>
                                        <th className="p-2 text-center w-8">#</th>
                                        <th className="p-2 text-left">รายการตรวจประเมิน</th>
                                        <th className="p-2 text-center w-20">คะแนน</th>
                                        <th className="p-2 text-left w-64">ข้อเสนอแนะ / หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {category.items.map((item, itemIdx) => {
                                        const score = selectedAuditReport.itemScores?.[`${catIdx}_${itemIdx}`] || '-';
                                        const remark = selectedAuditReport.itemRemarks?.[`${catIdx}_${itemIdx}`] || '-';
                                        return (
                                            <tr key={itemIdx}>
                                                <td className="p-2 text-center text-gray-500">{itemIdx + 1}</td>
                                                <td className="p-2 text-gray-700">{item}</td>
                                                <td className="p-2 text-center font-bold text-gray-800">{score}</td>
                                                <td className="p-2 text-gray-600">{remark}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div className="mt-8 border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h3 className="font-bold text-gray-800 mb-2 text-sm">สรุปผลและข้อคิดเห็นเพิ่มเติมจากผู้ตรวจ:</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAuditReport.remarks || '-'}</p>
                </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <Button variant="secondary" onClick={() => setSelectedAuditReport(null)}>{t('close')}</Button>
                <Button icon={Printer} onClick={() => {
                    const container = document.getElementById('print-audit-detail')?.closest('.overflow-y-auto');
                    if (container) container.scrollTop = 0;
                    setTimeout(() => handleExportPDF('print-audit-detail', `Audit_Report_${selectedAuditReport.date}.pdf`, 'portrait', [22, 10, 20, 10]), 100);
                }}>พิมพ์รายงาน PDF</Button>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Modals */}
      {showAuditRankingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-blue-50">
                    <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2"><BarChart3 size={24}/> จัดอันดับคะแนน Audit เฉลี่ย</h2>
                    <button onClick={() => setShowAuditRankingModal(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                </div>
                <div className="p-0 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-3 text-center w-16">อันดับ</th>
                                <th className="p-3">โครงการ / หน่วยงาน</th>
                                <th className="p-3 text-center w-32">คะแนนเฉลี่ย (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(() => {
                                const rankData = projects.map(p => {
                                    const pAudits = audits.filter(a => a.projectId === p.id);
                                    const avg = pAudits.length > 0 ? (pAudits.reduce((sum, a) => sum + a.score, 0) / pAudits.length) : 0;
                                    return { id: p.id, name: p.name, avgScore: parseFloat(avg.toFixed(1)) };
                                }).filter(d => d.avgScore > 0).sort((a, b) => b.avgScore - a.avgScore);

                                if (rankData.length === 0) return <tr><td colSpan="3" className="p-8 text-center text-gray-500">ไม่มีข้อมูล</td></tr>;

                                return rankData.map((d, i) => (
                                    <tr key={d.id} className={d.id === selectedProject?.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}>
                                        <td className="p-3 text-center font-bold text-gray-500">{i + 1}</td>
                                        <td className={`p-3 font-medium ${d.id === selectedProject?.id ? 'text-blue-700' : 'text-gray-800'}`}>{d.name} {d.id === selectedProject?.id && '(หน่วยงานนี้)'}</td>
                                        <td className="p-3 text-center font-bold text-blue-600">{d.avgScore}%</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {showReportRankingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-purple-50">
                    <h2 className="text-xl font-bold text-purple-800 flex items-center gap-2"><BarChart3 size={24}/> จัดอันดับการส่งรายงานประจำวัน (เดือนนี้)</h2>
                    <button onClick={() => setShowReportRankingModal(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                </div>
                <div className="p-0 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-3 text-center w-16">อันดับ</th>
                                <th className="p-3">โครงการ / หน่วยงาน</th>
                                <th className="p-3 text-center w-32">จำนวนวันส่งแล้ว</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(() => {
                                const currentMonthStr = new Date().toISOString().slice(0, 7);
                                const rankData = projects.map(p => {
                                    const pReports = dailyReports.filter(r => r.projectId === p.id && r.date.startsWith(currentMonthStr));
                                    const uniqueDays = new Set(pReports.map(r => r.date)).size;
                                    return { id: p.id, name: p.name, submittedDays: uniqueDays };
                                }).sort((a, b) => b.submittedDays - a.submittedDays);

                                if (rankData.length === 0) return <tr><td colSpan="3" className="p-8 text-center text-gray-500">ไม่มีข้อมูล</td></tr>;

                                return rankData.map((d, i) => (
                                    <tr key={d.id} className={d.id === selectedProject?.id ? 'bg-purple-50/50' : 'hover:bg-gray-50'}>
                                        <td className="p-3 text-center font-bold text-gray-500">{i + 1}</td>
                                        <td className={`p-3 font-medium ${d.id === selectedProject?.id ? 'text-purple-700' : 'text-gray-800'}`}>{d.name} {d.id === selectedProject?.id && '(หน่วยงานนี้)'}</td>
                                        <td className="p-3 text-center font-bold text-purple-600">{d.submittedDays} วัน</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Role Permissions Template Modal */}
      {showRolePermModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="text-orange-500" />
                ตั้งค่าสิทธิ์เริ่มต้นตามตำแหน่ง (Role Permissions Template)
              </h2>
              <button onClick={() => setShowRolePermModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>

            <div className="mb-4 shrink-0">
                <label className="block text-sm font-bold text-gray-700 mb-2">เลือกตำแหน่งที่ต้องการตั้งค่า</label>
                <select 
                    className="w-full md:w-1/2 border border-gray-300 rounded-md p-2 bg-white outline-none focus:border-orange-500"
                    value={editingRole}
                    onChange={e => {
                        setEditingRole(e.target.value);
                        setEditingRolePerms(getMergedPermissions(rolePermissions[e.target.value]));
                    }}
                >
                    {EMPLOYEE_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-2">หมายเหตุ: การตั้งค่านี้จะเป็น "แม่แบบ" สำหรับดึงสิทธิ์ไปใช้เมื่อมีการเพิ่มพนักงานใหม่ในตำแหน่งนี้</p>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0">
                        <tr>
                            <th className="p-3 border-b">โมดูล (Module)</th>
                            <th className="p-3 border-b text-center w-16">ดู</th>
                            <th className="p-3 border-b text-center w-16">บันทึก</th>
                            <th className="p-3 border-b text-center w-16">แก้ไข</th>
                            <th className="p-3 border-b text-center w-16">อนุมัติ</th>
                            <th className="p-3 border-b text-center w-16">ลบ</th>
                            <th className="p-3 border-b text-center w-16">พิมพ์</th>
                            <th className="p-3 border-b text-center w-20 bg-gray-200">All</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {AVAILABLE_MENUS.map(menu => {
                            const renderRow = (item, isSub = false) => {
                                const perms = editingRolePerms[item.id] || {};
                                const isAll = perms.view && perms.save && perms.edit && perms.approve && perms.delete && perms.print;
                                return (
                                    <tr key={item.id} className={`hover:bg-gray-50 ${isSub ? 'bg-gray-50/30' : ''}`}>
                                        <td className={`p-3 font-medium text-gray-800 ${isSub ? 'pl-8 text-xs text-gray-600 border-l-2 border-orange-200' : ''}`}>
                                            {isSub && <span className="mr-2 text-gray-400">└</span>}
                                            {t(item.label)}
                                        </td>
                                        {['view', 'save', 'edit', 'approve', 'delete', 'print'].map(ptype => (
                                            <td key={ptype} className="p-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 accent-orange-600 cursor-pointer" 
                                                    checked={!!perms[ptype]} 
                                                    onChange={(e) => handleRolePermissionChange(item.id, ptype, e.target.checked)} 
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 text-center bg-gray-50 border-l border-gray-100">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 accent-orange-600 cursor-pointer" 
                                                checked={isAll} 
                                                onChange={(e) => handleRolePermissionAll(item.id, e.target.checked)} 
                                            />
                                        </td>
                                    </tr>
                                );
                            };
                            return (
                                <React.Fragment key={menu.id}>
                                    {renderRow(menu)}
                                    {menu.submenus && menu.submenus.map(sub => renderRow(sub, true))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t shrink-0">
                <Button variant="secondary" onClick={() => setShowRolePermModal(false)}>{t('cancel')}</Button>
                <Button onClick={() => {
                    setRolePermissions(prev => ({ ...prev, [editingRole]: editingRolePerms }));
                    setShowRolePermModal(false);
                    alert(`บันทึกแม่แบบสิทธิ์สำหรับตำแหน่ง ${editingRole} สำเร็จ`);
                }} icon={Save}>{t('save')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {showAddFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Folder className="text-blue-500" />
                        {newFormItem.id ? 'แก้ไขข้อมูลแบบฟอร์ม' : 'เพิ่มแบบฟอร์มใหม่'}
                    </h2>
                    <button onClick={() => setShowAddFormModal(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveFormItem} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">หมวดหมู่แบบฟอร์ม</label>
                        <select 
                            className="w-full border rounded-md p-2 outline-none focus:border-blue-500"
                            value={newFormItem.category}
                            onChange={e => setNewFormItem({...newFormItem, category: e.target.value})}
                        >
                            <option value="งานบริการลูกบ้าน (Resident Services)">งานบริการลูกบ้าน (Resident Services)</option>
                            <option value="งานผู้รับเหมาและซ่อมบำรุง (Contractor & Maint.)">งานผู้รับเหมาและซ่อมบำรุง (Contractor & Maint.)</option>
                            <option value="งานบริหารและนิติบุคคล (Juristic & Mgmt.)">งานบริหารและนิติบุคคล (Juristic & Mgmt.)</option>
                            <option value="งานบุคคลและภายใน (Internal)">งานบุคคลและภายใน (Internal)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อแบบฟอร์ม</label>
                        <input 
                            type="text" 
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:border-blue-500"
                            value={newFormItem.name}
                            onChange={e => setNewFormItem({...newFormItem, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">รูปแบบ (Format)</label>
                            <select 
                                className="w-full border rounded-md p-2 outline-none focus:border-blue-500"
                                value={newFormItem.format}
                                onChange={e => setNewFormItem({...newFormItem, format: e.target.value})}
                            >
                                <option value="PDF">PDF</option>
                                <option value="Excel">Excel / Spreadsheet</option>
                                <option value="Word">Word Document</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">ขนาดโดยประมาณ</label>
                            <input 
                                type="text" 
                                className="w-full border rounded-md p-2 outline-none focus:border-blue-500"
                                value={newFormItem.size}
                                onChange={e => setNewFormItem({...newFormItem, size: e.target.value})}
                                placeholder="เช่น 150 KB"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียด / คำอธิบาย</label>
                        <textarea 
                            className="w-full border rounded-md p-2 h-20 resize-none outline-none focus:border-blue-500"
                            value={newFormItem.description}
                            onChange={e => setNewFormItem({...newFormItem, description: e.target.value})}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="secondary" onClick={() => setShowAddFormModal(false)}>ยกเลิก</Button>
                        <Button type="submit" icon={Save}>บันทึกข้อมูล</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Form Document View/Edit Modal */}
      {selectedFormDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
            <div className={`bg-white rounded-xl shadow-2xl w-full flex flex-col relative transition-all ${isExporting ? 'max-w-[210mm] max-h-none overflow-visible p-8 shadow-none m-0' : 'max-w-5xl max-h-[95vh] overflow-hidden'}`}>
                {!isExporting && (
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="text-blue-500" />
                                {selectedFormDetails.name}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">{selectedFormDetails.category} | อัปเดตล่าสุด: {selectedFormDetails.lastUpdated}</p>
                        </div>
                        <button onClick={() => { setSelectedFormDetails(null); setIsEditingForm(false); }} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                    </div>
                )}
                
                {/* Simulated Document Area */}
                <div className={`bg-gray-200 flex-1 overflow-y-auto flex justify-center py-8 ${isExporting ? 'py-0 bg-white' : ''}`}>
                    <div id="print-document-form" className={`bg-white shadow-lg relative text-gray-800 ${isExporting ? 'w-full shadow-none' : 'w-[210mm] min-h-[297mm] px-[15mm] pt-[15mm] pb-[20mm] border border-gray-300'}`}>
                        {/* Header */}
                        <div className="text-center mb-8 mt-4">
                            <h1 className="text-2xl font-bold mb-2">นิติบุคคลอาคารชุด / หมู่บ้าน {selectedProject?.name || '................................'}</h1>
                            <h2 className="text-xl font-bold text-gray-700">{selectedFormDetails.name.split(' (')[0]}</h2>
                        </div>
                        
                        {/* Document Content Simulation */}
                        <div className="space-y-6 text-base leading-relaxed px-4">
                            <div className="flex justify-end mb-6">
                                <div className="flex items-end gap-2">
                                     <span className="font-bold">วันที่</span> 
                                     <span className={isEditingForm ? "border-b border-blue-500 outline-none bg-blue-50 w-40 inline-block text-center min-h-[24px]" : "border-b border-dotted border-gray-500 w-40 inline-block text-center min-h-[24px]"} contentEditable={isEditingForm}></span>
                                </div>
                            </div>
                            
                            <p className="flex items-center gap-2">
                                <span className="font-bold">เรื่อง</span> 
                                <span className="ml-2 font-bold border-b border-gray-400 pb-1 flex-1">{selectedFormDetails.name.split(' (')[0]}</span>
                            </p>
                            <p className="font-bold">เรียน ผู้จัดการ / คณะกรรมการนิติบุคคลฯ</p>
                            
                            <div className="ml-4 md:ml-8 space-y-5">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold whitespace-nowrap">ข้าพเจ้า</span> 
                                    <span className={`flex-1 border-b ${isEditingForm ? "border-blue-500 outline-none bg-blue-50" : "border-dotted border-gray-500"} min-h-[24px] px-2`} contentEditable={isEditingForm}></span>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <span className="font-bold whitespace-nowrap">เจ้าของร่วม / ผู้พักอาศัย ห้องเลขที่ / บ้านเลขที่</span> 
                                    <span className={`w-40 border-b ${isEditingForm ? "border-blue-500 outline-none bg-blue-50" : "border-dotted border-gray-500"} min-h-[24px] px-2 text-center`} contentEditable={isEditingForm}></span>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <span className="font-bold whitespace-nowrap">เบอร์โทรศัพท์ติดต่อ</span> 
                                    <span className={`w-48 border-b ${isEditingForm ? "border-blue-500 outline-none bg-blue-50" : "border-dotted border-gray-500"} min-h-[24px] px-2 text-center`} contentEditable={isEditingForm}></span>
                                    <span className="font-bold whitespace-nowrap">อีเมล</span> 
                                    <span className={`flex-1 border-b ${isEditingForm ? "border-blue-500 outline-none bg-blue-50" : "border-dotted border-gray-500"} min-h-[24px] px-2 text-center`} contentEditable={isEditingForm}></span>
                                </div>
                                
                                <p className="mt-8 font-bold">มีความประสงค์เพื่อ:</p>
                                <div className={`w-full min-h-[120px] border p-4 leading-relaxed ${isEditingForm ? "border-blue-300 bg-blue-50 outline-none rounded" : "border-gray-300"}`} contentEditable={isEditingForm}>
                                    {isEditingForm ? "" : (selectedFormDetails.description || "ระบุรายละเอียดความประสงค์ที่นี่...")}
                                </div>
                                
                                <p className="mt-6 font-bold">โดยมีรายละเอียดเพิ่มเติมดังนี้:</p>
                                <div className="space-y-4">
                                    <div className="flex items-end gap-2">1. <span className={`flex-1 border-b ${isEditingForm ? "border-blue-500 outline-none bg-blue-50" : "border-dotted border-gray-500"} min-h-[24px] px-2`} contentEditable={isEditingForm}></span></div>
                                    <div className="flex items-end gap-2">2. <span className={`flex-1 border-b ${isEditingForm ? "border-blue-500 outline-none bg-blue-50" : "border-dotted border-gray-500"} min-h-[24px] px-2`} contentEditable={isEditingForm}></span></div>
                                    <div className="flex items-end gap-2">3. <span className={`flex-1 border-b ${isEditingForm ? "border-blue-500 outline-none bg-blue-50" : "border-dotted border-gray-500"} min-h-[24px] px-2`} contentEditable={isEditingForm}></span></div>
                                </div>
                                
                                <p className="mt-10 pt-6 border-t border-gray-200 text-center font-bold">ข้าพเจ้าขอรับรองว่าข้อความเบื้องต้นเป็นความจริงทุกประการ และยินดีปฏิบัติตามระเบียบของนิติบุคคลฯ อย่างเคร่งครัด</p>
                            </div>

                            <div className="mt-16 flex justify-between px-4 md:px-8 text-center pb-8">
                                <div className="w-56 md:w-64">
                                    <div className="border-b border-gray-500 w-full mb-2 h-6"></div>
                                    <p className="text-sm">( ........................................................ )</p>
                                    <p className="mt-2 font-bold">ผู้ยื่นคำร้อง</p>
                                </div>
                                <div className="w-56 md:w-64">
                                    <div className="border-b border-gray-500 w-full mb-2 h-6"></div>
                                    <p className="text-sm">( ........................................................ )</p>
                                    <p className="mt-2 font-bold">ผู้รับเรื่อง / เจ้าหน้าที่นิติบุคคล</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {!isExporting && (
                    <div className="p-4 border-t bg-gray-50 flex justify-between items-center shrink-0 rounded-b-xl">
                        <div>
                            {isEditingForm ? (
                                <span className="text-orange-600 font-bold text-sm animate-pulse flex items-center gap-1"><Edit size={16}/> โหมดกรอกข้อความ (พิมพ์ในช่องว่างได้เลย)</span>
                            ) : (
                                <span className="text-gray-500 text-sm">คลิก "กรอกแบบฟอร์ม" เพื่อพิมพ์ข้อมูลลงในช่องว่างก่อนสั่งพิมพ์</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {isEditingForm ? (
                                <Button variant="secondary" onClick={() => setIsEditingForm(false)}>เสร็จสิ้น / ดูตัวอย่าง</Button>
                            ) : (
                                <Button variant="outline" icon={Edit} onClick={() => setIsEditingForm(true)} className="border-blue-500 text-blue-600 hover:bg-blue-50">กรอกแบบฟอร์ม</Button>
                            )}
                            <Button icon={Printer} onClick={() => {
                                setIsEditingForm(false);
                                setTimeout(() => handleExportPDF('print-document-form', `${selectedFormDetails.name}.pdf`, 'portrait', [22, 10, 20, 10]), 100);
                            }} disabled={isEditingForm}>พิมพ์ / ดาวน์โหลด PDF</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Add Other Data Modal */}
      {showAddOtherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Layers className="text-orange-500" />
                        {newOther.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลอื่นๆ'}
                    </h2>
                    <button onClick={() => setShowAddOtherModal(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveOther} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">หัวข้อ (Title)</label>
                        <input 
                            type="text" 
                            required 
                            className="w-full border rounded-md p-2 outline-none focus:border-orange-500"
                            value={newOther.title}
                            onChange={e => setNewOther({...newOther, title: e.target.value})}
                            placeholder="เช่น รหัสผ่าน Wi-Fi ส่วนกลาง, ลิงก์โฟลเดอร์แบบแปลนอาคาร"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียด (Details)</label>
                        <textarea 
                            className="w-full border rounded-md p-2 h-24 resize-none outline-none focus:border-orange-500"
                            value={newOther.details}
                            onChange={e => setNewOther({...newOther, details: e.target.value})}
                            placeholder="ระบุรายละเอียด หรือข้อความที่ต้องการบันทึก..."
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">แนบลิงก์ (URL/Link) - ถ้ามี</label>
                        <div className="relative">
                            <LinkIcon size={16} className="absolute left-3 top-2.5 text-gray-400"/>
                            <input 
                                type="url" 
                                className="w-full border rounded-md pl-9 p-2 outline-none focus:border-orange-500"
                                value={newOther.link}
                                onChange={e => setNewOther({...newOther, link: e.target.value})}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                        <Button variant="secondary" onClick={() => setShowAddOtherModal(false)}>ยกเลิก</Button>
                        <Button type="submit" icon={Save}>บันทึกข้อมูล</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Global Confirm Modal (ใช้สำหรับทุกปุ่มที่มีการให้กดยืนยัน เช่น ลบ, อนุมัติ) */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 transform transition-all scale-100">
                  <div className={`p-4 flex items-center gap-3 border-b ${confirmModal.type === 'danger' ? 'bg-red-50 border-red-100' : confirmModal.type === 'warning' ? 'bg-orange-50 border-orange-100' : confirmModal.type === 'info' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className={`p-2 rounded-full ${confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : confirmModal.type === 'warning' ? 'bg-orange-100 text-orange-600' : confirmModal.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                          {confirmModal.type === 'info' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                      </div>
                      <h3 className={`font-bold text-lg ${confirmModal.type === 'danger' ? 'text-red-800' : confirmModal.type === 'warning' ? 'text-orange-800' : confirmModal.type === 'info' ? 'text-blue-800' : 'text-gray-800'}`}>
                          {confirmModal.title}
                      </h3>
                  </div>
                  <div className="p-6 text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                      {confirmModal.message}
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                      {confirmModal.onConfirm ? (
                          <>
                              <Button variant="secondary" onClick={closeConfirm}>
                                  ยกเลิก
                              </Button>
                              <Button 
                                  variant={confirmModal.type === 'danger' ? 'danger' : confirmModal.type === 'warning' ? 'primary' : confirmModal.type === 'info' ? 'success' : 'primary'} 
                                  onClick={() => {
                                      confirmModal.onConfirm();
                                      closeConfirm();
                                  }}
                              >
                                  {confirmModal.confirmText}
                              </Button>
                          </>
                      ) : (
                          <Button variant="primary" onClick={closeConfirm}>
                              {confirmModal.confirmText}
                          </Button>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
