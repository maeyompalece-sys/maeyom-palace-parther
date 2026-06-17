// ============================================================
// 🏪 Partner System — Google Apps Script
// เพิ่มไฟล์นี้เข้าไปใน Apps Script project ของ Maeyom Palace
// ============================================================
//
// วิธีใช้:
//   1. เปิด Apps Script project ที่มีอยู่
//   2. กด + ข้าง Files → Script
//   3. ตั้งชื่อว่า "PartnerSystem"
//   4. วาง code นี้ลงไป
//   5. เพิ่ม doPostRouter() calls ใน Code.gs (ดูด้านล่าง)
//   6. Deploy ใหม่ (New deployment)
//
// เพิ่มใน Code.gs ที่ function doPost() router:
//   case 'partnerLogin':          return partnerLogin(data);
//   case 'getPartnerOrders':      return getPartnerOrders(data);
//   case 'updatePartnerOrderStatus': return updatePartnerOrderStatus(data);
//   case 'addPartner':            return addPartner(data);   // admin only
//   case 'getPartners':           return getPartners(data);  // admin only
// ============================================================

// ============================================================
// 🔧 Sheet Names
// เพิ่ม 2 Sheet ใหม่ใน Google Sheet:
//   - "Partners"  : ข้อมูลร้านพาร์ทเนอร์
//   - "PartnerOrders" : ออเดอร์ที่เป็นของพาร์ทเนอร์
// ============================================================

const PARTNER_SHEET   = 'Partners';
const PORDER_SHEET    = 'PartnerOrders';

// ============================================================
// 🔐 Partner Login
// ============================================================
function partnerLogin(data) {
  const { partnerId, password } = data;
  if (!partnerId || !password) throw new Error('กรุณากรอกข้อมูลให้ครบ');

  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName(PARTNER_SHEET);

  if (!sheet) throw new Error('ไม่พบ Sheet "Partners" — กรุณาสร้าง Sheet ก่อน');

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    const row = {};
    headers.forEach((h, idx) => { row[h] = rows[i][idx]; });
    if (String(row.partnerId || '').toUpperCase() === partnerId.toUpperCase()) {
      if (!row.isActive) throw new Error('บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      if (String(row.password) !== String(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
      const token = Utilities.base64Encode(partnerId + ':' + Date.now() + ':maeyom');
      return {
        partnerId:   String(row.partnerId),
        partnerName: String(row.partnerName || ''),
        logoUrl:     String(row.logoUrl || ''),
        token,
      };
    }
  }
  throw new Error('ไม่พบรหัสร้านค้านี้ในระบบ');
}

// ============================================================
// 📦 Get Partner Orders
// ดึงออเดอร์ที่มี partnerId ตรงกัน
// ============================================================
function getPartnerOrders(data) {
  const { partnerId, token } = data;
  if (!partnerId) throw new Error('ไม่ระบุ partnerId');
  // token validation แบบ basic (production ควรทำ JWT หรือ session จริง)
  // ตรงนี้ trust partnerId เพราะ login แล้ว

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PORDER_SHEET);
  if (!sheet) return { orders: [] };

  const rows    = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { orders: [] };

  // Headers: [id, order_number, partnerId, customer_name, customer_phone,
  //           table_number, order_type, items_json, notes, status,
  //           total_amount, created_at, updated_at]
  const orders = [];
  for (let i = 1; i < rows.length; i++) {
    const [id, order_number, pid, customer_name, customer_phone,
           table_number, order_type, items_json, notes, status,
           total_amount, created_at, updated_at] = rows[i];

    if (String(pid).toUpperCase() !== String(partnerId).toUpperCase()) continue;

    let items = [];
    try { items = JSON.parse(items_json || '[]'); } catch(e) {}

    orders.push({
      id: String(id),
      order_number: String(order_number),
      partnerId: String(pid),
      customer_name: String(customer_name || ''),
      customer_phone: String(customer_phone || ''),
      table_number: table_number || null,
      order_type: String(order_type || 'dine_in'),
      items,
      notes: String(notes || ''),
      status: String(status || 'pending'),
      total_amount: parseFloat(total_amount || 0),
      created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString(),
      updated_at: updated_at ? new Date(updated_at).toISOString() : new Date().toISOString(),
    });
  }

  // เรียงใหม่ก่อน (pending ก่อน, แล้วเรียงตามเวลา)
  orders.sort((a, b) => {
    const priority = { pending: 0, accepted: 1, cooking: 2, ready: 3, completed: 4, cancelled: 5 };
    const pa = priority[a.status] ?? 99;
    const pb = priority[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return { orders };
}

// ============================================================
// 🔄 Update Partner Order Status
// ============================================================
function updatePartnerOrderStatus(data) {
  const { partnerId, orderId, status } = data;
  if (!partnerId || !orderId || !status) throw new Error('ข้อมูลไม่ครบ');

  const validStatuses = ['pending','accepted','cooking','ready','completed','cancelled'];
  if (!validStatuses.includes(status)) throw new Error('สถานะไม่ถูกต้อง');

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PORDER_SHEET);
  if (!sheet) throw new Error('ไม่พบ Sheet PartnerOrders');

  const rows = sheet.getDataRange().getValues();
  // col index: id=0, partnerId=2, status=9, updated_at=12
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(orderId)) {
      // ตรวจว่าเป็นออเดอร์ของร้านนี้
      if (String(rows[i][2]).toUpperCase() !== String(partnerId).toUpperCase()) {
        throw new Error('ไม่มีสิทธิ์แก้ไขออเดอร์นี้');
      }
      sheet.getRange(i + 1, 10).setValue(status);           // status col (J)
      sheet.getRange(i + 1, 13).setValue(new Date());       // updated_at col (M)
      return { orderId, status };
    }
  }
  throw new Error('ไม่พบออเดอร์ id: ' + orderId);
}

// ============================================================
// 👤 Add Partner (Admin only)
// เรียกจากหน้า admin เพื่อเพิ่มร้านพาร์ทเนอร์ใหม่
// ============================================================
function addPartner(data) {
  const { partnerId, partnerName, password } = data;
  if (!partnerId || !partnerName || !password) throw new Error('ข้อมูลไม่ครบ');

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(PARTNER_SHEET);

  // สร้าง sheet ถ้ายังไม่มี
  if (!sheet) {
    sheet = ss.insertSheet(PARTNER_SHEET);
    sheet.appendRow(['partnerId', 'partnerName', 'password', 'isActive', 'createdAt']);
  }

  // ตรวจว่ามีแล้วหรือเปล่า
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === partnerId.toUpperCase()) {
      throw new Error('รหัสร้านค้า ' + partnerId + ' มีอยู่แล้วในระบบ');
    }
  }

  sheet.appendRow([partnerId.toUpperCase(), partnerName, password, true, new Date()]);
  return { partnerId: partnerId.toUpperCase(), partnerName };
}

// ============================================================
// 📋 Get Partners (Admin only)
// ============================================================
function getPartners(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PARTNER_SHEET);
  if (!sheet) return { partners: [] };

  const rows = sheet.getDataRange().getValues();
  const partners = [];
  for (let i = 1; i < rows.length; i++) {
    const [id, name, , isActive, createdAt] = rows[i];
    if (!id) continue;
    partners.push({
      partnerId: String(id),
      partnerName: String(name || ''),
      isActive: !!isActive,
      createdAt: createdAt ? new Date(createdAt).toISOString() : '',
    });
  }
  return { partners };
}

// ============================================================
// 📝 Create Partner Order
// เรียกจาก customer.js ตอนที่ลูกค้าสั่งเมนูของพาร์ทเนอร์
// เพิ่มใน createOrder() ถ้า items มี partnerId
// ============================================================
function createPartnerOrder(orderData) {
  // orderData: { partnerId, customer_name, customer_phone, table_number,
  //              order_type, items, notes, total_amount }
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(PORDER_SHEET);

  // สร้าง sheet ถ้ายังไม่มี
  if (!sheet) {
    sheet = ss.insertSheet(PORDER_SHEET);
    sheet.appendRow([
      'id', 'order_number', 'partnerId', 'customer_name', 'customer_phone',
      'table_number', 'order_type', 'items_json', 'notes', 'status',
      'total_amount', 'created_at', 'updated_at'
    ]);
  }

  const id           = 'PO' + Date.now();
  const orderNumber  = 'P' + new Date().toISOString().slice(2,10).replace(/-/g,'') +
                       String(sheet.getLastRow()).padStart(3, '0');
  const now          = new Date();

  sheet.appendRow([
    id,
    orderNumber,
    String(orderData.partnerId || '').toUpperCase(),
    orderData.customer_name  || '',
    orderData.customer_phone || '',
    orderData.table_number   || '',
    orderData.order_type     || 'dine_in',
    JSON.stringify(orderData.items || []),
    orderData.notes          || '',
    'pending',
    parseFloat(orderData.total_amount || 0),
    now,
    now,
  ]);

  return {
    id,
    order_number: orderNumber,
    partnerId: orderData.partnerId,
    status: 'pending',
    created_at: now.toISOString(),
  };
}

// ============================================================
// 🔧 Setup Helper
// รัน setupPartnerSheets() ครั้งแรกเพื่อสร้าง Sheet ให้พร้อม
// ============================================================
function setupPartnerSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Partners sheet
  if (!ss.getSheetByName(PARTNER_SHEET)) {
    const s = ss.insertSheet(PARTNER_SHEET);
    s.appendRow(['partnerId', 'partnerName', 'password', 'isActive', 'createdAt']);
    // ตัวอย่างข้อมูล
    s.appendRow(['SHOP001', 'ร้านส้มตำป้าแดง', '1234', true, new Date()]);
    s.appendRow(['SHOP002', 'ร้านข้าวมันไก่นายดำ', '1234', true, new Date()]);
    Logger.log('✅ สร้าง Partners sheet แล้ว');
  }

  // PartnerOrders sheet
  if (!ss.getSheetByName(PORDER_SHEET)) {
    const s = ss.insertSheet(PORDER_SHEET);
    s.appendRow([
      'id', 'order_number', 'partnerId', 'customer_name', 'customer_phone',
      'table_number', 'order_type', 'items_json', 'notes', 'status',
      'total_amount', 'created_at', 'updated_at'
    ]);
    Logger.log('✅ สร้าง PartnerOrders sheet แล้ว');
  }

  Logger.log('🎉 Setup เสร็จแล้ว! พร้อมใช้งาน');
  return 'Setup complete';
}
