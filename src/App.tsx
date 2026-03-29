/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
	X,
	Fingerprint,
	ChevronDown,
	Facebook,
	Instagram,
	Youtube,
	MessageCircle,
	Music2,
	HelpCircle,
	Lightbulb,
	Bug,
	UserCircle2,
	LogOut,
	Settings,
	CreditCard,
	TrendingUp,
	TrendingDown,
	PieChart,
	Camera,
	History,
	Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link, Navigate, useParams } from 'react-router-dom';
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

// --- Error Boundary for White Screen Protection ---
class ErrorBoundary extends React.Component<React.PropsWithChildren<Record<string, unknown>>, { hasError: boolean }> {
	// ensure props typing includes children so this.props.children is available
	public state: { hasError: boolean };
	constructor(props: React.PropsWithChildren<Record<string, unknown>>) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() { return { hasError: true }; }
	componentDidCatch(error: any, errorInfo: any) {
		console.error("Critical Render Error:", error, errorInfo);
	}
	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white" dir="rtl">
					<div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
						<AlertCircle className="w-12 h-12 text-red-500" />
					</div>
					<h2 className="text-2xl font-bold mb-4">حدث خطأ غير متوقع في النظام</h2>
					<p className="text-slate-400 mb-8 max-w-md leading-relaxed">نعتذر عن هذا العطل الفني. يرجى محاولة إعادة تحميل الصفحة، وإذا استمرت المشكلة قم بتسجيل الخروج والمحاولة مرة أخرى.</p>
					<div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
						<button 
							onClick={() => window.location.reload()} 
							className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
						>
							<Globe className="w-5 h-5" />
							إعادة تحميل الصفحة
						</button>
						<button 
							onClick={() => { localStorage.clear(); window.location.href = '/'; }} 
							className="flex-1 bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-700 transition-all"
						>
							تسجيل الخروج (Reset)
						</button>
					</div>
				</div>
			);
		}
	// cast `this` to any before accessing props so TypeScript doesn't check for `props` on the class type
	return ((this as any).props as any).children;
	}
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// --- Online Status Hook ---
const useOnlineStatus = () => {
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	useEffect(() => {
		const handleStatusChange = () => {
			setIsOnline(navigator.onLine);
		};

		window.addEventListener('online', handleStatusChange);
		window.addEventListener('offline', handleStatusChange);

		return () => {
			window.removeEventListener('online', handleStatusChange);
			window.removeEventListener('offline', handleStatusChange);
		};
	}, []);

	return isOnline;
};

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
		version: 6,
		// last modified timestamp for conflict resolution between local and cloud
		updated_at: new Date().toISOString(),
		users: [
			{ phone: "0123456789", password: "123", name: "مدير النظام", regNo: "000", status: "approved", role: "admin", notifications: [] }
		], 
		cases: [
			{ 
				id: '1', 
				title: 'دعوى صحة توقيع', 
				court: 'محكمة الفيوم الابتدائية', 
				number: '1234/2025', 
				status: 'قيد التداول', 
				date: '2026-04-10',
				clientName: 'أحمد محمد علي',
				fees: { total: 5000, paid: 2000, remaining: 3000 },
				expenses: { total: 500, items: [{ id: 'e1', amount: 500, reason: 'رسوم قيد', date: '2026-03-01' }] },
				documents: []
			},
			{ 
				id: '2', 
				title: 'استئناف مدني', 
				court: 'محكمة استئناف بني سويف', 
				number: '567/2025', 
				status: 'محجوزة للحكم', 
				date: '2026-03-15',
				clientName: 'شركة النيل للمقاولات',
				fees: { total: 10000, paid: 5000, remaining: 5000 },
				expenses: { total: 1200, items: [{ id: 'e2', amount: 1200, reason: 'دمغات ورسوم', date: '2026-03-05' }] },
				documents: []
			},
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
			{ id: '1', caseId: '1', caseTitle: 'دعوى صحة توقيع', court: 'مدني الفيوم', date: '2026-03-10', time: '09:00 ص', demands: 'تقديم أصل الصحيفة', decision: 'التأجيل للاطلاع' },
			{ id: '2', caseId: '2', caseTitle: 'استئناف مدني', court: 'استئناف عالي', date: '2026-03-15', time: '10:30 ص', demands: 'المرافعة', decision: 'حجز للحكم' },
		],
		reminders: [
			{ id: '1', title: 'مراجعة ملف قضية أحمد محمد', time: '10:00' },
			{ id: '2', title: 'سداد اشتراك النقابة', time: '12:00' },
		],
		finance: [
			{ id: 'f1', type: 'income', amount: 2000, reason: 'دفعة أتعاب - قضية 1234', date: '2026-03-01' },
			{ id: 'f2', type: 'expense', amount: 500, reason: 'رسوم محكمة - قضية 1234', date: '2026-03-01' },
		],
		resetRequests: [],
		systemEvents: [], 
		activeSessions: [],
		officeData: {
			name: "مكتب الأستاذ / محمد جمال",
			regNo: "123456",
			address: "الفيوم - شارع المحافظة",
			phone: "0123456789",
			specialty: "قضايا الجنايات والمدني",
			workingHours: "يومياً من 5 م إلى 10 م (عدا الجمعة)",
			bio: "مكتب متخصص في كافة أعمال المحاماة والاستشارات القانونية، خبرة أكثر من 15 عاماً في المحاكم المصرية."
		},
		bailiffs: [
			{ id: '1', title: 'إعلان صحيفة دعوى', status: 'تم التسليم', date: '2026-03-05' },
			{ id: '2', title: 'إعلان حكم تمهيدي', status: 'قيد التنفيذ', date: '2026-03-08' },
			{ id: '3', title: 'إعلان استئناف', status: 'بانتظار الرد', date: '2026-03-09' },
		],
		geminiApiKey: "AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q",
		openRouterApiKey: "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",
		supabaseUrl: "https://ayxmuvfbhleijlynsdbv.supabase.co",
		supabaseKey: "sb_publishable_83xDiBAKDNrlH2rm1wIiSw_qY2-zKKy" 
	};
	localStorage.setItem('lawyer_app_db', JSON.stringify(initialDB));
	return initialDB;
};

const sanitizeDB = (db: any) => {
	if (!db) return db;
	const newDb = { ...db };
  
	if (newDb.users && Array.isArray(newDb.users)) {
		const uniqueUsers = new Map();
		// ترتيب المستخدمين بحيث يكون الأحدث في الأخير، ثم نأخذ الأحدث دائماً
		newDb.users.forEach((u: any) => {
			if (u && u.phone) {
				const phone = String(u.phone).trim();
				// إذا وجدنا تكراراً، السجل الأحدث (الذي يأتي لاحقاً) هو الذي سيعتمد
				uniqueUsers.set(phone, { ...u, phone });
			}
		});
		newDb.users = Array.from(uniqueUsers.values());
	}

	if (!newDb.resetRequests) newDb.resetRequests = [];
	if (!newDb.systemEvents) newDb.systemEvents = [];
  
	return newDb;
};

const saveLocalDB = (db: any) => {
	const sanitized = sanitizeDB(db);
	sanitized.updated_at = new Date().toISOString();
	localStorage.setItem('lawyer_app_db', JSON.stringify(sanitized));
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
		console.warn('Cannot sync: No internet connection. Data is saved locally.');
		return false;
	}
  
	// تطهير البيانات قبل المزامنة لضمان جودة السحابة
	const sanitizedDb = sanitizeDB(newDb);
	const supabase = getSupabase(sanitizedDb);
	if (!supabase) return false;
  
	try {
		const payloadUpdatedAt = sanitizedDb.updated_at || new Date().toISOString();
		const { error } = await supabase
			.from('app_data')
			.upsert({ 
				id: 1, 
				content: sanitizedDb, 
				updated_at: payloadUpdatedAt 
			}, { onConflict: 'id' });
      
		if (error) {
			console.error('Supabase Sync Error Details:', error.message);
			return false;
		} else {
			console.log('✅ Cloud Sync Successful (Sanitized)');
			return true;
		}
	} catch (e) {
		console.error('Supabase Connection Exception:', e);
		return false;
	}
};

const loadFromSupabase = async () => {
	const localDb = getLocalDB();
  
	if (!navigator.onLine) {
		return localDb;
	}

	const supabase = getSupabase(localDb);
  
	if (!supabase) {
		return localDb;
	}
  
	try {
		const { data, error } = await supabase
			.from('app_data')
			.select('content, updated_at')
			.eq('id', 1)
			.single();
    
		if (error) {
			console.error('Supabase fetch error:', error.message);
			return localDb;
		}

		if (data && data.content) {
			// تطهير البيانات القادمة من السحابة قبل استخدامها
			const cloudDb = sanitizeDB(data.content);
      
			// ضمان وجود مفاتيح النظام الأساسية
			if (!cloudDb.geminiApiKey || cloudDb.geminiApiKey.includes("MY_GEMINI")) {
				cloudDb.geminiApiKey = "AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q";
			}
      
			// Compare timestamps to avoid overwriting newer local changes
			const cloudUpdated = data.updated_at ? Date.parse(data.updated_at) : 0;
			const localUpdated = localDb?.updated_at ? Date.parse(localDb.updated_at) : 0;

			if (cloudUpdated > localUpdated) {
				cloudDb.updated_at = data.updated_at || new Date().toISOString();
				saveLocalDB(cloudDb);
				return cloudDb;
			} else if (localUpdated > cloudUpdated) {
				// local is newer -> push local up and keep local
				try {
					await syncToSupabase(localDb);
				} catch (e) {
					console.warn('Background push failed:', e);
				}
				return localDb;
			} else {
				return localDb;
			}
		} else {
			return localDb;
		}
	} catch (e) {
		console.error('Critical Supabase error:', e);
		return localDb;
	}
};

const mockFetch = async (url: string, options: any = {}) => {
	if (!navigator.onLine) {
		throw new Error('No internet connection');
	}

	// Parse body if present, otherwise use an empty object so endpoints don't throw
	const body = options.body ? JSON.parse(options.body) : {};
	// تنظيف البيانات الواردة (Trimming) - guard each field
	if (body && typeof body === 'object') {
		if (body.phone) body.phone = String(body.phone).trim();
		if (body.password) body.password = String(body.password).trim();
		if (body.oldPassword) body.oldPassword = String(body.oldPassword).trim();
		if (body.newPassword) body.newPassword = String(body.newPassword).trim();
	}

	const createResponse = (ok: boolean, status: number, data: any) => ({
		ok,
		status,
		json: async () => data,
		text: async () => JSON.stringify(data)
	});

	// Always fetch fresh from cloud for every API call to ensure we work with latest data
	let currentDb = await loadFromSupabase();

	if (url === '/api/auth/signup') {
		const trimmedPhone = body.phone;
		if (currentDb.users.find((u: any) => u.phone.trim() === trimmedPhone)) {
			return createResponse(false, 400, { error: "خطأ: رقم الهاتف هذا مسجل مسبقاً" });
		}
		const newUser = { ...body, phone: trimmedPhone, status: 'pending', role: 'user', notifications: [] };
		currentDb.users.push(newUser);
		saveLocalDB(currentDb);
		await syncToSupabase(currentDb);
		return createResponse(true, 200, { message: "تم إنشاء حساب جديد و سوف تتم الموافقة على الحساب في اقرب وقت من قبل نقابة المحامين للفيوم" });
	}

	if (url === '/api/auth/login') {
		const trimmedPhone = String(body.phone || "").trim();
		const trimmedPassword = String(body.password || "").trim();
    
		// البحث عن المستخدم في القائمة النظيفة (التي لا تحتوي على تكرار)
		const users = Array.isArray(currentDb?.users) ? currentDb.users : [];
		const user = users.find((u: any) => String(u.phone || "").trim() === trimmedPhone);
    
		if (user && String(user.password || "").trim() === trimmedPassword) {
			if (user.status === 'pending') return createResponse(false, 403, { error: "حسابك قيد المراجعة حالياً" });
			if (user.status === 'suspended') return createResponse(false, 403, { error: "هذا الحساب محظور قم بالتواصل مع ادارة الحاسب الالي بنقابة المحامين بالفيوم" });
			return createResponse(true, 200, { user });
		}
		return createResponse(false, 401, { error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
	}

	if (url === '/api/auth/forgot-password') {
		const trimmedPhone = body.phone;
		const user = currentDb.users.find((u: any) => u.phone.trim() === trimmedPhone);
		if (!user) return createResponse(false, 404, { error: "خطأ: رقم الهاتف غير مسجل لدينا" });
    
		currentDb.resetRequests.push({ 
			phone: trimmedPhone, 
			name: user.name, 
			timestamp: new Date().toISOString(), 
			status: 'pending' 
		});
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
		const trimmedPhone = body.phone;
		const trimmedOldPassword = body.oldPassword;
		const trimmedNewPassword = body.newPassword;
    
		const user = currentDb.users.find((u: any) => u.phone.trim() === trimmedPhone);
		if (user) {
			if (user.password.trim() !== trimmedOldPassword) {
				return createResponse(false, 400, { error: "كلمة المرور القديمة غير صحيحة" });
			}
			user.password = trimmedNewPassword;
			// الحفظ المباشر في السحابة لضمان المزامنة الفورية قبل أي عملية دخول أخرى
			saveLocalDB(currentDb);
			await syncToSupabase(currentDb);
			return createResponse(true, 200, { message: "تم تغيير كلمة المرور بنجاح ومزامنتها سحابياً" });
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
	clientName?: string;
	opponentName?: string;
	fees?: {
		total: number;
		paid: number;
		remaining: number;
	};
	expenses?: {
		total: number;
		items: { id: string, amount: number, reason: string, date: string }[];
	};
	documents?: { id: string, name: string, date: string, type: string, url: string }[];
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
	caseId?: string;
	caseTitle: string;
	court: string;
	date: string;
	time: string;
	decision?: string;
	demands?: string;
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
			"fixed top-0 left-1/2 z-100 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-[90%]",
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
			<div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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

// Minimal App component to ensure module exports and allow progressive restoration
export default function App() {
	const [db, setDb] = useState<any>(() => getLocalDB());
	const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

	useEffect(() => {
		const onOnline = () => setIsOnline(true);
		const onOffline = () => setIsOnline(false);
		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		return () => {
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
		};
	}, []);

	useEffect(() => {
		// try to sync when online
		if (isOnline) {
			(async () => {
				try {
					const refreshed = await loadFromSupabase();
					setDb(refreshed || getLocalDB());
				} catch (e) {
					console.warn('Background sync failed', e);
				}
			})();
		}
	}, [isOnline]);

	return (
		<div className="min-h-screen bg-white text-black" dir="rtl">
			<div className="max-w-4xl mx-auto p-6">
				<h1 className="text-2xl font-bold mb-4">نظام إدارة مكتب المحاماة</h1>
				<p className="text-sm text-gray-600 mb-4">الوضع: {isOnline ? 'متصل' : 'غير متصل'}</p>
				<pre className="text-xs bg-gray-100 p-4 rounded">{JSON.stringify(db, null, 2)}</pre>
			</div>
		</div>
	);
}