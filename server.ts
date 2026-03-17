import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "users_data.json");

// --- Persistence Logic ---
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      // Ensure all users have a notifications array
      if (data.users) {
        data.users.forEach((u: any) => {
          if (!u.notifications) u.notifications = [];
        });
      }
      return data;
    } catch (e) {
      return { users: [], resetRequests: [] };
    }
  }
  return { 
    users: [
      { 
        phone: "0123456789", 
        password: "123", 
        name: "مدير النظام", 
        regNo: "000", 
        status: "approved", 
        role: "admin",
        notifications: []
      }
    ], 
    resetRequests: [] 
  };
}

function saveData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Auth API ---

  // Signup
  app.post("/api/auth/signup", (req, res) => {
    const { name, phone, password, regNo } = req.body;
    
    if (db.users.find((u: any) => u.phone === phone)) {
      return res.status(400).json({ error: "خطأ: رقم الهاتف هذا مسجل مسبقاً" });
    }

    const newUser = {
      name,
      phone,
      password,
      regNo: regNo || "غير متوفر",
      status: "pending",
      role: "user",
      notifications: []
    };

    db.users.push(newUser);
    saveData(db);
    res.json({ message: "تم إنشاء حساب جديد و سوف تتم الموافقة على الحساب في اقرب وقت من قبل نقابة المحامين للفيوم" });
  });

  // Login
  app.post("/api/auth/login", (req, res) => {
    const { phone, password } = req.body;
    const user = db.users.find((u: any) => u.phone === phone && u.password === password);

    if (!user) {
      return res.status(401).json({ error: "خطأ: رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مرة أخرى." });
    }

    if (user.status === "pending") {
      return res.status(403).json({ error: "حسابك قيد المراجعة حالياً. سوف تتم الموافقة على الحساب في اقرب وقت من قبل نقابة المحامين للفيوم." });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "هذا الحساب محظور قم بالتواصل مع ادارة الحاسب الالي بنقابة المحامين بالفيوم" });
    }

    res.json({ user });
  });

  // Forgot Password
  app.post("/api/auth/forgot-password", (req, res) => {
    const { phone } = req.body;
    const user = db.users.find((u: any) => u.phone === phone);

    if (!user) {
      return res.status(404).json({ error: "خطأ: رقم الهاتف غير مسجل لدينا" });
    }

    db.resetRequests.push({
      phone,
      name: user.name,
      timestamp: new Date().toISOString(),
      status: "pending"
    });
    saveData(db);

    res.json({ message: "تم إرسال طلب استعادة كلمة المرور. سيقوم المسؤول بالتواصل معك قريباً." });
  });

  // --- User API ---

  // Get notifications
  app.get("/api/user/notifications", (req, res) => {
    const { phone } = req.query;
    const user = db.users.find((u: any) => u.phone === phone);
    if (user) {
      res.json({ notifications: user.notifications || [] });
    } else {
      res.status(404).json({ error: "المستخدم غير موجود" });
    }
  });

  // Clear notifications
  app.post("/api/user/notifications/clear", (req, res) => {
    const { phone } = req.body;
    const user = db.users.find((u: any) => u.phone === phone);
    if (user) {
      user.notifications = [];
      saveData(db);
      res.json({ message: "تم مسح الإشعارات" });
    } else {
      res.status(404).json({ error: "المستخدم غير موجود" });
    }
  });

  // --- Admin API ---

  // Get all data for admin
  app.get("/api/admin/data", (req, res) => {
    res.json({
      users: db.users.filter((u: any) => u.role !== 'admin'),
      resetRequests: db.resetRequests
    });
  });

  // Approve User
  app.post("/api/admin/approve", (req, res) => {
    const { phone } = req.body;
    const user = db.users.find((u: any) => u.phone === phone);
    if (user) {
      user.status = "approved";
      // Add a welcome notification
      user.notifications.push({
        id: Date.now().toString(),
        title: "تم تفعيل حسابك",
        desc: "مرحباً بك في منصة نقابة المحامين بالفيوم. يمكنك الآن استخدام كافة خدمات المنصة.",
        time: "الآن",
        type: "info"
      });
      saveData(db);
      res.json({ message: "تمت الموافقة على الحساب بنجاح" });
    } else {
      res.status(404).json({ error: "المستخدم غير موجود" });
    }
  });

  // Delete User
  app.post("/api/admin/delete-user", (req, res) => {
    const { phone } = req.body;
    db.users = db.users.filter((u: any) => u.phone !== phone);
    db.resetRequests = db.resetRequests.filter((r: any) => r.phone !== phone);
    saveData(db);
    res.json({ message: "تم حذف المستخدم بنجاح" });
  });

  // Update User (Admin)
  app.post("/api/admin/update-user", (req, res) => {
    const { phone, updates } = req.body;
    const user = db.users.find((u: any) => u.phone === phone);
    if (user) {
      const oldStatus = user.status;
      Object.assign(user, updates);
      
      // If status changed to suspended, add a notification
      if (updates.status === 'suspended' && oldStatus !== 'suspended') {
        user.notifications.unshift({
          id: Date.now().toString(),
          title: "تنبيه: حظر الحساب",
          desc: "هذا الحساب محظور قم بالتواصل مع ادارة الحاسب الالي بنقابة المحامين بالفيوم",
          time: "الآن",
          type: "error"
        });
      }
      
      saveData(db);
      res.json({ message: "تم تحديث بيانات المستخدم بنجاح" });
    } else {
      res.status(404).json({ error: "المستخدم غير موجود" });
    }
  });

  // Send Notification
  app.post("/api/admin/notify", (req, res) => {
    const { phone, title, desc } = req.body; // if phone is null, send to all
    
    const notification = {
      id: Date.now().toString(),
      title,
      desc,
      time: "الآن",
      type: "admin"
    };

    if (phone) {
      const user = db.users.find((u: any) => u.phone === phone);
      if (user) {
        if (!user.notifications) user.notifications = [];
        user.notifications.unshift(notification);
      }
    } else {
      db.users.forEach((u: any) => {
        if (u.role !== 'admin') {
          if (!u.notifications) u.notifications = [];
          u.notifications.unshift(notification);
        }
      });
    }

    saveData(db);
    res.json({ message: "تم إرسال الإشعار بنجاح" });
  });

  // Handle Reset Request
  app.post("/api/admin/handle-reset", (req, res) => {
    const { phone } = req.body;
    db.resetRequests = db.resetRequests.filter((r: any) => r.phone !== phone);
    saveData(db);
    res.json({ message: "تم إغلاق الطلب" });
  });

  // Change Password
  app.post("/api/auth/change-password", (req, res) => {
    const { phone, oldPassword, newPassword } = req.body;
    const user = db.users.find((u: any) => u.phone === phone);
    if (user) {
      if (user.password !== oldPassword) {
        return res.status(400).json({ error: "كلمة المرور القديمة غير صحيحة" });
      }
      user.password = newPassword;
      saveData(db);
      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } else {
      res.status(404).json({ error: "المستخدم غير موجود" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
