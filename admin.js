/* ============================================
   KoYun Coffee V3.0 - Admin Dashboard
   ULTIMATE Complete with Analytics, Staff, Expenses
   PRODUCTION VERSION - FIXED INFINITE RELOAD BUG
   ============================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    query, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    addDoc, 
    deleteDoc, 
    onSnapshot, 
    orderBy, 
    where, 
    Timestamp,
    setDoc  // ✅ ADDED FOR STAFF CREATION
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    updatePassword 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ============================================
// Firebase Configuration
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyDOUb7G6NBe2IKTyLYKFYyf7e0uiNoDoBs",
    authDomain: "koyun-id.firebaseapp.com",
    projectId: "koyun-id",
    storageBucket: "koyun-id.firebasestorage.app",
    messagingSenderId: "672101013741",
    appId: "1:672101013741:web:64b367d77ec8df8ecf14e4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log('✅ Firebase initialized - Admin Dashboard V3.0 FIXED');

// ============================================
// Cloudinary Configuration
// ============================================

const CLOUDINARY_CLOUD_NAME = 'promohub';
const CLOUDINARY_UPLOAD_PRESET = 'promohub';

// ============================================
// DOM Elements
// ============================================

const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('pageTitle');

// User Info
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');

// Dashboard Stats
const dashPending = document.getElementById('dashPending');
const dashProcessing = document.getElementById('dashProcessing');
const dashCompleted = document.getElementById('dashCompleted');
const dashRevenue = document.getElementById('dashRevenue');

// Orders Stats
const statPending = document.getElementById('statPending');
const statProcessing = document.getElementById('statProcessing');
const statCompleted = document.getElementById('statCompleted');
const statRevenue = document.getElementById('statRevenue');
const pendingBadge = document.getElementById('pendingBadge');

// Filters
const filterTabs = document.querySelectorAll('.tab-btn');
const dateFilter = document.getElementById('dateFilter');
const customDateStart = document.getElementById('customDateStart');
const customDateEnd = document.getElementById('customDateEnd');
const countAll = document.getElementById('countAll');
const countPending = document.getElementById('countPending');
const countProcessing = document.getElementById('countProcessing');
const countCompleted = document.getElementById('countCompleted');

// Grids
const ordersGrid = document.getElementById('ordersGrid');
const productsGrid = document.getElementById('productsGrid');
const recentOrdersList = document.getElementById('recentOrdersList');
const staffGrid = document.getElementById('staffGrid');
const expensesGrid = document.getElementById('expensesGrid');

// Modals
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const productModal = document.getElementById('productModal');
const staffModal = document.getElementById('staffModal');
const expenseModal = document.getElementById('expenseModal');

// Product Form
const addProductBtn = document.getElementById('addProductBtn');
const productForm = document.getElementById('productForm');
const productModalTitle = document.getElementById('productModalTitle');
const saveProductBtn = document.getElementById('saveProductBtn');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const productImagePreview = document.getElementById('productImagePreview');

// Staff Form
const addStaffBtn = document.getElementById('addStaffBtn');
const staffForm = document.getElementById('staffForm');
const saveStaffBtn = document.getElementById('saveStaffBtn');

// Expense Form
const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseForm = document.getElementById('expenseForm');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');

// Reports
const reportPeriod = document.getElementById('reportPeriod');
const exportExcel = document.getElementById('exportExcel');
const exportCSV = document.getElementById('exportCSV');
const exportPDF = document.getElementById('exportPDF');

// Analytics
const analyticsChart = document.getElementById('analyticsChart');
const topProductsList = document.getElementById('topProductsList');
const profitLossCard = document.getElementById('profitLossCard');

// Time Display
const currentTime = document.getElementById('currentTime');

// ============================================
// State Management
// ============================================

let state = {
    user: null,
    userRole: null,
    orders: [],
    products: [],
    staff: [],
    expenses: [],
    currentFilter: 'all',
    currentDateFilter: 'all',
    customDateRange: {
        start: null,
        end: null
    },
    currentSection: 'dashboard',
    unsubscribeOrders: null,
    unsubscribeProducts: null,
    unsubscribeStaff: null,
    unsubscribeExpenses: null,
    editingProductId: null,
    editingStaffId: null,
    editingExpenseId: null,
    cloudinaryWidget: null,
    uploadedImageUrl: ''
};

// ============================================
// Authentication & Role Check
// ============================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log('❌ No user authenticated');
        window.location.href = '/admin.html';
        return;
    }

    console.log('✅ User authenticated:', user.email);
    state.user = user;
    
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            console.error('❌ User document not found');
            showToast('User data not found. Contact admin.', 'error');
            setTimeout(() => {
                signOut(auth);
                window.location.href = '/admin.html';
            }, 2000);
            return;
        }
        
        const userData = userDocSnap.data();
        state.userRole = userData.role || 'kasir';
        
        console.log('👤 User role:', state.userRole);
        
        if (state.userRole !== 'admin') {
            console.warn('⚠️ Access denied: Not an admin');
            showToast('Access denied. Admin only.', 'error');
            setTimeout(() => {
                window.location.href = '/kasir.html';
            }, 1500);
            return;
        }
        
        if (userData.active === false) {
            console.warn('⚠️ Account disabled');
            showToast('Account is disabled.', 'error');
            setTimeout(() => {
                signOut(auth);
                window.location.href = '/admin.html';
            }, 2000);
            return;
        }
        
        console.log('✅ Admin access granted');
        
        userName.textContent = userData.name || user.email.split('@')[0];
        userRole.textContent = 'Administrator';
        
        initApp();
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        showToast('Authentication error. Please login again.', 'error');
        setTimeout(() => {
            signOut(auth);
            window.location.href = '/admin.html';
        }, 2000);
    }
});

// ============================================
// Initialize App
// ============================================

async function initApp() {
    console.log('🚀 Initializing admin dashboard V3.0...');
    
    setTimeout(() => {
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
    }, 1000);
    
    // Initialize Cloudinary Widget
    initCloudinaryWidget();
    
    // Start real-time listeners
    startRealtimeOrders();
    startRealtimeProducts();
    startRealtimeStaff();
    startRealtimeExpenses();
    
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Event listeners
    setupEventListeners();
    
    console.log('✅ Admin dashboard V3.0 initialized');
}

// ============================================
// Cloudinary Widget Initialization
// ============================================

function initCloudinaryWidget() {
    if (!window.cloudinary) {
        console.warn('⚠️ Cloudinary script not loaded');
        return;
    }
    
    state.cloudinaryWidget = cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url', 'camera'],
        multiple: false,
        maxFileSize: 5000000, // 5MB
        clientAllowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
        maxImageWidth: 2000,
        maxImageHeight: 2000,
        cropping: true,
        croppingAspectRatio: 1,
        showSkipCropButton: false,
        folder: 'koyun/products'
    }, (error, result) => {
        if (!error && result && result.event === 'success') {
            console.log('✅ Image uploaded:', result.info.secure_url);
            state.uploadedImageUrl = result.info.secure_url;
            
            // Update preview
            if (productImagePreview) {
                productImagePreview.src = result.info.secure_url;
                productImagePreview.style.display = 'block';
            }
            
            // Set to hidden input
            const imageInput = document.getElementById('productImage');
            if (imageInput) imageInput.value = result.info.secure_url;
            
            showToast('Image uploaded successfully!', 'success');
        }
    });
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // Sidebar toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (sidebar) sidebar.classList.add('active');
        });
    }
    
    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('active');
        });
    }
    
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchToSection(section);
            
            if (window.innerWidth <= 1024) {
                if (sidebar) sidebar.classList.remove('active');
            }
        });
    });
    
    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.dataset.filter;
            state.currentFilter = filter;
            
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            renderOrders();
        });
    });
    
    // Date filter
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            state.currentDateFilter = e.target.value;
            
            if (e.target.value === 'custom') {
                if (customDateStart) customDateStart.style.display = 'block';
                if (customDateEnd) customDateEnd.style.display = 'block';
            } else {
                if (customDateStart) customDateStart.style.display = 'none';
                if (customDateEnd) customDateEnd.style.display = 'none';
                renderOrders();
                updateStats();
            }
        });
    }
    
    // Custom date range
    if (customDateStart) {
        customDateStart.addEventListener('change', (e) => {
            state.customDateRange.start = new Date(e.target.value);
            if (state.customDateRange.end) {
                renderOrders();
                updateStats();
            }
        });
    }
    
    if (customDateEnd) {
        customDateEnd.addEventListener('change', (e) => {
            state.customDateRange.end = new Date(e.target.value);
            state.customDateRange.end.setHours(23, 59, 59, 999);
            if (state.customDateRange.start) {
                renderOrders();
                updateStats();
            }
        });
    }
    
    // Refresh
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => refreshBtn.style.transform = '', 500);
            showToast('Data refreshed', 'success');
        });
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Product buttons
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openAddProductModal);
    }
    
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', handleSaveProduct);
    }
    
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', () => {
            if (state.cloudinaryWidget) {
                state.cloudinaryWidget.open();
            } else {
                showToast('Image uploader not ready', 'error');
            }
        });
    }
    
    // Staff buttons
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', openAddStaffModal);
    }
    
    if (saveStaffBtn) {
        saveStaffBtn.addEventListener('click', handleSaveStaff);
    }
    
    // Expense buttons
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', openAddExpenseModal);
    }
    
    if (saveExpenseBtn) {
        saveExpenseBtn.addEventListener('click', handleSaveExpense);
    }
    
    // Export buttons
    if (exportExcel) {
        exportExcel.addEventListener('click', handleExportExcel);
    }
    
    if (exportCSV) {
        exportCSV.addEventListener('click', handleExportCSV);
    }
    
    if (exportPDF) {
        exportPDF.addEventListener('click', handleExportPDF);
    }
}

// ============================================
// Section Switching
// ============================================

window.switchToSection = function(section) {
    state.currentSection = section;
    
    navItems.forEach(item => {
        if (item.dataset.section === section) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    const titles = {
        'dashboard': 'Dashboard Overview',
        'orders': 'Orders Management',
        'products': 'Product Management',
        'analytics': 'Sales Analytics',
        'reports': 'Export Reports',
        'settings': 'System Settings'
    };
    
    if (pageTitle) pageTitle.textContent = titles[section] || 'Dashboard';
    
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load section-specific data
    if (section === 'analytics') {
        renderAnalytics();
    } else if (section === 'settings') {
        renderStaffList();
        renderExpensesList();
    }
}

// ============================================
// Real-time Listeners
// ============================================

function startRealtimeOrders() {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    if (state.unsubscribeOrders) state.unsubscribeOrders();
    
    state.unsubscribeOrders = onSnapshot(q, (snapshot) => {
        state.orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateStats();
        renderOrders();
        renderRecentOrders();
    }, (error) => {
        console.error('❌ Orders listener error:', error);
    });
}

function startRealtimeProducts() {
    const q = query(collection(db, 'products'), orderBy('name'));
    
    if (state.unsubscribeProducts) state.unsubscribeProducts();
    
    state.unsubscribeProducts = onSnapshot(q, (snapshot) => {
        state.products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderProducts();
    });
}

function startRealtimeStaff() {
    const q = query(collection(db, 'users'), where('role', '==', 'kasir'));
    
    if (state.unsubscribeStaff) state.unsubscribeStaff();
    
    state.unsubscribeStaff = onSnapshot(q, (snapshot) => {
        state.staff = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderStaffList();
    });
}

function startRealtimeExpenses() {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    
    if (state.unsubscribeExpenses) state.unsubscribeExpenses();
    
    state.unsubscribeExpenses = onSnapshot(q, (snapshot) => {
        state.expenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderExpensesList();
        updateProfitLoss();
    });
}

// ============================================
// Update Statistics with Date Filter
// ============================================

function updateStats() {
    const filtered = getFilteredOrdersByDate();
    
    const pending = filtered.filter(o => o.status === 'pending').length;
    const processing = filtered.filter(o => o.status === 'processing').length;
    const completed = filtered.filter(o => o.status === 'completed').length;
    const revenue = filtered
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Dashboard stats
    if (dashPending) dashPending.textContent = pending;
    if (dashProcessing) dashProcessing.textContent = processing;
    if (dashCompleted) dashCompleted.textContent = completed;
    if (dashRevenue) dashRevenue.textContent = `Rp ${revenue.toLocaleString('id-ID')}`;
    
    // Orders section stats
    if (statPending) statPending.textContent = pending;
    if (statProcessing) statProcessing.textContent = processing;
    if (statCompleted) statCompleted.textContent = completed;
    if (statRevenue) statRevenue.textContent = `Rp ${revenue.toLocaleString('id-ID')}`;
    if (pendingBadge) pendingBadge.textContent = pending;
    
    // Filter counts
    const allFiltered = getFilteredOrdersByDate();
    if (countAll) countAll.textContent = allFiltered.length;
    if (countPending) countPending.textContent = allFiltered.filter(o => o.status === 'pending').length;
    if (countProcessing) countProcessing.textContent = allFiltered.filter(o => o.status === 'processing').length;
    if (countCompleted) countCompleted.textContent = allFiltered.filter(o => o.status === 'completed').length;
}

// ============================================
// Get Filtered Orders by Date
// ============================================

function getFilteredOrdersByDate() {
    const now = new Date();
    let startDate, endDate;
    
    switch(state.currentDateFilter) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
            break;
            
        case 'week':
            const dayOfWeek = now.getDay();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
            
        case 'custom':
            if (!state.customDateRange.start || !state.customDateRange.end) {
                return state.orders;
            }
            startDate = state.customDateRange.start;
            endDate = state.customDateRange.end;
            break;
            
        default: // 'all'
            return state.orders;
    }
    
    return state.orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate();
        return orderDate >= startDate && orderDate <= endDate;
    });
}

// Rest of the file continues with render functions, CRUD operations, etc.
// Due to length limits, I'll provide this in a follow-up message or you can request specific sections

console.log('✅ Admin.js V3.0 FIXED loaded successfully');
