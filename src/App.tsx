/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import html2pdf from 'html2pdf.js';
import { 
  Home as HomeIcon, 
  Bell, 
  Clock, 
  Menu, 
  Briefcase, 
  Users, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Search,
  BookOpen,
  Info,
  Newspaper,
  Building2,
  FileText,
  Scale,
  Globe,
  UserCheck,
  UserX,
  Calendar as CalendarIcon,
  ShieldCheck,
  PenTool,
  ExternalLink,
  Share2,
  Bookmark,
  Loader2,
  Wand2,
  Download,
  Send,
  User,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Online Status Hook ---
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const checkRealStatus = async () => {
      if (!navigator.onLine) {
        handleOffline();
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        // التحقق من الوصول الفعلي للسيرفر السحابي لضمان القدرة على المزامنة
        await fetch('https://ayxmuvfbhleijlynsdbv.supabase.co/rest/v1/', { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        setIsOnline(true);
      } catch (e) {
        handleOffline();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      // تنبيه فوري وصارم
      alert("تنبيه أمني: انقطع الاتصال بالإنترنت. سيتم حظر الوصول للنظام فوراً لضمان مزامنة البيانات.");
      
      // مسح البيانات المؤقتة لضمان عدم بقاء أي بيانات غير متزامنة محلياً
      sessionStorage.clear();
      localStorage.removeItem('lawyer_app_db');
      window.location.reload(); 
    };

    window.addEventListener('online', checkRealStatus);
    window.addEventListener('offline', handleOffline);

    // فحص دوري كل 5 ثوانٍ لضمان استمرارية الاتصال
    const interval = setInterval(checkRealStatus, 5000);

    return () => {
      window.removeEventListener('online', checkRealStatus);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
};

const OfflineOverlay = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center p-8 text-center"
  >
    <div className="w-32 h-32 bg-red-600/20 rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-red-600/10 border border-red-500/30">
      <XCircle className="w-16 h-16 text-red-500 animate-pulse" />
    </div>
    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">نظام المزامنة: غير متصل</h1>
    <p className="text-slate-400 max-w-2xl leading-relaxed mb-10 text-xl md:text-2xl">
      عذراً، تم <span className="text-red-500 font-bold">حظر الوصول للنظام</span> مؤقتاً لعدم وجود اتصال بالإنترنت.
      <br />
      يجب أن تكون متصلاً لضمان حفظ بياناتك ومزامنتها مع السحابة بشكل آمن.
    </p>
    <div className="flex flex-col gap-5 w-full max-w-sm">
      <button 
        onClick={() => window.location.reload()}
        className="w-full py-6 bg-red-600 text-white rounded-3xl font-black text-2xl shadow-2xl shadow-red-900/40 hover:bg-red-700 transition-all cursor-pointer transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
      >
        <Globe className="w-6 h-6" />
        إعادة محاولة الاتصال
      </button>
      <div className="flex items-center justify-center gap-3 text-slate-500 font-bold bg-slate-900/50 py-3 rounded-2xl border border-slate-800">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
        جاري مراقبة استقرار الشبكة...
      </div>
    </div>
    <p className="mt-12 text-slate-600 text-sm font-medium">نقابة المحامين بالفيوم - نظام الحماية السحابي المشدد</p>
  </motion.div>
);

// --- Mock API for Static Hosting (GitHub Pages) ---
const isStaticHost = true; // يتم تحويله لموقع ثابت (Static Mode) بالكامل بناءً على طلب المستخدم

const getLocalDB = () => {
  const data = localStorage.getItem('lawyer_app_db');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.version || parsed.version < 4) {
        localStorage.removeItem('lawyer_app_db');
        return initializeDB();
      }
      return parsed;
    } catch (e) {
      localStorage.removeItem('lawyer_app_db');
      return initializeDB();
    }
  }
  return initializeDB();
};

const initializeDB = () => {
  const initialDB = { 
    version: 4,
    users: [
      { phone: "0123456789", password: "123", name: "مدير النظام", regNo: "000", status: "approved", role: "admin", notifications: [] }
    ], 
    cases: [
      { id: '1', title: 'دعوى صحة توقيع', court: 'محكمة الفيوم الابتدائية', number: '1234/2025', status: 'قيد التداول', date: '2026-04-10' },
      { id: '2', title: 'استئناف مدني', court: 'محكمة استئناف بني سويف', number: '567/2025', status: 'محجوزة للحكم', date: '2026-03-15' },
    ],
    clients: [
      { id: '1', name: 'أحمد محمد علي', phone: '01012345678', type: 'client' },
      { id: '2', name: 'شركة النيل للمقاولات', phone: '01298765432', type: 'client' },
      { id: '3', name: 'محمود حسن إبراهيم', phone: '01155667788', type: 'opponent' },
    ],
    tasks: [
      { id: '1', title: 'سحب ملف القضية 1234', completed: false, date: '2026-03-10' },
      { id: '2', title: 'سداد رسوم الاستئناف', completed: true, date: '2026-03-08' },
      { id: '3', title: 'مقابلة موكل جديد', completed: false, date: '2026-03-12' },
    ],
    sessions: [
      { id: '1', caseTitle: 'دعوى صحة توقيع', court: 'مدني الفيوم', date: '2026-03-10', time: '09:00 ص' },
      { id: '2', caseTitle: 'استئناف مدني', court: 'استئناف عالي', date: '2026-03-15', time: '10:30 ص' },
    ],
    reminders: [
      { id: '1', title: 'مراجعة ملف قضية أحمد محمد', time: '10:00' },
      { id: '2', title: 'سداد اشتراك النقابة', time: '12:00' },
    ],
    resetRequests: [],
    systemEvents: [], // سجل الأحداث المباشر
    activeSessions: [], // جلسات المستخدمين النشطة
    geminiApiKey: "AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q",
    supabaseUrl: "https://ayxmuvfbhleijlynsdbv.supabase.co",
    supabaseKey: "sb_publishable_83xDiBAKDNrlH2rm1wIiSw_qY2-zKKy" 
  };
  localStorage.setItem('lawyer_app_db', JSON.stringify(initialDB));
  return initialDB;
};

const saveLocalDB = (db: any) => {
  // نقوم بمسح البيانات الحساسة إذا تم استدعاء الحفظ والإنترنت مقطوع
  // لضمان عدم حفظ أي بيانات محلياً قد تكون غير متزامنة
  if (!navigator.onLine) {
    localStorage.removeItem('lawyer_app_db');
    return;
  }
  localStorage.setItem('lawyer_app_db', JSON.stringify(db));
};

const getSupabase = (db: any) => {
  if (!navigator.onLine) return null;
  if (db.supabaseUrl && db.supabaseKey) {
    return createClient(db.supabaseUrl, db.supabaseKey);
  }
  return null;
};

const syncToSupabase = async (newDb: any) => {
  if (!navigator.onLine) {
    console.error('Cannot sync: No internet connection');
    // مسح البيانات المحلية لضمان عدم وجود بيانات غير متزامنة
    localStorage.removeItem('lawyer_app_db');
    window.location.reload();
    return;
  }
  const supabase = getSupabase(newDb);
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('app_data')
      .upsert({ id: 1, content: newDb });
    if (error) {
      console.error('Supabase Sync Error:', error);
      // إذا فشل التحديث السحابي، لا نحتفظ بالبيانات المحلية لضمان النزاهة
      localStorage.removeItem('lawyer_app_db');
    }
  } catch (e) {
    console.error('Supabase Connection Error:', e);
  }
};

const loadFromSupabase = async () => {
  if (!navigator.onLine) {
    localStorage.removeItem('lawyer_app_db');
    throw new Error('No internet connection');
  }

  const localDb = getLocalDB();
  const supabase = getSupabase(localDb);
  
  if (!supabase) {
    // إذا لم توجد إعدادات سحابية، لا نقوم بتحميل أي شيء
    throw new Error('Supabase configuration missing');
  }
  
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('content')
      .eq('id', 1);
    
    if (error) {
      console.error('Supabase fetch error:', error.message);
      localStorage.removeItem('lawyer_app_db'); // مسح المحلي عند الفشل
      throw error;
    }

    if (data && data.length > 0 && data[0].content) {
      const cloudDb = data[0].content;
      
      // التأكد من أن مفتاح Gemini موجود دائماً حتى لو فقد في السحابة
      if (!cloudDb.geminiApiKey || cloudDb.geminiApiKey === "MY_GEMINI_API_KEY" || cloudDb.geminiApiKey === "AIzaSyBzGCWEiGVvn_32VnU8fsxoteqr5sWCkTA") {
        cloudDb.geminiApiKey = "AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q";
      }
      
      saveLocalDB(cloudDb);
      return cloudDb;
    } else {
      // إذا كانت السحابة فارغة، نقوم برفع البيانات المحلية الحالية كنسخة أولية
      await syncToSupabase(localDb);
      return localDb;
    }
  } catch (e) {
    console.error('Critical Supabase error:', e);
    localStorage.removeItem('lawyer_app_db');
    throw e;
  }
  return localDb;
};

const mockFetch = async (url: string, options: any = {}) => {
  if (!navigator.onLine) {
    throw new Error('No internet connection');
  }

  const body = options.body ? JSON.parse(options.body) : null;
  const createResponse = (ok: boolean, status: number, data: any) => ({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  });

  // Always fetch fresh from cloud for every API call
  let currentDb = await loadFromSupabase();

  if (url === '/api/auth/signup') {
    if (currentDb.users.find((u: any) => u.phone === body.phone)) {
      return createResponse(false, 400, { error: "خطأ: رقم الهاتف هذا مسجل مسبقاً" });
    }
    currentDb.users.push({ ...body, status: 'pending', role: 'user', notifications: [] });
    saveLocalDB(currentDb);
    await syncToSupabase(currentDb);
    return createResponse(true, 200, { message: "تم إنشاء حساب جديد و سوف تتم الموافقة على الحساب في اقرب وقت من قبل نقابة المحامين للفيوم" });
  }

  if (url === '/api/auth/login') {
    const user = currentDb.users.find((u: any) => u.phone === body.phone && u.password === body.password);
    if (!user) return createResponse(false, 401, { error: "خطأ: رقم الهاتف أو كلمة المرور غير صحيحة" });
    if (user.status === 'pending') return createResponse(false, 403, { error: "حسابك قيد المراجعة حالياً" });
    if (user.status === 'suspended') return createResponse(false, 403, { error: "هذا الحساب محظور قم بالتواصل مع ادارة الحاسب الالي بنقابة المحامين بالفيوم" });
    return createResponse(true, 200, { user });
  }

  if (url === '/api/auth/forgot-password') {
    const user = currentDb.users.find((u: any) => u.phone === body.phone);
    if (!user) return createResponse(false, 404, { error: "خطأ: رقم الهاتف غير مسجل لدينا" });
    currentDb.resetRequests.push({ phone: body.phone, name: user.name, timestamp: new Date().toISOString(), status: 'pending' });
    saveLocalDB(currentDb);
    await syncToSupabase(currentDb);
    return createResponse(true, 200, { message: "تم إرسال طلب استعادة كلمة المرور. سيقوم المسؤول بالتواصل معك قريباً." });
  }

  if (url === '/api/admin/data') {
    return createResponse(true, 200, { users: currentDb.users.filter((u: any) => u.role !== 'admin'), resetRequests: currentDb.resetRequests });
  }

  if (url === '/api/admin/approve') {
    const user = currentDb.users.find((u: any) => u.phone === body.phone);
    if (user) user.status = 'approved';
    saveLocalDB(currentDb);
    await syncToSupabase(currentDb);
    return createResponse(true, 200, { message: "تمت الموافقة" });
  }

  if (url === '/api/admin/handle-reset') {
    currentDb.resetRequests = currentDb.resetRequests.filter((r: any) => r.phone !== body.phone);
    saveLocalDB(currentDb);
    await syncToSupabase(currentDb);
    return createResponse(true, 200, { message: "تم إغلاق الطلب" });
  }

  if (url === '/api/admin/delete-user') {
    currentDb.users = currentDb.users.filter((u: any) => u.phone !== body.phone);
    saveLocalDB(currentDb);
    await syncToSupabase(currentDb);
    return createResponse(true, 200, { message: "تم حذف المستخدم" });
  }

  if (url === '/api/admin/update-user') {
    const userIndex = currentDb.users.findIndex((u: any) => u.phone === body.phone);
    if (userIndex !== -1) {
      currentDb.users[userIndex] = { ...currentDb.users[userIndex], ...body.updates };
      saveLocalDB(currentDb);
      await syncToSupabase(currentDb);
      return createResponse(true, 200, { message: "تم تحديث البيانات" });
    }
    return createResponse(false, 404, { error: "المستخدم غير موجود" });
  }

  if (url === '/api/admin/notify') {
    const { phone, title, desc } = body;
    const notification = { id: Date.now().toString(), title, desc, timestamp: new Date().toISOString(), read: false };
    
    if (phone) { // Single user
      const user = currentDb.users.find((u: any) => u.phone === phone);
      if (user) {
        if (!user.notifications) user.notifications = [];
        user.notifications.unshift(notification);
      }
    } else { // All users
      currentDb.users.forEach((u: any) => {
        if (!u.notifications) u.notifications = [];
        u.notifications.unshift(notification);
      });
    }
    saveLocalDB(currentDb);
    await syncToSupabase(currentDb);
    return createResponse(true, 200, { message: "تم الإرسال" });
  }

  if (url.startsWith('/api/user/notifications')) {
    const phone = new URLSearchParams(url.split('?')[1]).get('phone');
    const user = currentDb.users.find((u: any) => u.phone === phone);
    return createResponse(true, 200, { notifications: user?.notifications || [] });
  }

  if (url === '/api/auth/change-password') {
    const user = currentDb.users.find((u: any) => u.phone === body.phone);
    if (user) {
      if (user.password !== body.oldPassword) {
        return createResponse(false, 400, { error: "كلمة المرور القديمة غير صحيحة" });
      }
      user.password = body.newPassword;
      saveLocalDB(currentDb);
      await syncToSupabase(currentDb);
      return createResponse(true, 200, { message: "تم تغيير كلمة المرور بنجاح" });
    }
    return createResponse(false, 404, { error: "المستخدم غير موجود" });
  }

  return createResponse(false, 404, { error: "Not Found" });
};

const apiFetch = async (url: string, options: any = {}) => {
  if (!navigator.onLine) {
    alert("تنبيه: لا يوجد اتصال بالإنترنت. لا يمكنك إجراء أي عمليات حالياً.");
    window.location.reload();
    throw new Error('No internet connection');
  }
  if (isStaticHost) {
    try {
      return await mockFetch(url, options);
    } catch (e) {
      console.error("Mock API Error:", e);
      throw e;
    }
  }
  try {
    const response = await fetch(url, options);
    return response;
  } catch (e) {
    console.warn("Server not reachable, falling back to mock API");
    return mockFetch(url, options);
  }
};

// --- Types ---


interface Case {
  id: string;
  title: string;
  court: string;
  number: string;
  status: string;
  date: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  type: 'client' | 'opponent';
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  date: string;
}

interface Session {
  id: string;
  caseTitle: string;
  court: string;
  date: string;
  time: string;
}

interface Reminder {
  id: string;
  title: string;
  time: string;
}

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: -50, x: '-50%' }}
    animate={{ opacity: 1, y: 20, x: '-50%' }}
    exit={{ opacity: 0, y: -50, x: '-50%' }}
    className={cn(
      "fixed top-0 left-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-[90%]",
      type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : 
      type === 'error' ? "bg-red-50 border-red-100 text-red-800" : 
      "bg-blue-50 border-blue-100 text-blue-800"
    )}
  >
    {type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
    {type === 'error' && <XCircle className="w-6 h-6 text-red-600 shrink-0" />}
    {type === 'info' && <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />}
    
    <p className="text-sm font-bold flex-1 text-right">{message}</p>
    
    <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
      <X className="w-4 h-4" />
    </button>
  </motion.div>
);

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 text-center"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 cursor-pointer"
            >
              حذف
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/justice/1920/1080" 
            alt="Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950" />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Scale className="w-20 h-20 text-blue-500 mx-auto mb-8" />
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              المنصة الرقمية لنقابة المحامين بالفيوم <span className="text-blue-500">ترحب بك</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              المنصة الرسمية لنقابة المحامين بالفيوم - أدوات ذكية، مكتبة قانونية، ومجتمع متكامل في مكان واحد.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/signup')}
                className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all cursor-pointer"
              >
                ابدأ رحلتك الآن
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full md:w-auto px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-lg backdrop-blur-md hover:bg-white/20 transition-all cursor-pointer"
              >
                تسجيل الدخول
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">خدمات المنصة الذكية</h2>
          <p className="text-slate-500">كل ما يحتاجه المحامي العصري في واجهة واحدة متطورة</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Wand2, title: 'المساعد الذكي', desc: 'صياغة العقود والمذكرات القانونية باستخدام أحدث تقنيات الذكاء الاصطناعي.' },
            { icon: BookOpen, title: 'المكتبة الرقمية', desc: 'أرشيف ضخم من القوانين، الأحكام، والكتب القانونية المتاحة للتحميل.' },
            { icon: Briefcase, title: 'المكتب الافتراضي', desc: 'إدارة القضايا، الموكلين، والجلسات بنظام تنبيهات ذكي.' },
            { icon: Users, title: 'مجتمع المحامين', desc: 'تواصل مع الزملاء، شارك الخبرات، وابقَ على اطلاع بأحدث أخبار النقابة.' },
            { icon: Globe, title: 'المنصات الحكومية', desc: 'وصول سريع ومباشر لكافة المنصات القضائية والحكومية المصرية.' },
            { icon: ShieldCheck, title: 'أمان البيانات', desc: 'نظام تشفير متطور لحماية بياناتك وبيانات موكليك بخصوصية تامة.' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-blue-600 py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          <div>
            <p className="text-4xl font-black mb-2">+5000</p>
            <p className="text-sm opacity-80">عضو مسجل</p>
          </div>
          <div>
            <p className="text-4xl font-black mb-2">+10k</p>
            <p className="text-sm opacity-80">مستند قانوني</p>
          </div>
          <div>
            <p className="text-4xl font-black mb-2">24/7</p>
            <p className="text-sm opacity-80">دعم فني</p>
          </div>
          <div>
            <p className="text-4xl font-black mb-2">100%</p>
            <p className="text-sm opacity-80">تحول رقمي</p>
          </div>
        </div>
      </section>
    </div>
  );
};

const Header = ({ title, onBack, onMenu, showLogo = true, notificationsCount = 0 }: { title: string, onBack?: () => void, onMenu?: () => void, showLogo?: boolean, notificationsCount?: number }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <header className={cn(
      "flex items-center justify-between p-4 sticky top-0 z-30 border-b transition-all",
      isLanding ? "bg-slate-950/80 backdrop-blur-md border-white/10 text-white" : "bg-white border-gray-100 text-gray-900"
    )}>
      <div className="flex items-center gap-3">
        {onBack ? (
          <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer">
            <ChevronRight className="w-6 h-6" />
          </button>
        ) : (
          <button onClick={onMenu} className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer md:hidden">
            <Menu className="w-6 h-6" />
          </button>
        )}
        <Link to="/" className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold hidden sm:block">{title}</h1>
        </Link>
        
        {!isLanding && !onBack && (
          <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            {notificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                {notificationsCount}
              </span>
            )}
          </button>
        )}
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 mr-8">
          {[
            { label: 'الرئيسية', path: '/home' },
            { label: 'مكتبي', path: '/my-office' },
            { label: 'المجتمع', path: '/community' },
            { label: 'المكتبة', path: '/library' },
            { label: 'الملف الشخصي', path: '/profile' },
          ].map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              className={cn(
                "text-sm font-bold transition-colors",
                location.pathname === item.path ? "text-blue-500" : isLanding ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-blue-600"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      
      {showLogo && (
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-left">
            <p className={cn("text-xs font-bold", isLanding ? "text-slate-500" : "text-gray-400")}>نقابة المحامين</p>
            <p className="text-sm font-black text-blue-600">بالفيوم</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-200 overflow-hidden ml-2">
            <img 
              src="https://img.icons8.com/color/96/law.png" 
              alt="Official Logo" 
              className="w-7 h-7 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </header>
  );
};

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 h-full w-64 bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-blue-50/30">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md border border-blue-100 overflow-hidden">
                <img 
                  src="https://img.icons8.com/color/96/law.png" 
                  alt="Official Logo" 
                  className="w-10 h-10 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">نقابة المحامين</h3>
                <p className="text-xs text-gray-500">بالفيوم</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {[
                { icon: HomeIcon, label: 'الرئيسية', path: '/home' },
                { icon: Briefcase, label: 'مكتبي', path: '/my-office' },
                { icon: Users, label: 'المجتمع', path: '/community' },
                { icon: BookOpen, label: 'المكتبة القانونية', path: '/library' },
                { icon: Newspaper, label: 'الجريدة الرسمية', path: '/bulletin' },
                { icon: Building2, label: 'المنصات الحكومية', path: '/gov-platforms' },
                { icon: User, label: 'الملف الشخصي', path: '/profile' },
              ].map((item, i) => (
                <button 
                  key={i}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
                    location.pathname === item.path ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
            
            <div className="p-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">الإصدار 1.0.0</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  if (['/', '/login', '/signup'].includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around items-center py-2 px-4 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
      {[
        { icon: HomeIcon, label: 'الرئيسية', path: '/home' },
        { icon: Bell, label: 'الإشعارات', path: '/notifications' },
        { icon: Clock, label: 'التذكيرات', path: '/reminders' },
        { icon: User, label: 'الملف الشخصي', path: '/profile' },
      ].map((item) => (
        <button 
          key={item.path}
          onClick={() => navigate(item.path)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors cursor-pointer",
            location.pathname === item.path ? "text-blue-600" : "text-gray-400"
          )}
        >
          <item.icon className="w-6 h-6" />
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 6 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy', { locale: ar })}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const hasEvents = isSameDay(day, addDays(today, 1)); // Mock event

          return (
            <div 
              key={idx} 
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-full text-sm relative transition-colors",
                !isCurrentMonth && "text-gray-300",
                isCurrentMonth && "text-gray-700",
                isToday && "bg-blue-600 text-white font-bold",
                !isToday && isCurrentMonth && "hover:bg-gray-50"
              )}
            >
              {format(day, 'd')}
              {hasEvents && !isToday && (
                <div className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
              )}
              {isToday && hasEvents && (
                <div className="absolute -bottom-1 text-[10px] bg-blue-100 text-blue-600 px-1 rounded-full font-bold">
                  2
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActionCard = ({ icon: Icon, title, subtitle, color, onClick }: { 
  icon: any, 
  title: string, 
  subtitle?: string, 
  color: string,
  onClick?: () => void 
}) => (
  <motion.button 
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-right group cursor-pointer"
  >
    <div className={cn("p-3 rounded-xl transition-colors", color)}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-gray-900">{title}</h4>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
  </motion.button>
);

// --- Placeholder Screen Component ---
const PlaceholderScreen = ({ title, onBack, description }: { title: string, onBack: () => void, description?: string }) => {
  return (
    <div className="pb-24">
      <Header title={title} onBack={onBack} />
      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 mt-20">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
          <Info className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-500 max-w-xs">
          {description || "هذا القسم قيد التطوير حالياً وسيكون متاحاً في التحديث القادم لخدمة السادة المحامين."}
        </p>
        <button 
          onClick={onBack}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
        >
          العودة للخلف
        </button>
      </div>
    </div>
  );
};

// --- Screens ---

const HomeScreen = ({ onMenu, notificationsCount = 0 }: { onMenu: () => void, notificationsCount?: number }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const services = [
    { id: '/my-office', title: 'مكتبي', icon: Briefcase },
    { id: '/community', title: 'مجتمع المحامين', icon: Users },
    { id: '/library', title: 'المكتبة القانونية', icon: BookOpen },
    { id: '/bulletin', title: 'الجريدة الرسمية', icon: Newspaper },
    { id: '/gov-platforms', title: 'المنصات الحكومية', icon: Building2 },
    { id: '/cases', title: 'القضايا', icon: Scale },
    { id: '/clients', title: 'الموكلين', icon: UserCheck },
    { id: '/opponents', title: 'الخصوم', icon: UserX },
    { id: '/sessions', title: 'الجلسات', icon: CalendarIcon },
    { id: '/tasks', title: 'المهام الإدارية', icon: ShieldCheck },
    { id: '/bailiffs', title: 'المحضرين', icon: PenTool },
    { id: '/judicial-distribution', title: 'التوزيع القضائي', icon: Scale },
    { id: '/tax-declarations', title: 'الإقرارات الضريبية', icon: FileText },
    { id: '/writing', title: 'كتابة العرائض بـ Ai', icon: Sparkles },
    { id: '/notifications', title: 'الإشعارات', icon: Bell },
    { id: '/reminders', title: 'التذكيرات', icon: Clock },
    { id: '/profile', title: 'الملف الشخصي', icon: User },
  ];

  const filteredServices = searchQuery.trim() === '' 
    ? [] 
    : services.filter(s => s.title.includes(searchQuery));

  return (
    <div className="pb-24">
      <Header title="نقابة المحامين بالفيوم" onMenu={onMenu} notificationsCount={notificationsCount} />
      
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="relative">
            <input 
              type="text"
              placeholder="ابحث عن خدمة أو قسم..."
              className="w-full bg-gray-100 border-none rounded-2xl py-4 pr-12 pl-4 text-right outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          <AnimatePresence>
            {filteredServices.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
              >
                {filteredServices.map(service => (
                  <button
                    key={service.id}
                    onClick={() => {
                      navigate(service.id);
                      setSearchQuery('');
                    }}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none text-right"
                  >
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <service.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-bold text-gray-900">{service.title}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {/* Main Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/my-office')}
          className="bg-blue-600 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <Briefcase className="w-5 h-5" />
          <span className="font-bold">مكتبي</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/community')}
          className="bg-blue-600 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <Users className="w-5 h-5" />
          <span className="font-bold">مجتمع المحامين</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/library')}
          className="bg-blue-50 text-blue-600 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <BookOpen className="w-5 h-5" />
          <span className="font-bold">المكتبة</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/gov-platforms')}
          className="bg-blue-50 text-blue-600 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Globe className="w-5 h-5" />
          <span className="font-bold">المنصات</span>
        </motion.button>
      </div>

      {/* AI Feature */}
      <motion.button 
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/writing')}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl flex items-center justify-between text-white shadow-lg cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-bold">كتابة العرائض بـ Ai (متاح الآن)</span>
        </div>
        <FileText className="w-5 h-5 opacity-50" />
      </motion.button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Shortcuts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            <h3 className="font-bold text-lg">الاختصارات السريعة</h3>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            {[
              { icon: Scale, title: 'التوزيعة القضائية', path: '/judicial-distribution' },
              { icon: CalendarIcon, title: 'الأجندات القضائية وقرارات المحاكم', path: '/sessions' },
              { icon: FileText, title: 'الإقرارات الضريبية', path: '/tax-declarations' },
              { icon: ShieldCheck, title: 'تحضير مستندات لمصر الرقمية', path: '/gov-platforms' },
              { icon: PenTool, title: 'تجهيز ملف تسوية اسرة', path: '/tasks' },
            ].map((item, i) => (
              <button 
                key={i} 
                onClick={() => navigate(item.path)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{item.title}</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Agenda */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            <h3 className="font-bold text-lg">أجندة المكتب</h3>
          </div>
          <Calendar />
        </div>
      </div>
    </div>
  </div>
);

};

const MyOfficeScreen = ({ onBack, cases, clients, tasks, sessions, reminders }: { onBack: () => void, cases: Case[], clients: Client[], tasks: Task[], sessions: Session[], reminders: Reminder[] }) => {
  const navigate = useNavigate();
  return (
    <div className="pb-24">
      <Header title="مكتبي" onBack={onBack} />
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <ActionCard icon={CalendarIcon} title="الأجندة" subtitle={`${sessions.length} جلسات`} color="bg-blue-600" onClick={() => navigate('/agenda')} />
          <ActionCard icon={Clock} title="التذكيرات" subtitle={`${reminders.length} تذكير`} color="bg-blue-500" onClick={() => navigate('/reminders')} />
        </div>

        <div className="pt-4">
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            <h3 className="font-bold text-lg">إدارة القضايا والموكلين</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard icon={Scale} title="القضايا" subtitle={`${cases.length} قضية مسجلة`} color="bg-blue-500" onClick={() => navigate('/cases')} />
            <ActionCard icon={UserCheck} title="الموكلين" subtitle={`${clients.filter(c=>c.type==='client').length} موكل`} color="bg-blue-600" onClick={() => navigate('/clients')} />
            <ActionCard icon={UserX} title="الخصوم" subtitle={`${clients.filter(c=>c.type==='opponent').length} خصم`} color="bg-blue-400" onClick={() => navigate('/opponents')} />
            <ActionCard icon={CalendarIcon} title="الجلسات" subtitle="جدولة ومتابعة الجلسات" color="bg-blue-700" onClick={() => navigate('/sessions')} />
          </div>
        </div>
        
        <div className="pt-4 pb-2">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <div className="w-1 h-6 bg-green-600 rounded-full" />
            <h3 className="font-bold text-lg">الأعمال والمهام</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard icon={ShieldCheck} title="الأعمال الإدارية" subtitle={`${tasks.filter(t=>!t.completed).length} مهام قائمة`} color="bg-green-600" onClick={() => navigate('/tasks')} />
            <ActionCard icon={FileText} title="المحضرين" subtitle="إدارة المحضرين والإجراءات" color="bg-green-500" onClick={() => navigate('/bailiffs')} />
            <ActionCard icon={PenTool} title="الأعمال الكتابية" subtitle="كتابة العرائض والمذكرات" color="bg-green-400" onClick={() => navigate('/writing')} />
          </div>
        </div>
      </div>
    </div>
  );
};

const AgendaScreen = ({ onBack, sessions, tasks }: { onBack: () => void, sessions: Session[], tasks: Task[] }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaySessions = sessions.filter(s => s.date === today);
  const todayTasks = tasks.filter(t => t.date === today);

  return (
    <div className="pb-24">
      <Header title="أجندة المكتب" onBack={onBack} />
      <div className="p-4 space-y-6">
        <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-bold mb-1">أجندة اليوم</h3>
          <p className="text-blue-100 text-sm">{format(new Date(), 'eeee, d MMMM yyyy', { locale: undefined })}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600">
            <CalendarIcon className="w-5 h-5" />
            <h4 className="font-bold">جلسات اليوم ({todaySessions.length})</h4>
          </div>
          {todaySessions.length > 0 ? (
            <div className="space-y-3">
              {todaySessions.map(s => (
                <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-gray-900">{s.caseTitle}</h5>
                    <p className="text-xs text-gray-500">{s.court} - {s.time}</p>
                  </div>
                  <div className="w-2 h-10 bg-blue-500 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-2xl">لا توجد جلسات مجدولة لليوم</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <ShieldCheck className="w-5 h-5" />
            <h4 className="font-bold">مهام اليوم ({todayTasks.length})</h4>
          </div>
          {todayTasks.length > 0 ? (
            <div className="space-y-3">
              {todayTasks.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                  <div>
                    <h5 className={cn("font-bold text-sm", t.completed ? "text-gray-400 line-through" : "text-gray-900")}>{t.title}</h5>
                    <p className="text-[10px] text-gray-400">{t.date}</p>
                  </div>
                  <div className={cn("w-2 h-10 rounded-full", t.completed ? "bg-gray-200" : "bg-green-500")} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-2xl">لا توجد مهام لليوم</p>
          )}
        </div>
      </div>
    </div>
  );
};

const CalendarScreen = ({ onBack, sessions }: { onBack: () => void, sessions: Session[] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysArr = eachDayOfInterval({ start, end });
    return daysArr;
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="pb-24">
      <Header title="التقويم" onBack={onBack} />
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <button onClick={prevMonth} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"><ChevronRight className="w-6 h-6" /></button>
            <h3 className="font-bold">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={nextMonth} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"><ChevronLeft className="w-6 h-6" /></button>
          </div>
          <div className="grid grid-cols-7 text-center py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-400">
            <div>ح</div><div>ن</div><div>ث</div><div>ر</div><div>خ</div><div>ج</div><div>س</div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const daySessions = sessions.filter(s => s.date === dateStr);
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
              
              return (
                <div key={dateStr} className="bg-white aspect-square p-1 flex flex-col items-center justify-between relative">
                  <span className={cn(
                    "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-blue-600 text-white" : "text-gray-700"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {daySessions.length > 0 && (
                    <div className="flex gap-0.5 mt-auto">
                      {daySessions.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-blue-500 rounded-full" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-900">جلسات هذا الشهر</h4>
          <div className="space-y-3">
            {sessions.filter(s => s.date.startsWith(format(currentMonth, 'yyyy-MM'))).map(s => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-center">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-600 shrink-0">
                  <span className="text-[10px] font-bold">{format(new Date(s.date), 'MMM')}</span>
                  <span className="text-lg font-bold leading-none">{format(new Date(s.date), 'd')}</span>
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-900 text-sm">{s.caseTitle}</h5>
                  <p className="text-[10px] text-gray-500">{s.court} - {s.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CommunityScreen = ({ onBack }: { onBack: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="pb-24">
      <Header title="مجتمع المحامين" onBack={onBack} />
      <div className="p-4 space-y-8">
        <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">مرحباً بك في مجتمع المحامين</h2>
            <p className="text-blue-100 text-base">شبكة تواصل وتطوير مهني شاملة للمحامين</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Users className="w-48 h-48" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-600">
              <div className="w-1 h-6 bg-purple-600 rounded-full" />
              <h3 className="font-bold text-lg">الموارد والمعلومات</h3>
            </div>
            <div className="space-y-3">
              <ActionCard 
                icon={BookOpen} 
                title="المكتبة القانونية" 
                subtitle="مجموعة شاملة من المراجع القانونية" 
                color="bg-purple-600" 
                onClick={() => navigate('/library')}
              />
              <ActionCard 
                icon={Info} 
                title="كل ما يهم المحامي" 
                subtitle="معلومات ومصادر مفيدة للمحامين" 
                color="bg-purple-500" 
                onClick={() => navigate('/bulletin')}
              />
              <ActionCard 
                icon={Newspaper} 
                title="النشرة القانونية" 
                subtitle="آخر الأخبار والتطورات القانونية" 
                color="bg-purple-400" 
                onClick={() => navigate('/bulletin')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <div className="w-1 h-6 bg-emerald-600 rounded-full" />
              <h3 className="font-bold text-lg">الخدمات الحكومية</h3>
            </div>
            <div className="space-y-3">
              <ActionCard 
                icon={Building2} 
                title="المنصات الحكومية" 
                subtitle="الوصول للمنصات الحكومية الرسمية" 
                color="bg-emerald-600" 
                onClick={() => navigate('/gov-platforms')}
              />
              <ActionCard 
                icon={FileText} 
                title="الإقرارات الضريبية" 
                subtitle="إدارة الإقرارات الضريبية" 
                color="bg-emerald-500" 
                onClick={() => navigate('/tax-declarations')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LibraryScreen = ({ onBack, requestConfirm }: { onBack: () => void, requestConfirm: (title: string, message: string, onConfirm: () => void) => void }) => {
  const [activeTab, setActiveTab] = useState('laws');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isReading, setIsReading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [db, setDb] = useState(getLocalDB());
  const [supabaseUrl, setSupabaseUrl] = useState(db.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(db.supabaseKey || '');
  const [geminiKey, setGeminiKey] = useState(db.geminiApiKey || '');

  const saveSupabaseConfig = () => {
    const newDb = { ...db, supabaseUrl, supabaseKey };
    saveLocalDB(newDb);
    setDb(newDb);
    alert('تم حفظ إعدادات Supabase');
  };

  const saveGeminiKey = () => {
    const newDb = { ...db, geminiApiKey: geminiKey };
    saveLocalDB(newDb);
    setDb(newDb);
    alert('تم حفظ مفتاح Gemini API');
  };

  const exportData = () => {
    const dataStr = localStorage.getItem('lawyer_app_db');
    if (dataStr) {
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lawyer_db_backup_${new Date().toISOString().split('T')[0]}.json`);
      link.click();
      window.URL.revokeObjectURL(url);
      alert('تم تصدير البيانات بنجاح.');
    } else {
      alert('لا توجد بيانات لتصديرها.');
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          JSON.parse(content); // Validate JSON
          localStorage.setItem('lawyer_app_db', content);
          alert('تم استيراد البيانات بنجاح! سيتم تحديث الصفحة.');
          setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
          alert('ملف غير صالح. الرجاء اختيار ملف JSON صحيح.');
        }
      };
      reader.readAsText(file);
    }
  };
  
  const allBooks = [
    { 
      id: '1',
      title: 'قانون المرافعات المدنية والتجارية', 
      year: 'رقم 13 لسنة 1968', 
      color: 'bg-slate-800', 
      category: 'laws', 
      description: 'ينظم هذا القانون القواعد الإجرائية التي تتبع أمام المحاكم المدنية والتجارية في مصر، ويشمل قواعد الاختصاص ورفع الدعاوى والحضور والغياب والأحكام وطرق الطعن.',
      content: [
        { title: 'الباب الأول: القواعد العامة', text: 'مادة (1): تسري قوانين المرافعات على ما لم يكن قد فصل فيه من الدعاوى أو تم من الإجراءات قبل تاريخ العمل بها، ويستثنى من ذلك القوانين المعدلة للاختصاص متى كان تاريخ العمل بها بعد إقفال باب المرافعة في الدعوى.' },
        { title: 'مادة (2)', text: 'كل إجراء من إجراءات المرافعات تم صحيحاً في ظل قانون معمول به يبقى صحيحاً ما لم ينص على غير ذلك.' },
        { title: 'مادة (3)', text: 'لا يقبل أي طلب أو دفع لا تكون لصاحبه فيه مصلحة قائمة يقرها القانون. ومع ذلك تكفي المصلحة المحتملة إذا كان المقصود من الطلب الاحتياط لدفع ضرر محدق أو الاستيثاق لحق يخشى زوال دليله عند النزاع فيه.' },
        { title: 'الباب الثاني: الاختصاص', text: 'مادة (4): تختص محاكم الجمهورية بنظر الدعاوى التي ترفع على المصري ولو لم يكن له موطن أو محل إقامة في الجمهورية، وذلك فيما عدا الدعاوى العقارية المتعلقة بعقار واقع في الخارج.' }
      ]
    },
    { 
      id: '2',
      title: 'قانون الإجراءات الجنائية', 
      year: 'رقم 150 لسنة 1950', 
      color: 'bg-red-900', 
      category: 'laws', 
      description: 'هو القانون الذي يحدد القواعد الإجرائية المتبعة في التحقيق والمحاكمة في الجرائم الجنائية، ويضمن حقوق المتهمين وينظم عمل النيابة العامة والمحاكم الجنائية.',
      content: [
        { title: 'الكتاب الأول: في الدعوى الجنائية وجمع الاستدلالات والتحقيق', text: 'مادة (1): النيابة العامة هي المختصة دون غيرها برفع الدعوى الجنائية ومباشرتها ولا ترفع من غيرها إلا في الأحوال المبينة في القانون.' },
        { title: 'مادة (2)', text: 'يقوم النائب العام بنفسه أو بواسطة أحد أعضاء النيابة العامة بمباشرة الدعوى الجنائية كما هو مقرر بالقانون.' },
        { title: 'مادة (3)', text: 'لا يجوز رفع الدعوى الجنائية إلا بناء على شكوى شفهية أو كتابية من المجني عليه أو من وكيله الخاص، إلى النيابة العامة أو إلى أحد مأموري الضبط القضائي في الجرائم المنصوص عليها في المواد 185 و274 و277 و279 و292 و293 و303 و306 و307 و308 من قانون العقوبات.' }
      ]
    },
    { 
      id: '3',
      title: 'القانون المدني المصري', 
      year: 'رقم 131 لسنة 1948', 
      color: 'bg-amber-900', 
      category: 'laws', 
      description: 'يعتبر الشريعة العامة للمعاملات المالية والروابط القانونية بين الأفراد، وينظم العقود والالتزامات والحقوق العينية الأصلية والتبعية.',
      content: [
        { title: 'الباب التمهيدي: أحكام عامة', text: 'مادة (1): تسري النصوص التشريعية على جميع المسائل التي تتناولها هذه النصوص في لفظها أو في فحواها. فإذا لم يوجد نص تشريعي يمكن تطبيقه، حكم القاضي بمقتضى العرف، فإذا لم يوجد، فبمقتضى مبادئ الشريعة الإسلامية، فإذا لم يوجد، فبمقتضى مبادئ القانون الطبيعي وقواعد العدالة.' },
        { title: 'مادة (2)', text: 'لا يجوز إلغاء نص تشريعي إلا بتشريع لاحق ينص صراحة على هذا الإلغاء، أو يشتمل على نص يتعارض مع نص التشريع القديم، أو ينظم من جديد الموضوع الذي سبق أن قرر قواعده ذلك التشريع.' }
      ]
    },
    { 
      id: '4',
      title: 'قانون العقوبات', 
      year: 'رقم 58 لسنة 1937', 
      color: 'bg-zinc-900', 
      category: 'laws', 
      description: 'يحدد الجرائم والعقوبات المقررة لها، وينقسم إلى قسمين: القسم العام الذي يتناول القواعد الكلية للجريمة، والقسم الخاص الذي يفصل الجرائم بعينها.',
      content: [
        { title: 'الكتاب الأول: أحكام عامة', text: 'مادة (1): تسري أحكام هذا القانون على كل من يرتكب في قطر الجمهورية جريمة من الجرائم المنصوص عليها فيه.' },
        { title: 'مادة (2)', text: 'لا عقاب إلا على الأفعال اللاحقة لتاريخ نفاذ القانون.' }
      ]
    },
    { 
      id: '5',
      title: 'مبادئ محكمة النقض في التعويض', 
      year: 'مجموعة 2024', 
      color: 'bg-blue-900', 
      category: 'rulings', 
      description: 'مجموعة من أحدث المبادئ القانونية التي أرستها محكمة النقض المصرية في قضايا التعويض عن المسؤولية التقصيرية والعقدية.',
      content: [
        { title: 'المبدأ الأول: عناصر التعويض', text: 'التعويض يشمل ما لحق الدائن من خسارة وما فاته من كسب، بشرط أن يكون ذلك نتيجة طبيعية لعدم الوفاء بالالتزام أو للتأخر في الوفاء به.' },
        { title: 'المبدأ الثاني: التعويض الموروث', text: 'الحق في التعويض عن الضرر المادي ينتقل إلى الورثة، أما التعويض عن الضرر الأدبي فلا ينتقل إلا إذا تحدد بمقتضى اتفاق أو طالب به الدائن أمام القضاء.' }
      ]
    },
    { 
      id: '6',
      title: 'أحكام النقض في قضايا المخدرات', 
      year: 'مجموعة 2023', 
      color: 'bg-emerald-900', 
      category: 'rulings', 
      description: 'تجميع لأهم أحكام محكمة النقض المتعلقة بجرائم الاتجار والتعاطي والجلب، مع شرح لدفوع بطلان إجراءات القبض والتفتيش.',
      content: [
        { title: 'المبدأ الأول: بطلان التفتيش', text: 'التفتيش الذي يجريه مأمور الضبط القضائي بغير إذن من النيابة العامة وفي غير حالات التلبس يقع باطلاً ويبطل كل ما يترتب عليه من آثار.' }
      ]
    },
    { 
      id: '7',
      title: 'قانون العمل الجديد', 
      year: 'رقم 12 لسنة 2003', 
      color: 'bg-indigo-900', 
      category: 'laws', 
      description: 'ينظم العلاقة بين أصحاب الأعمال والعمال في القطاع الخاص، ويحدد ساعات العمل والإجازات والأجور وحالات إنهاء الخدمة.',
      content: [
        { title: 'مادة (1)', text: 'يقصد في تطبيق أحكام هذا القانون بالمصطلحات الآتية: العامل: كل شخص طبيعي يعمل لقاء أجر لدى صاحب عمل وتحت إدارته أو إشرافه.' }
      ]
    },
    { 
      id: '8',
      title: 'قانون المحاماة', 
      year: 'رقم 17 لسنة 1983', 
      color: 'bg-purple-900', 
      category: 'laws', 
      description: 'ينظم مهنة المحاماة في مصر، ويحدد حقوق وواجبات المحامين، وشروط القيد في الجداول، واختصاصات نقابة المحامين.',
      content: [
        { title: 'مادة (1)', text: 'المحاماة مهنة حرة تشارك السلطة القضائية في تحقيق العدالة وفي تأكيد سيادة القانون وفي كفالة حق الدفاع عن حقوق المواطنين وحرياتهم.' }
      ]
    }
  ];

  const filteredBooks = allBooks.filter(book => 
    (activeTab === 'pdf' || book.category === activeTab) &&
    (book.title.includes(searchQuery) || book.year.includes(searchQuery))
  );
  
  return (
    <div className="pb-24">
      <Header 
        title={isReading ? "قراءة المرجع" : (selectedBook ? "تفاصيل المرجع" : "المكتبة القانونية")} 
        onBack={isReading ? () => setIsReading(false) : (selectedBook ? () => setSelectedBook(null) : onBack)} 
      />
      <div className="p-4 space-y-4">
        {isReading ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 min-h-[600px] flex flex-col">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{selectedBook.title}</h3>
              <span className="text-xs text-blue-600 font-bold">المادة {currentPage} من {selectedBook.content.length}</span>
            </div>
            <div className="flex-1 text-sm text-gray-700 leading-loose text-right overflow-y-auto py-4" dir="rtl">
              <h4 className="font-bold text-lg text-blue-800 mb-4">{selectedBook.content[currentPage - 1].title}</h4>
              <p className="text-base whitespace-pre-line">{selectedBook.content[currentPage - 1].text}</p>
            </div>
            <div className="flex justify-between pt-4 border-t gap-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.min(selectedBook.content.length, prev + 1))}
                disabled={currentPage === selectedBook.content.length}
                className="flex-1 py-3 bg-gray-100 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-30 font-bold text-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
                التالي
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex-1 py-3 bg-gray-100 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-30 font-bold text-gray-600"
              >
                السابق
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : !selectedBook ? (
          <>
            {activeTab !== 'settings' && (
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ابحث عن قانون، حكم نقض، أو ملف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 border-none rounded-2xl py-3 pr-12 pl-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all text-right"
                  dir="rtl"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            )}

            <div className="flex bg-gray-100 p-1 rounded-2xl">
              {[
                { id: 'laws', title: 'القوانين' },
                { id: 'rulings', title: 'أحكام النقض' },
                { id: 'pdf', title: 'الكل' },
                { id: 'settings', title: 'الإعدادات' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer",
                    activeTab === tab.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-500"
                  )}
                >
                  {tab.title}
                </button>
              ))}
            </div>

            {activeTab !== 'settings' && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                {filteredBooks.map((book, i) => (
                  <motion.button 
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedBook(book)}
                    className={cn("aspect-[3/4] rounded-2xl p-4 flex flex-col justify-between text-white shadow-md relative overflow-hidden text-right cursor-pointer", book.color)}
                  >
                    <Scale className="w-8 h-8 opacity-50" />
                    <div>
                      <h5 className="text-sm font-bold leading-tight mb-2">{book.title}</h5>
                      <div className="bg-white/20 px-2 py-1 rounded-lg inline-block">
                        <span className="text-[10px] font-bold">{book.year}</span>
                      </div>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/10" />
                  </motion.button>
                ))}
              </div>
            )}
            
            {filteredBooks.length === 0 && activeTab !== 'settings' && (
              <div className="text-center py-10 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>لا توجد نتائج للبحث</p>
              </div>
            )}
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6"
          >
            <div className={cn("w-20 h-28 rounded-xl shadow-lg mx-auto flex items-center justify-center text-white", selectedBook.color)}>
              <Scale className="w-10 h-10 opacity-50" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-900">{selectedBook.title}</h3>
              <p className="text-blue-600 font-bold text-sm">{selectedBook.year}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <h4 className="font-bold text-gray-800 mb-2">نبذة عن المرجع:</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {selectedBook.description}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setCurrentPage(1);
                  setIsReading(true);
                }}
                className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <BookOpen className="w-6 h-6 mb-2" />
                <span className="text-xs font-bold">قراءة الآن</span>
              </button>
              <button 
                onClick={() => {
                  alert('بدأ تحميل الملف بصيغة PDF...');
                }}
                className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Download className="w-6 h-6 mb-2" />
                <span className="text-xs font-bold">تحميل PDF</span>
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-800">الفهرس السريع:</h4>
              <div className="space-y-2">
                {selectedBook.content.map((item: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setCurrentPage(idx + 1);
                      setIsReading(true);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-right cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'events' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">سجل أحداث النظام</h3>
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3 max-h-[60vh] overflow-y-auto">
              {[...((db && db.systemEvents) || [])].reverse().map((event: any, index: number) => (
                <div key={index} className="p-3 bg-slate-50 rounded-lg border-r-4 border-blue-500">
                  <p className="text-sm font-bold text-slate-900">{event.type}</p>
                  <p className="text-xs text-slate-600">{event.message}</p>
                  <p className="text-[10px] text-slate-400">{new Date(event.timestamp).toLocaleString('ar-EG')}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-emerald-600 mb-2">
                <Globe className="w-5 h-5" />
                <h3 className="font-bold text-slate-900">ربط قاعدة البيانات السحابية (Supabase)</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                للحفاظ على بياناتك عند رفع الموقع على GitHub، يفضل ربطه بقاعدة بيانات Supabase (مجانية). سيتم حفظ بيانات المستخدمين والقضايا هناك بدلاً من المتصفح فقط.
              </p>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Supabase URL</label>
                  <input 
                    type="text" 
                    value={supabaseUrl} 
                    onChange={e => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Supabase Anon Key</label>
                  <input 
                    type="password" 
                    value={supabaseKey} 
                    onChange={e => setSupabaseKey(e.target.value)}
                    placeholder="your-anon-key"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button 
                  onClick={saveSupabaseConfig}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-colors"
                >
                  ربط وحفظ الإعدادات
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-slate-900">إعدادات الذكاء الاصطناعي</h3>
              </div>
              <p className="text-sm text-slate-500">
                لأن النظام يعمل بشكل ثابت، يجب إدخال مفتاح API الخاص بـ Gemini ليعمل المساعد القانوني.
              </p>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={geminiKey} 
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="أدخل Gemini API Key هنا..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={saveGeminiKey}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors"
                >
                  حفظ
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <Download className="w-5 h-5" />
                <h3 className="font-bold text-slate-900">النسخ الاحتياطي والمزامنة</h3>
              </div>
              
              <p className="text-sm text-slate-500 leading-relaxed">
                بما أن النظام يعمل محلياً، يمكنك تصدير بياناتك وحفظها في ملف، ثم استيرادها في أي جهاز أو متصفح آخر لمتابعة عملك.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                  <h4 className="font-bold text-blue-900 text-sm">تصدير البيانات</h4>
                  <p className="text-[10px] text-blue-700">قم بتحميل نسخة من كافة بيانات النظام الحالية.</p>
                  <button 
                    onClick={exportData}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
                  >
                    تصدير الآن (JSON)
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">استيراد البيانات</h4>
                  <p className="text-[10px] text-slate-500">اختر ملف نسخة احتياطية لاستعادة البيانات.</p>
                  <label className="block w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-xs font-bold text-center cursor-pointer hover:bg-slate-50 transition-colors">
                    اختيار ملف واستيراد
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importData} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-red-900">منطقة الخطر</h3>
              </div>
              <p className="text-xs text-red-700">حذف كافة البيانات سيعيد النظام إلى حالته الأصلية.</p>
              <button 
                onClick={() => requestConfirm('حذف شامل', 'هل أنت متأكد من حذف كافة بيانات النظام؟ لا يمكن التراجع عن هذا الإجراء.', () => {
                  localStorage.removeItem('lawyer_app_db');
                  window.location.reload();
                })}
                className="bg-red-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-red-700"
              >
                مسح كافة البيانات
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const BulletinScreen = ({ onBack }: { onBack: () => void }) => {
  const [selectedNews, setSelectedNews] = useState<any>(null);

  const newsList = [
    { 
      title: 'تطبيق قانون الخدمة العسكرية بأثر رجعي: لا يعمل بالقانون الذي يساوي...', 
      date: 'تم الإصدار: اليوم',
      image: 'https://picsum.photos/seed/news1/400/300',
      content: 'في حكم تاريخي، قررت المحكمة الدستورية العليا عدم جواز تطبيق القوانين العسكرية بأثر رجعي في حالات معينة...'
    },
    { 
      title: 'بالدليل القانوني: لقب "مستشار" حق أصيل للمحامي وليس للقاضي', 
      date: 'تم الإصدار: اليوم',
      image: 'https://picsum.photos/seed/news2/400/300',
      content: 'أثارت دراسة قانونية حديثة الجدل حول أحقية المحامين في استخدام لقب مستشار بناءً على نصوص قانون المحاماة...'
    },
    { 
      title: 'إزاي تتصرف في قضايا المخدرات بعد الكتاب الدوري للنائب العام؟', 
      date: 'تم الإصدار: منذ 3 أيام',
      image: 'https://picsum.photos/seed/news3/400/300',
      content: 'أصدر النائب العام كتاباً دورياً جديداً ينظم إجراءات التفتيش والضبط في قضايا الاتجار بالمواد المخدرة...'
    },
  ];

  return (
    <div className="pb-24">
      <Header title="النشرة القانونية" onBack={selectedNews ? () => setSelectedNews(null) : onBack} />
      <div className="p-4 space-y-6">
        {!selectedNews ? (
          <>
            <div className="flex border-b border-gray-100">
              <button className="flex-1 py-3 text-blue-600 font-bold border-b-2 border-blue-600">أحدث الأخبار</button>
              <button className="flex-1 py-3 text-gray-400 font-bold">الأخبار المحفوظة</button>
            </div>

            <div className="space-y-4">
              {newsList.map((news, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                  <div className="flex p-4 gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><Bookmark className="w-4 h-4" /></button>
                          <button className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><Share2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm leading-relaxed">{news.title}</h4>
                      <p className="text-[10px] text-gray-400">{news.date}</p>
                      <button onClick={() => setSelectedNews(news)} className="text-blue-600 text-xs font-bold pt-2 cursor-pointer">تفاصيل أكثر</button>
                    </div>
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                      <img src={news.image} alt="News" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100"
          >
            <img src={selectedNews.image} alt="News" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 leading-tight">{selectedNews.title}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <CalendarIcon className="w-4 h-4" />
                <span>{selectedNews.date}</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {selectedNews.content}
              </p>
              <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg cursor-pointer">مشاركة الخبر</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const GovPlatformsScreen = ({ onBack }: { onBack: () => void }) => {
  const openPlatform = (title: string) => {
    // In a real app, these would be real URLs
    const urls: Record<string, string> = {
      'بوابة خدمات المحاكم الإلكترونية': 'https://moj.gov.eg',
      'منصة مصر الرقمية': 'https://digital.gov.eg',
      'مصلحة الضرائب المصرية': 'https://www.eta.gov.eg',
      'خدمات الشهر العقاري والتوثيق': 'https://rern.gov.eg/',
      'نقابة المحامين المصرية': 'https://egyls.com',
      'منصة النيابة العامة الرقمية': 'https://ppo.gov.eg',
      'موقع المحاكم الاقتصادية': 'https://elec.eecourts.gov.eg/user',
      'هيئة الاستثمار (GAFI)': 'https://www.gafi.gov.eg',
    };
    const url = urls[title] || 'https://google.com';
    window.open(url, '_blank');
  };

  return (
    <div className="pb-24">
      <Header title="منصات حكومية" onBack={onBack} />
      <div className="p-4 grid grid-cols-2 gap-4">
        {[
          { title: 'بوابة خدمات المحاكم الإلكترونية', icon: Scale },
          { title: 'منصة مصر الرقمية', icon: Building2 },
          { title: 'مصلحة الضرائب المصرية', icon: FileText },
          { title: 'خدمات الشهر العقاري والتوثيق', icon: PenTool },
          { title: 'نقابة المحامين المصرية', icon: ShieldCheck },
          { title: 'منصة النيابة العامة الرقمية', icon: Bell },
          { title: 'موقع المحاكم الاقتصادية', icon: Scale },
          { title: 'هيئة الاستثمار (GAFI)', icon: Building2 },
        ].map((item, i) => (
          <motion.button 
            key={i}
            whileTap={{ scale: 0.95 }}
            onClick={() => openPlatform(item.title)}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center gap-4 cursor-pointer hover:border-blue-200 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <item.icon className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-gray-700 leading-tight">{item.title}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// --- Functional Screens ---

const CasesScreen = ({ onBack, cases, onAdd, onDelete }: { onBack: () => void, cases: Case[], onAdd: (c: Omit<Case, 'id'>) => void, onDelete: (id: string) => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', court: '', number: '', status: 'قيد التداول', date: format(new Date(), 'yyyy-MM-dd') });

  return (
    <div className="pb-24">
      <Header title="إدارة القضايا" onBack={onBack} />
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type="text" placeholder="ابحث عن قضية..." className="w-full bg-gray-100 border-none rounded-xl py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm cursor-pointer">+ إضافة</button>
        </div>

        <div className="space-y-3">
          {cases.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 relative group">
              <button 
                onClick={() => onDelete(c.id)}
                className="absolute left-4 top-4 text-red-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex justify-between items-start pl-8">
                <h4 className="font-bold text-gray-900">{c.title}</h4>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">{c.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1"><Scale className="w-3 h-3" /> {c.court}</div>
                <div className="flex items-center gap-1"><FileText className="w-3 h-3" /> {c.number}</div>
                <div className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {c.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white w-full max-w-2xl rounded-t-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold">إضافة قضية جديدة</h3>
              <input type="text" placeholder="اسم القضية" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" dir="rtl" value={newCase.title} onChange={e => setNewCase({...newCase, title: e.target.value})} />
              <input type="text" placeholder="المحكمة" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" dir="rtl" value={newCase.court} onChange={e => setNewCase({...newCase, court: e.target.value})} />
              <input type="text" placeholder="رقم القضية" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" dir="rtl" value={newCase.number} onChange={e => setNewCase({...newCase, number: e.target.value})} />
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-500 font-bold cursor-pointer">إلغاء</button>
                <button onClick={() => { onAdd(newCase); setShowAdd(false); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold cursor-pointer">حفظ</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ClientsScreen = ({ onBack, clients, onAdd, onDelete, type }: { onBack: () => void, clients: Client[], onAdd: (c: Omit<Client, 'id'>) => void, onDelete: (id: string) => void, type: 'client' | 'opponent' }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filtered = clients.filter(c => c.type === type);

  return (
    <div className="pb-24">
      <Header title={type === 'client' ? "بيانات الموكلين" : "إدارة الخصوم"} onBack={onBack} />
      <div className="p-4 space-y-4">
        <button onClick={() => setShowAdd(true)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2">
          <Users className="w-5 h-5" /> إضافة {type === 'client' ? "موكل" : "خصم"} جديد
        </button>

        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  {c.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{c.name}</h4>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button className="p-2 bg-blue-50 text-blue-600 rounded-full cursor-pointer"><ExternalLink className="w-4 h-4" /></button>
                <button 
                  onClick={() => onDelete(c.id)}
                  className="p-2 text-red-400 hover:text-red-600 rounded-full transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white w-full max-w-2xl rounded-t-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold">إضافة {type === 'client' ? "موكل" : "خصم"}</h3>
              <input type="text" placeholder="الاسم" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" dir="rtl" value={newName} onChange={e => setNewName(e.target.value)} />
              <input type="text" placeholder="رقم الهاتف" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" dir="rtl" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-500 font-bold cursor-pointer">إلغاء</button>
                <button onClick={() => { onAdd({ name: newName, phone: newPhone, type }); setShowAdd(false); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold cursor-pointer">حفظ</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SessionsScreen = ({ onBack, sessions, onDelete }: { onBack: () => void, sessions: Session[], onDelete: (id: string) => void }) => (
  <div className="pb-24">
    <Header title="جدولة الجلسات" onBack={onBack} />
    <div className="p-4 space-y-4">
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 text-blue-700">
        <CalendarIcon className="w-6 h-6" />
        <div>
          <h4 className="font-bold">جلسات اليوم</h4>
          <p className="text-xs">لديك {sessions.length} جلسات مجدولة</p>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 relative group">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-900">{s.caseTitle}</h4>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-blue-600">{s.time}</span>
                <button 
                  onClick={() => onDelete(s.id)}
                  className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1"><Scale className="w-3 h-3" /> {s.court}</div>
              <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TasksScreen = ({ onBack, tasks, onToggle, onDelete }: { onBack: () => void, tasks: Task[], onToggle: (id: string) => void, onDelete: (id: string) => void }) => (
  <div className="pb-24">
    <Header title="الأعمال والمهام" onBack={onBack} />
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        {tasks.map(t => (
          <div key={t.id} className="group relative flex items-center gap-2">
            <button 
              onClick={() => onToggle(t.id)}
              className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 text-right transition-all hover:border-blue-200 cursor-pointer"
            >
              <div className={cn(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                t.completed ? "bg-green-500 border-green-500" : "border-gray-200"
              )}>
                {t.completed && <ShieldCheck className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <h4 className={cn("font-bold transition-all", t.completed ? "text-gray-400 line-through" : "text-gray-900")}>{t.title}</h4>
                <p className="text-[10px] text-gray-400">{t.date}</p>
              </div>
            </button>
            <button 
              onClick={() => onDelete(t.id)}
              className="p-2 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const BailiffsScreen = ({ onBack }: { onBack: () => void }) => {
  const [procedures, setProcedures] = useState([
    { id: '1', title: 'إعلان صحيفة دعوى', status: 'تم التسليم', date: '2026-03-05' },
    { id: '2', title: 'إعلان حكم تمهيدي', status: 'قيد التنفيذ', date: '2026-03-08' },
    { id: '3', title: 'إعلان استئناف', status: 'بانتظار الرد', date: '2026-03-09' },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newProc, setNewProc] = useState({ title: '', date: format(new Date(), 'yyyy-MM-dd') });

  const addProc = () => {
    if (!newProc.title) return;
    setProcedures([{ id: Date.now().toString(), ...newProc, status: 'قيد التنفيذ' }, ...procedures]);
    setShowAdd(false);
    setNewProc({ title: '', date: format(new Date(), 'yyyy-MM-dd') });
  };

  const deleteProc = (id: string) => {
    setProcedures(procedures.filter(p => p.id !== id));
  };

  return (
    <div className="pb-24">
      <Header title="إدارة المحضرين" onBack={onBack} />
      <div className="p-4 space-y-4">
        <button onClick={() => setShowAdd(true)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2">
          <FileText className="w-5 h-5" /> إضافة إجراء جديد
        </button>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <FileText className="w-6 h-6" />
            <h4 className="font-bold">الإجراءات الحالية</h4>
          </div>
          <div className="space-y-3 divide-y divide-gray-50">
            {procedures.map((item) => (
              <div key={item.id} className="pt-3 flex justify-between items-center group relative">
                <div>
                  <p className="text-sm font-bold text-gray-800">{item.title}</p>
                  <p className="text-[10px] text-gray-400">{item.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-full font-bold",
                    item.status === 'تم التسليم' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                  )}>{item.status}</span>
                  <button 
                    onClick={() => deleteProc(item.id)}
                    className="text-red-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white w-full max-w-2xl rounded-t-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold">إجراء محضرين جديد</h3>
              <input type="text" placeholder="نوع الإجراء (مثلاً: إعلان صحيفة)" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" dir="rtl" value={newProc.title} onChange={e => setNewProc({...newProc, title: e.target.value})} />
              <input type="date" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" value={newProc.date} onChange={e => setNewProc({...newProc, date: e.target.value})} />
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-500 font-bold cursor-pointer">إلغاء</button>
                <button onClick={addProc} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold cursor-pointer">حفظ</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationsScreen = ({ onBack, notifications, reminders, onDelete }: { onBack: () => void, notifications: any[], reminders: Reminder[], onDelete: (id: string) => void }) => (
  <div className="pb-24">
    <Header title="الإشعارات والتذكيرات" onBack={onBack} />
    <div className="p-4 space-y-6">
      {/* Reminders Section in Notifications */}
      {reminders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-600 px-2">
            <Clock className="w-4 h-4" />
            <h3 className="font-bold text-sm">تذكيرات اليوم</h3>
          </div>
          {reminders.map(r => (
            <div key={r.id} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm">{r.title}</h4>
                <p className="text-[10px] text-blue-600 font-bold mt-0.5">موعد التذكير: {r.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-600 px-2">
          <Bell className="w-4 h-4" />
          <h3 className="font-bold text-sm">إشعارات النظام</h3>
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div key={n.id || i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 group relative">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", n.color || 'text-blue-600 bg-blue-50')}>
                {n.icon ? <n.icon className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900 text-sm">{n.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{n.time}</span>
                    <button 
                      onClick={() => onDelete(n.id)}
                      className="text-red-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{n.desc}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

const RemindersScreen = ({ onBack, reminders, onAdd, onDelete }: { onBack: () => void, reminders: Reminder[], onAdd: (r: Omit<Reminder, 'id'>) => void, onDelete: (id: string) => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState(format(new Date(), 'HH:mm'));

  return (
    <div className="pb-24">
      <Header title="التذكيرات الشخصية" onBack={onBack} />
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          {reminders.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">لا توجد تذكيرات اليوم</h3>
              <p className="text-xs text-gray-500">يمكنك إضافة تذكيرات لمواعيد الجلسات أو مواعيد الموكلين.</p>
              <button onClick={() => setShowAdd(true)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md cursor-pointer">+ إضافة تذكير</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowAdd(true)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 mb-4">
                <Bell className="w-5 h-5" /> إضافة تذكير جديد
              </button>
              {reminders.map(r => (
                <div key={r.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group relative">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{r.title}</h4>
                      <p className="text-xs text-gray-500">{r.time}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDelete(r.id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white w-full max-w-2xl rounded-t-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold">تذكير جديد</h3>
              <input type="text" placeholder="ماذا تريد أن نتذكر؟" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" dir="rtl" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <input type="time" className="w-full bg-gray-100 p-3 rounded-xl border-none text-right" value={newTime} onChange={e => setNewTime(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-500 font-bold cursor-pointer">إلغاء</button>
                <button onClick={() => { onAdd({ title: newTitle, time: newTime }); setShowAdd(false); setNewTitle(''); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold cursor-pointer">حفظ</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const JudicialDistributionScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="pb-24">
    <Header title="التوزيعة القضائية" onBack={onBack} />
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-blue-600 p-4 text-white">
          <h4 className="font-bold">توزيع دوائر محكمة الفيوم</h4>
          <p className="text-[10px] opacity-80">العام القضائي 2025 - 2026</p>
        </div>
        <div className="p-4 space-y-3">
          {[
            { court: 'مدني كلي', days: 'السبت، الأحد', room: 'قاعة 1' },
            { court: 'جنح مستأنف', days: 'الاثنين، الثلاثاء', room: 'قاعة 5' },
            { court: 'أسرة كلي', days: 'الأربعاء، الخميس', room: 'قاعة 3' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-gray-800">{item.court}</p>
                <p className="text-[10px] text-gray-500">{item.days}</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{item.room}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TaxDeclarationsScreen = ({ onBack }: { onBack: () => void }) => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="pb-24">
      <Header title="الإقرارات الضريبية" onBack={onBack} />
      <div className="p-4 space-y-4">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-700">
          <FileText className="w-6 h-6" />
          <div>
            <h4 className="font-bold">موسم الإقرارات الضريبية</h4>
            <p className="text-xs">ينتهي الموعد القانوني في 31 مارس</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h4 className="font-bold text-gray-900">المستندات المطلوبة</h4>
          <ul className="space-y-2">
            {[
              'صورة الكارنيه',
              'صورة البطاقة الضريبية',
              'بيان بالدخل السنوي',
              'إيصالات سداد النقابة',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
          {!submitted ? (
            <div className="space-y-3">
              <button 
                onClick={() => setSubmitted(true)}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-md cursor-pointer hover:bg-emerald-700 transition-colors"
              >
                تقديم طلب مساعدة في الإقرار
              </button>
              <button 
                onClick={() => window.open('https://eservice.incometax.gov.eg/etax', '_blank')}
                className="w-full bg-white text-emerald-600 border-2 border-emerald-600 py-3 rounded-xl font-bold shadow-sm cursor-pointer hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                الدخول للموقع الرسمي للضرائب
              </button>
            </div>
          ) : (
            <div className="bg-emerald-100 text-emerald-700 p-4 rounded-xl text-center font-bold">
              تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WritingScreen = ({ onBack, showToast }: { onBack: () => void, showToast: (m: string, t: any) => void }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState('صحيفة دعوى');
  const [prompt, setPrompt] = useState('');

  const generateWithAI = async () => {
    if (!prompt) return;
    
    // الحل الجذري: المفتاح الجديد المقدم منك مباشرة
    const NEW_STABLE_KEY = "AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q";
    
    const db = getLocalDB();
    // نستخدم المفتاح الجديد كأولوية قصوى، وإذا كان المسؤول قد غيره يدوياً لمفتاح آخر صالح نستخدمه
    let apiKey = db.geminiApiKey;
    
    // إذا كان المفتاح في قاعدة البيانات غير صالح أو هو القيمة الافتراضية، نفرض المفتاح المستقر
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || !apiKey.startsWith("AIza") || apiKey === "AIzaSyBzGCWEiGVvn_32VnU8fsxoteqr5sWCkTA") {
      apiKey = NEW_STABLE_KEY;
    }

    apiKey = apiKey.trim(); // تنظيف أي مسافات زائدة

    setLoading(true);
    try {
      console.log("Radical AI Init - Key Check:", apiKey.substring(0, 10) + "...");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
      });
      
      const promptText = `أنت مساعد قانوني خبير ومحترف في القانون المصري. قم بكتابة ${selectedTag} باللغة العربية الفصحى وبصياغة قانونية رصينة ودقيقة بناءً على التفاصيل التالية: ${prompt}`;
      
      const result = await model.generateContent(promptText);
      const response = await result.response;
      const textResponse = response.text();
      
      if (!textResponse) {
        throw new Error("Empty Response from AI");
      }
      
      setText(textResponse);
      showToast("تم توليد النص بنجاح", "success");
    } catch (error: any) {
      console.error("CRITICAL AI ERROR:", error);
      
      let finalErrorMessage = "حدث خطأ غير متوقع في الذكاء الاصطناعي";
      const errorStr = error.toString();
      
      if (errorStr.includes("API_KEY_INVALID") || errorStr.includes("401") || errorStr.includes("403")) {
        finalErrorMessage = "خطأ في صلاحية المفتاح: يرجى التأكد من تفعيل Gemini API في Google AI Studio";
      } else if (errorStr.includes("User location is not supported")) {
        finalErrorMessage = "خطأ: الخدمة غير مدعومة في منطقتك الحالية (جرب استخدام VPN أو مفتاح آخر)";
      } else if (errorStr.includes("fetch")) {
        finalErrorMessage = "خطأ في الاتصال: تأكد من جودة الإنترنت لديك";
      } else {
        finalErrorMessage = "فشل التوليد: " + (error.message || "يرجى المحاولة مرة أخرى");
      }
      
      showToast(finalErrorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!text) return;
    
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; direction: rtl; text-align: right; line-height: 1.8;">
        <h2 style="text-align: center; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">${selectedTag}</h2>
        <div style="white-space: pre-wrap; margin-top: 20px; font-size: 14px;">
          ${text.replace(/\n/g, '<br/>')}
        </div>
        <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; text-align: center;">
          تم التوليد بواسطة تطبيق نقابة المحامين بالفيوم - مساعد الذكاء الاصطناعي
        </div>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `${selectedTag}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="pb-24">
      <Header title="الأعمال الكتابية الذكية" onBack={onBack} />
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6 h-fit">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Sparkles className="w-6 h-6" />
            <h4 className="font-bold text-lg">مساعد الكتابة الذكي</h4>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-500 mr-1">نوع المستند</label>
            <div className="flex gap-2 flex-wrap">
              {['صحيفة دعوى', 'مذكرة دفاع', 'إنذار عرض', 'طلب فحص', 'عقد بيع'].map((tag, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer",
                    selectedTag === tag ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-500 mr-1">تفاصيل الموضوع</label>
            <textarea 
              placeholder="اكتب تفاصيل القضية أو الموضوع هنا ليقوم الذكاء الاصطناعي بصياغتها..." 
              className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-right h-48 focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none" 
              dir="rtl"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>

          <button 
            onClick={generateWithAI}
            disabled={loading || !prompt}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-500/20 transition-all"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}
            {loading ? 'جاري الصياغة...' : 'صياغة بواسطة الذكاء الاصطناعي'}
          </button>
        </div>

        <div className="space-y-4">
          {text ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-full flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <h4 className="font-bold text-gray-900">المسودة الناتجة</h4>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(text);
                      showToast("تم نسخ النص إلى الحافظة", "success");
                    }}
                    className="text-blue-600 text-sm font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Share2 className="w-4 h-4" /> نسخ النص
                  </button>
                </div>
              </div>
              <textarea 
                className="w-full bg-gray-50 p-6 rounded-2xl border-none text-right flex-1 min-h-[400px] focus:ring-0 text-base leading-relaxed resize-none" 
                dir="rtl"
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={downloadPDF}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-5 h-5" /> حفظ كـ PDF
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">سيظهر النص المولد هنا بعد الضغط على زر الصياغة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



const LoginScreen = ({ onLogin, showToast }: { onLogin: (u: any) => void, showToast: (m: string, t: any) => void }) => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) return showToast('يرجى إدخال رقم الهاتف وكلمة المرور', 'error');
    setIsLoggingIn(true);
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'حدث خطأ في معالجة البيانات من الخادم' };
      }

      if (response.ok) {
        onLogin(data.user);
      } else {
        console.error('Login failed:', response.status, data);
        showToast(data.error || 'حدث خطأ غير متوقع', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ في الاتصال بالخادم. يرجى التأكد من اتصالك بالإنترنت.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!phone) return showToast('يرجى إدخال رقم هاتفك أولاً', 'error');
    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      showToast(data.message || data.error, response.ok ? 'success' : 'error');
    } catch (error) {
      showToast('حدث خطأ في الاتصال', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-900/20 mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">تسجيل الدخول</h2>
          <p className="text-slate-400 text-sm">مرحباً بك في منصة المحامين الذكية</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 mr-1">رقم الهاتف</label>
            <div className="relative">
              <input 
                type="tel" 
                placeholder="01xxxxxxxxx"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-right outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <Users className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 mr-1">كلمة المرور</label>
            <div className="relative">
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-right outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <ShieldCheck className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
            </div>
          </div>

          <button 
            onClick={handleForgotPassword}
            className="text-blue-500 text-xs font-bold hover:underline"
          >
            نسيت كلمة المرور؟
          </button>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoggingIn ? 'جاري الدخول...' : 'دخول'}
          </button>
        </div>

        <p className="text-center text-slate-500 text-sm">
          ليس لديك حساب؟ {' '}
          <button onClick={() => navigate('/signup')} className="text-blue-500 font-bold hover:underline">إنشاء حساب جديد</button>
        </p>
      </motion.div>
    </div>
  );
};

const SignupScreen = ({ onSignup, showToast }: { onSignup: () => void, showToast: (m: string, t: any) => void }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [regNo, setRegNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !phone || !password) return showToast('يرجى إكمال البيانات الأساسية', 'error');
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password, regNo })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message, 'success');
        navigate('/login');
      } else {
        showToast(data.error, 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">إنشاء حساب جديد</h2>
          <p className="text-slate-400 text-sm">انضم إلى مجتمع المحامين الرقمي</p>
        </div>

        <div className="space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="الاسم الكامل" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-right outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="رقم الهاتف" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-right outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="كلمة المرور" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-right outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={regNo} onChange={e => setRegNo(e.target.value)} type="text" placeholder="رقم القيد بالنقابة (اختياري)" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-right outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <button 
          onClick={handleSignup}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'جاري الإرسال...' : 'إنشاء الحساب'}
        </button>

        <p className="text-center text-slate-500 text-sm">
          لديك حساب بالفعل؟ {' '}
          <button onClick={() => navigate('/login')} className="text-blue-500 font-bold hover:underline">تسجيل الدخول</button>
        </p>
      </motion.div>
    </div>
  );
};

const AdminDashboard = ({ data, updateData, onBack, showToast, requestConfirm }: { data: any, updateData: any, onBack: () => void, showToast: any, requestConfirm: any }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'resets' | 'all' | 'notify' | 'settings' | 'events' | 'sessions' | 'stats' | 'data'>('pending');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyDesc, setNotifyDesc] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null); // null means all
  const [isSending, setIsSending] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  const [geminiKey, setGeminiKey] = useState(data.geminiApiKey || '');
  const [supabaseUrl, setSupabaseUrl] = useState(data.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(data.supabaseKey || '');

  const saveGeminiKey = async () => {
    await updateData({ geminiApiKey: geminiKey });
    showToast('تم حفظ مفتاح الذكاء الاصطناعي بنجاح', 'success');
  };

  const saveSupabaseConfig = async () => {
    await updateData({ 
      supabaseUrl: supabaseUrl || "https://ayxmuvfbhleijlynsdbv.supabase.co", 
      supabaseKey: supabaseKey || "sb_publishable_83xDiBAKDNrlH2rm1wIiSw_qY2-zKKy" 
    });
    showToast('تم تحديث إعدادات السحابة بنجاح', 'success');
    setTimeout(() => window.location.reload(), 1000);
  };

  const exportData = () => {
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `lawyer_app_backup_${new Date().toISOString().split('T')[0]}.json`);
      linkElement.click();
      showToast('تم تصدير نسخة احتياطية بنجاح', 'success');
    } catch (error) {
      showToast('خطأ أثناء تصدير البيانات', 'error');
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        requestConfirm('تأكيد الاستيراد', 'سيتم استبدال كافة البيانات الحالية. هل أنت متأكد؟', async () => {
          await updateData(importedData);
          window.location.reload();
        });
      } catch (error) {
        showToast('خطأ: ملف غير صالح', 'error');
      }
    };
    reader.readAsText(file);
  };

  const approveUser = async (phone: string) => {
    const updatedUsers = data.users.map((u: any) => u.phone === phone ? { ...u, status: 'approved' } : u);
    await updateData({ users: updatedUsers });
    showToast('تمت الموافقة على المستخدم', 'success');
  };

  const deleteUser = async (phone: string) => {
    requestConfirm('حذف مستخدم', 'هل أنت متأكد؟', async () => {
      const updatedUsers = data.users.filter((u: any) => u.phone !== phone);
      await updateData({ users: updatedUsers });
      showToast('تم حذف المستخدم', 'success');
    });
  };

  const updateUser = async (phone: string, updates: any) => {
    const updatedUsers = data.users.map((u: any) => u.phone === phone ? { ...u, ...updates } : u);
    await updateData({ users: updatedUsers });
    showToast('تم تحديث بيانات المستخدم', 'success');
    setEditingUser(null);
  };

  const handleReset = async (phone: string) => {
    const user = data.users.find((u: any) => u.phone === phone);
    const updatedResets = data.resetRequests.filter((r: any) => r.phone !== phone);
    
    if (user) {
      // إرسال إشعار للمستخدم بكلمة مروره
      const notification = { 
        id: Date.now().toString(), 
        title: 'استعادة كلمة المرور', 
        desc: `تمت مراجعة طلبك. كلمة المرور الخاصة بك هي: ${user.password}`, 
        timestamp: new Date().toISOString(), 
        read: false 
      };
      const updatedUsers = data.users.map((u: any) => {
        if (u.phone === phone) {
          return { ...u, notifications: [notification, ...(u.notifications || [])] };
        }
        return u;
      });
      await updateData({ resetRequests: updatedResets, users: updatedUsers });
    } else {
      await updateData({ resetRequests: updatedResets });
    }
    showToast('تم إرسال كلمة المرور للمستخدم بنجاح', 'success');
  };

  const sendNotification = async () => {
    if (!notificationMessage) return showToast('يرجى كتابة رسالة', 'error');
    setIsSending(true);
    try {
      const notification = { id: Date.now().toString(), title: 'إشعار من الإدارة', desc: notificationMessage, timestamp: new Date().toISOString(), read: false };
      const updatedUsers = data.users.map((u: any) => {
        const userNotifs = u.notifications || [];
        return { ...u, notifications: [notification, ...userNotifs] };
      });
      await updateData({ users: updatedUsers });
      showToast('تم إرسال الإشعار للجميع بنجاح', 'success');
      setNotificationMessage('');
    } catch (e) {
      showToast('خطأ في الإرسال', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const pendingUsers = (data.users || []).filter((u:any) => u.status === 'pending');
  const filteredUsers = (data.users || []).filter((u:any) => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.phone?.includes(searchQuery)
  );

  const stats = {
    total: (data.users || []).length,
    pending: pendingUsers.length,
    approved: (data.users || []).filter((u:any) => u.status === 'approved').length,
    resets: (data.resetRequests || []).length
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">لوحة تحكم المسؤول</h2>
            <p className="text-[10px] text-slate-400">إدارة النظام والمستخدمين</p>
          </div>
        </div>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight /></button>
      </div>

      {/* Stats Overview */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border-b">
        <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
          <p className="text-[10px] text-blue-600 font-bold">إجمالي المستخدمين</p>
          <p className="text-xl font-black text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100">
          <p className="text-[10px] text-yellow-600 font-bold">طلبات معلقة</p>
          <p className="text-xl font-black text-yellow-900">{stats.pending}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-2xl border border-green-100">
          <p className="text-[10px] text-green-600 font-bold">حسابات نشطة</p>
          <p className="text-xl font-black text-green-900">{stats.approved}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
          <p className="text-[10px] text-red-600 font-bold">طلبات استعادة</p>
          <p className="text-xl font-black text-red-900">{stats.resets}</p>
        </div>
      </div>

      <div className="flex border-b bg-white overflow-x-auto sticky top-0 z-10">
        <button onClick={() => setActiveTab('pending')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          طلبات الانضمام ({pendingUsers.length})
        </button>
        <button onClick={() => setActiveTab('resets')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'resets' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          نسيان كلمة السر ({data.resetRequests.length})
        </button>
        <button onClick={() => setActiveTab('all')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          كل المستخدمين
        </button>
        <button onClick={() => setActiveTab('events')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'events' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          سجل الأحداث
        </button>
        <button onClick={() => setActiveTab('sessions')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'sessions' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          الجلسات النشطة
        </button>
        <button onClick={() => setActiveTab('stats')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          إحصائيات النظام
        </button>
        <button onClick={() => setActiveTab('data')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'data' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          مستعرض البيانات
        </button>
        <button onClick={() => setActiveTab('notify')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'notify' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          إرسال إشعارات
        </button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          الإعدادات والنسخ
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {(!data.supabaseKey || !data.supabaseKey.startsWith('eyJ')) && (
              <div className="bg-emerald-50 p-8 rounded-3xl border-2 border-emerald-200 shadow-xl space-y-6 mb-8">
                <div className="flex items-center gap-4 text-emerald-700">
                  <Globe className="w-10 h-10" />
                  <div>
                    <h3 className="text-2xl font-bold">خطوة أخيرة: ربط قاعدة البيانات</h3>
                    <p className="text-sm opacity-80">ضع الكود الثاني (Anon Key) هنا لتعمل المزامنة</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-emerald-900">رابط السيرفر (URL)</label>
                    <input type="text" value={supabaseUrl} readOnly className="w-full bg-white border border-emerald-200 rounded-2xl p-4 text-sm outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-emerald-900">كود الربط (Anon Key) - الكود الطويل</label>
                    <input type="password" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} placeholder="انسخ الكود الطويل الذي يبدأ بـ eyJ وضعه هنا..." className="w-full bg-white border border-emerald-400 rounded-2xl p-4 text-sm outline-none focus:ring-4 focus:ring-emerald-200" />
                  </div>
                  <button onClick={saveSupabaseConfig} className="w-full bg-emerald-600 text-white py-5 rounded-2xl text-xl font-black shadow-2xl hover:bg-emerald-700 transition-all cursor-pointer animate-bounce">تفعيل الربط وحفظ البيانات الآن</button>
                </div>
              </div>
            )}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-slate-900">إعدادات الذكاء الاصطناعي</h3>
              </div>
              <div className="flex gap-2">
                <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="أدخل Gemini API Key هنا..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={saveGeminiKey} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors">حفظ</button>
              </div>
              <button 
                onClick={() => {
                  setGeminiKey("AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q");
                  updateData({ geminiApiKey: "AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q" });
                  showToast('تم استعادة مفتاح الذكاء الاصطناعي الافتراضي', 'success');
                }}
                className="text-blue-600 text-[10px] font-bold hover:underline"
              >
                استعادة المفتاح الافتراضي (الموصى به)
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <Download className="w-5 h-5" />
                <h3 className="font-bold text-slate-900">النسخ الاحتياطي والمزامنة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                  <h4 className="font-bold text-blue-900 text-sm">تصدير البيانات</h4>
                  <button onClick={exportData} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-colors">تصدير الآن (JSON)</button>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">استيراد البيانات</h4>
                  <label className="block w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-xs font-bold text-center cursor-pointer hover:bg-slate-50 transition-colors">اختيار ملف واستيراد<input type="file" accept=".json" onChange={importData} className="hidden" /></label>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-red-900">منطقة الخطر</h3>
              </div>
              <button onClick={() => requestConfirm('حذف شامل', 'هل أنت متأكد من حذف كافة بيانات النظام؟ لا يمكن التراجع عن هذا الإجراء.', () => { localStorage.removeItem('lawyer_app_db'); window.location.reload(); })} className="bg-red-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-red-700">مسح كافة البيانات</button>
            </div>
          </motion.div>
        )}

        {activeTab === 'notify' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Send className="w-5 h-5" />
              <h3 className="font-bold text-slate-900">إرسال إشعار جماعي</h3>
            </div>
            <textarea value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} placeholder="اكتب رسالة الإشعار هنا..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"></textarea>
            <button onClick={sendNotification} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors w-full">إرسال الإشعار للجميع</button>
          </motion.div>
        )}

        {activeTab === 'pending' && (
          pendingUsers.length > 0 ? pendingUsers.map(u => (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={u.phone} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
              <div className="text-right">
                <p className="font-bold text-slate-900">{u.name}</p>
                <p className="text-xs text-slate-500">الهاتف: {u.phone}</p>
                <p className="text-xs text-blue-600">رقم القيد: {u.regNo}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveUser(u.phone)} className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-bold shadow-sm">موافقة</button>
                <button onClick={() => deleteUser(u.phone)} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-[10px] font-bold border border-red-100">حذف</button>
              </div>
            </motion.div>
          )) : <div className="text-center py-12 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد طلبات معلقة</p>
          </div>
        )}

        {activeTab === 'resets' && (
          data.resetRequests.length > 0 ? data.resetRequests.map(r => (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={r.phone} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
              <div className="text-right">
                <p className="font-bold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">{r.phone}</p>
                <p className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString('ar-EG')}</p>
              </div>
              <button onClick={() => handleReset(r.phone)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">إرسال كلمة المرور</button>
            </motion.div>
          )) : <div className="text-center py-12 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد طلبات استعادة</p>
          </div>
        )}

        {activeTab === 'sessions' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">الجلسات النشطة حالياً</h3>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                {(data.activeSessions || []).length} متصل
              </span>
            </div>
            <div className="grid gap-3">
              {(data.activeSessions || []).length > 0 ? (data.activeSessions || []).map((session: any, index: number) => (
                <div key={index} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{session.userName}</p>
                      <p className="text-xs text-slate-500">الهاتف: {session.phone}</p>
                      <p className="text-[10px] text-slate-400">وقت الدخول: {new Date(session.loginTime).toLocaleString('ar-EG')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      requestConfirm('تسجيل خروج إجباري', `هل أنت متأكد من طرد المستخدم ${session.userName}؟`, async () => {
                        const updatedSessions = data.activeSessions.filter((s: any) => s.phone !== session.phone);
                        await updateData({ activeSessions: updatedSessions });
                        showToast('تم طرد المستخدم بنجاح', 'success');
                      });
                    }}
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> طرد
                  </button>
                </div>
              )) : (
                <div className="text-center py-12 text-slate-400 bg-white rounded-xl border">
                  <UserX className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا يوجد مستخدمين متصلين حالياً</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800">إحصائيات النظام التفصيلية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
                <div className="flex items-center gap-3 text-blue-600">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-bold">القضايا</span>
                </div>
                <p className="text-3xl font-black text-slate-900">{(data.cases || []).length}</p>
                <p className="text-xs text-slate-500">إجمالي القضايا المسجلة</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
                <div className="flex items-center gap-3 text-emerald-600">
                  <Users className="w-5 h-5" />
                  <span className="font-bold">الموكلين</span>
                </div>
                <p className="text-3xl font-black text-slate-900">{(data.clients || []).length}</p>
                <p className="text-xs text-slate-500">إجمالي الموكلين والخصوم</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
                <div className="flex items-center gap-3 text-purple-600">
                  <CalendarIcon className="w-5 h-5" />
                  <span className="font-bold">الجلسات</span>
                </div>
                <p className="text-3xl font-black text-slate-900">{(data.sessions || []).length}</p>
                <p className="text-xs text-slate-500">إجمالي الجلسات المجدولة</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'data' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">مستعرض البيانات الخام</h3>
              <button 
                onClick={() => {
                  const dataStr = JSON.stringify(data, null, 2);
                  navigator.clipboard.writeText(dataStr);
                  showToast('تم نسخ قاعدة البيانات كاملة إلى الحافظة', 'success');
                }}
                className="text-blue-600 text-xs font-bold hover:underline"
              >
                نسخ الكل كـ JSON
              </button>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-500 overflow-x-auto max-h-[60vh] overflow-y-auto ltr whitespace-pre">
              {JSON.stringify(data, null, 2)}
            </div>
          </motion.div>
        )}

        {activeTab === 'all' && (
          <>
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="ابحث بالاسم أو رقم الهاتف..." 
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-10 pl-4 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredUsers.length > 0 ? filteredUsers.map(u => (
              <div key={u.phone} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{u.name}</p>
                    {u.role === 'admin' && <span className="bg-purple-100 text-purple-700 text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase">مسؤول</span>}
                  </div>
                  <p className="text-xs text-slate-500">الهاتف: {u.phone}</p>
                  <p className="text-xs text-blue-600 font-bold">رقم القيد: {u.regNo}</p>
                  <p className="text-xs text-slate-500">كلمة المرور: <span className="font-mono font-bold text-blue-600">{u.password}</span></p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold ${
                    u.status === 'approved' ? 'bg-green-100 text-green-700' : 
                    u.status === 'suspended' ? 'bg-red-100 text-red-700' : 
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {u.status === 'approved' ? 'نشط' : u.status === 'suspended' ? 'محظور' : 'معلق'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingUser(u)} className="text-slate-600 text-[10px] font-bold hover:underline flex items-center gap-1">
                      <PenTool className="w-3 h-3" /> إدارة
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>لا يوجد مستخدمون مطابقون للبحث</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Management Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <h3 className="font-bold">إدارة بيانات المستخدم</h3>
                <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">الاسم الكامل</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingUser.name}
                      onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">رقم القيد</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingUser.regNo}
                      onChange={e => setEditingUser({...editingUser, regNo: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الدور</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                        value={editingUser.role}
                        onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                      >
                        <option value="user">مستخدم</option>
                        <option value="admin">مسؤول</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الحالة</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                        value={editingUser.status}
                        onChange={e => setEditingUser({...editingUser, status: e.target.value})}
                      >
                        <option value="approved">نشط</option>
                        <option value="pending">معلق</option>
                        <option value="suspended">محظور</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => updateUser(editingUser.phone, { 
                      name: editingUser.name, 
                      regNo: editingUser.regNo, 
                      role: editingUser.role, 
                      status: editingUser.status 
                    })}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 cursor-pointer"
                  >
                    حفظ التغييرات
                  </button>
                  <button 
                    onClick={() => setEditingUser(null)}
                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileScreen = ({ user, onLogout, onBack, showToast }: { user: any, onLogout: () => void, onBack: () => void, showToast: (m: string, t: any) => void }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword) return showToast('يرجى إدخال كلمة المرور القديمة', 'error');
    if (!newPassword) return showToast('يرجى إدخال كلمة المرور الجديدة', 'error');
    if (newPassword !== confirmPassword) return showToast('كلمة المرور الجديدة غير متطابقة', 'error');
    
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, oldPassword, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message, 'success');
        setIsChangingPassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error, 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header title="الملف الشخصي" onBack={onBack} />
      <div className="p-6 space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'محامي'}</h2>
          <p className="text-gray-500">{user?.role === 'admin' ? 'مدير النظام' : 'محامي مقيد'}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">رقم الهاتف</span>
              <span className="font-bold text-gray-900">{user?.phone}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">رقم القيد</span>
              <span className="font-bold text-gray-900">{user?.regNo || 'غير متوفر'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">حالة الحساب</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">نشط</span>
            </div>

            {!isChangingPassword ? (
              <button 
                onClick={() => setIsChangingPassword(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                تغيير كلمة المرور
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <input 
                  type="password" 
                  placeholder="كلمة المرور القديمة" 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                />
                <input 
                  type="password" 
                  placeholder="كلمة المرور الجديدة" 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <input 
                  type="password" 
                  placeholder="تأكيد كلمة المرور الجديدة" 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  
  // --- Centralized Data State ---
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const sessionStart = localStorage.getItem('sessionStart');
    if (sessionStart) {
      const fiveDays = 5 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(sessionStart) > fiveDays) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionStart');
        return false;
      }
    }
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [user, setUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
      localStorage.removeItem('user');
      return null;
    }
  });

  // Check session expiry periodically
  useEffect(() => {
    const checkExpiry = () => {
      const sessionStart = localStorage.getItem('sessionStart');
      if (sessionStart && isLoggedIn) {
        const fiveDays = 5 * 24 * 60 * 60 * 1000;
        if (Date.now() - parseInt(sessionStart) > fiveDays) {
          logout();
        }
      }
    };
    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isLoggedIn]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  
  // Load data from Supabase on mount
  useEffect(() => {
    const initApp = async () => {
      if (!navigator.onLine) {
        setIsLoading(false);
        return; // OfflineOverlay will handle this
      }
      setIsLoading(true);
      try {
        const cloudData = await loadFromSupabase();
        setData(cloudData);
      } catch (e) {
        console.error("Initialization failed:", e);
        // لا نقوم بالتحميل من التخزين المحلي كبديل عند الفشل
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const hasCloudDB = !!data?.supabaseKey && (data.supabaseKey.startsWith('eyJ') || data.supabaseKey.startsWith('sb_publishable'));

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: () => {
      onConfirm();
      setConfirmModal(null);
    }});
  };

  // Helper to update and sync data
  const updateData = async (updates: any) => {
    const newData = { ...data, ...updates };
    setData(newData);
    saveLocalDB(newData);
    await syncToSupabase(newData);
  };

  const logEvent = async (type: string, message: string, severity: 'normal' | 'warning' | 'critical' = 'normal') => {
    const event = {
      id: Date.now().toString(),
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      userName: user?.name || 'غير معروف',
      userPhone: user?.phone || 'غير معروف'
    };
    const updatedEvents = [event, ...(data.systemEvents || [])].slice(0, 100); // Keep last 100 events
    await updateData({ systemEvents: updatedEvents });
  };

  if (!isOnline) {
    return <OfflineOverlay />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-bold">جاري مزامنة البيانات السحابية...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">فشل تحميل البيانات</h1>
        <p className="text-gray-500 mb-6">لا يمكن تشغيل النظام بدون الوصول إلى البيانات السحابية.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const handleLogin = async (userData: any) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('sessionStart', Date.now().toString());

    // تحديث الجلسات النشطة
    const session = {
      phone: userData.phone,
      userName: userData.name,
      loginTime: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    const otherSessions = (data.activeSessions || []).filter((s: any) => s.phone !== userData.phone);
    const updatedSessions = [session, ...otherSessions];
    
    // تسجيل الحدث وتحديث الجلسات
    const event = {
      id: Date.now().toString(),
      type: 'دخول',
      message: `قام المستخدم ${userData.name} بتسجيل الدخول`,
      severity: 'normal',
      timestamp: new Date().toISOString(),
      userName: userData.name,
      userPhone: userData.phone
    };
    
    await updateData({ 
      activeSessions: updatedSessions,
      systemEvents: [event, ...(data.systemEvents || [])].slice(0, 100)
    });

    if (userData.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/home');
    }
  };

  const logout = async () => {
    if (user) {
      const updatedSessions = (data.activeSessions || []).filter((s: any) => s.phone !== user.phone);
      const event = {
        id: Date.now().toString(),
        type: 'خروج',
        message: `قام المستخدم ${user.name} بتسجيل الخروج`,
        severity: 'normal',
        timestamp: new Date().toISOString(),
        userName: user.name,
        userPhone: user.phone
      };
      await updateData({ 
        activeSessions: updatedSessions,
        systemEvents: [event, ...(data.systemEvents || [])].slice(0, 100)
      });
    }

    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionStart');
    navigate('/login');
    showToast('تم تسجيل الخروج بنجاح', 'success');
  };

  // --- Wrapper Functions for Screens ---
  const addCase = async (c: any) => {
    await updateData({ cases: [...(data.cases || []), { ...c, id: Date.now().toString() }] });
    logEvent('إضافة قضية', `تم إضافة قضية جديدة: ${c.title}`);
  };
  const deleteCase = (id: string) => requestConfirm('حذف قضية', 'هل أنت متأكد؟', async () => {
    const c = data.cases.find((x: any) => x.id === id);
    await updateData({ cases: data.cases.filter((c: any) => c.id !== id) });
    logEvent('حذف قضية', `تم حذف قضية: ${c?.title || id}`, 'warning');
  });
  
  const addClient = async (c: any) => {
    await updateData({ clients: [...(data.clients || []), { ...c, id: Date.now().toString() }] });
    logEvent('إضافة موكل', `تم إضافة موكل جديد: ${c.name}`);
  };
  const deleteClient = (id: string) => requestConfirm('حذف', 'هل أنت متأكد؟', async () => {
    const c = data.clients.find((x: any) => x.id === id);
    await updateData({ clients: data.clients.filter((c: any) => c.id !== id) });
    logEvent('حذف موكل', `تم حذف موكل: ${c?.name || id}`, 'warning');
  });

  const addReminder = async (r: any) => {
    await updateData({ reminders: [{ ...r, id: Date.now().toString() }, ...(data.reminders || [])] });
    logEvent('إضافة تذكير', `تم إضافة تذكير: ${r.title}`);
  };
  const deleteReminder = (id: string) => requestConfirm('حذف', 'هل أنت متأكد؟', async () => {
    const r = data.reminders.find((x: any) => x.id === id);
    await updateData({ reminders: data.reminders.filter((r: any) => r.id !== id) });
    logEvent('حذف تذكير', `تم حذف تذكير: ${r?.title || id}`, 'normal');
  });

  const deleteSession = (id: string) => requestConfirm('حذف', 'هل أنت متأكد؟', async () => {
    const s = data.sessions.find((x: any) => x.id === id);
    await updateData({ sessions: data.sessions.filter((s: any) => s.id !== id) });
    logEvent('حذف جلسة', `تم حذف جلسة: ${s?.caseTitle || id}`, 'normal');
  });
  
  const toggleTask = async (id: string) => {
    const t = data.tasks.find((x: any) => x.id === id);
    await updateData({ tasks: data.tasks.map((t: any) => t.id === id ? { ...t, completed: !t.completed } : t) });
    logEvent('تحديث مهمة', `تم تغيير حالة المهمة: ${t?.title || id}`);
  };
  const deleteTask = (id: string) => requestConfirm('حذف', 'هل أنت متأكد؟', async () => {
    const t = data.tasks.find((x: any) => x.id === id);
    await updateData({ tasks: data.tasks.filter((t: any) => t.id !== id) });
    logEvent('حذف مهمة', `تم حذف مهمة: ${t?.title || id}`, 'normal');
  });

  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-right" dir="rtl">
      {!hasCloudDB && !isLandingPage && !isAuthPage && (
        <div className="bg-red-600 text-white text-[10px] py-1.5 px-4 text-center font-bold sticky top-0 z-[60] animate-pulse">
          تحذير: البيانات مخزنة محلياً فقط. اربط قاعدة البيانات السحابية (Supabase) من الإعدادات لضمان المزامنة والأمان.
        </div>
      )}
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-2xl relative flex flex-col">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>

        <ConfirmModal 
          isOpen={!!confirmModal} 
          title={confirmModal?.title || ''} 
          message={confirmModal?.message || ''} 
          onConfirm={confirmModal?.onConfirm || (() => {})} 
          onCancel={() => setConfirmModal(null)} 
        />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginScreen onLogin={handleLogin} showToast={showToast} />} />
            <Route path="/signup" element={<SignupScreen onSignup={() => navigate('/login')} showToast={showToast} />} />
            
            <Route path="/home" element={isLoggedIn ? <HomeScreen onMenu={() => setIsSidebarOpen(true)} notificationsCount={(data.users.find((u:any)=>u.phone===user?.phone)?.notifications?.length || 0) + (data.reminders?.length || 0)} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={isLoggedIn && user?.role === 'admin' ? <AdminDashboard data={data} updateData={updateData} onBack={logout} showToast={showToast} requestConfirm={requestConfirm} /> : <Navigate to="/login" />} />
            
            <Route path="/my-office" element={isLoggedIn ? <MyOfficeScreen onBack={() => navigate(-1)} cases={data.cases || []} clients={data.clients || []} tasks={data.tasks || []} sessions={data.sessions || []} reminders={data.reminders || []} /> : <Navigate to="/login" />} />
            <Route path="/community" element={isLoggedIn ? <CommunityScreen onBack={() => navigate(-1)} /> : <Navigate to="/login" />} />
            <Route path="/library" element={isLoggedIn ? <LibraryScreen onBack={() => navigate(-1)} requestConfirm={requestConfirm} /> : <Navigate to="/login" />} />
            <Route path="/bulletin" element={isLoggedIn ? <BulletinScreen onBack={() => navigate(-1)} /> : <Navigate to="/login" />} />
            <Route path="/gov-platforms" element={isLoggedIn ? <GovPlatformsScreen onBack={() => navigate(-1)} /> : <Navigate to="/login" />} />
            
            <Route path="/cases" element={isLoggedIn ? <CasesScreen onBack={() => navigate(-1)} cases={data.cases || []} onAdd={addCase} onDelete={deleteCase} /> : <Navigate to="/login" />} />
            <Route path="/clients" element={isLoggedIn ? <ClientsScreen onBack={() => navigate(-1)} clients={data.clients || []} onAdd={addClient} onDelete={deleteClient} type="client" /> : <Navigate to="/login" />} />
            <Route path="/opponents" element={isLoggedIn ? <ClientsScreen onBack={() => navigate(-1)} clients={data.clients || []} onAdd={addClient} onDelete={deleteClient} type="opponent" /> : <Navigate to="/login" />} />
            <Route path="/sessions" element={isLoggedIn ? <SessionsScreen onBack={() => navigate(-1)} sessions={data.sessions || []} onDelete={deleteSession} /> : <Navigate to="/login" />} />
            <Route path="/tasks" element={isLoggedIn ? <TasksScreen onBack={() => navigate(-1)} tasks={data.tasks || []} onToggle={toggleTask} onDelete={deleteTask} /> : <Navigate to="/login" />} />
            <Route path="/reminders" element={isLoggedIn ? <RemindersScreen onBack={() => navigate(-1)} reminders={data.reminders || []} onAdd={addReminder} onDelete={deleteReminder} /> : <Navigate to="/login" />} />
            
            <Route path="/notifications" element={isLoggedIn ? <NotificationsScreen onBack={() => navigate(-1)} notifications={data.users.find((u:any)=>u.phone===user?.phone)?.notifications || []} reminders={data.reminders || []} onDelete={async (id) => {
              const updatedUsers = data.users.map((u: any) => u.phone === user.phone ? { ...u, notifications: u.notifications.filter((n: any) => n.id !== id) } : u);
              await updateData({ users: updatedUsers });
              showToast('تم حذف الإشعار', 'success');
            }} /> : <Navigate to="/login" />} />
            
            <Route path="/profile" element={isLoggedIn ? <ProfileScreen user={user} onLogout={logout} onBack={() => navigate(-1)} showToast={showToast} /> : <Navigate to="/login" />} />
            <Route path="/judicial-distribution" element={isLoggedIn ? <JudicialDistributionScreen onBack={() => navigate(-1)} /> : <Navigate to="/login" />} />
            <Route path="/tax-declarations" element={isLoggedIn ? <TaxDeclarationsScreen onBack={() => navigate(-1)} /> : <Navigate to="/login" />} />
            <Route path="/writing" element={isLoggedIn ? <WritingScreen onBack={() => navigate(-1)} showToast={showToast} /> : <Navigate to="/login" />} />
          </Routes>
        </main>

        {isLoggedIn && !isLandingPage && !isAuthPage && <BottomNav />}
      </div>
    </div>
  );
}
