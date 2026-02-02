/* ============================================
   KoYun Coffee V3.0 - Admin Dashboard ULTIMATE
   Complete with Analytics, Staff, Expenses
   PRODUCTION VERSION - ULTRA PERFECT
   ============================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, onSnapshot, orderBy, where, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updatePassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

console.log('✅ Firebase initialized - Admin Dashboard V3.0');

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
    customDateRange: { start: null, end: null },
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

// ============================================
// Render Orders
// ============================================

function renderOrders() {
    if (!ordersGrid) return;
    
    const dateFiltered = getFilteredOrdersByDate();
    const filtered = state.currentFilter === 'all' 
        ? dateFiltered 
        : dateFiltered.filter(o => o.status === state.currentFilter);
    
    if (filtered.length === 0) {
        ordersGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 20px; opacity: 0.3;">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <h3 style="color: var(--text-secondary); margin-bottom: 8px;">No Orders Found</h3>
                <p style="color: var(--text-tertiary);">No ${state.currentFilter === 'all' ? '' : state.currentFilter} orders for selected date range</p>
            </div>
        `;
        return;
    }
    
    ordersGrid.innerHTML = filtered.map(order => createOrderCard(order)).join('');
}

function createOrderCard(order) {
    const time = order.createdAt ? formatTime(order.createdAt.toDate()) : 'Just now';
    const paymentMethod = order.paymentMethod || 'cash';
    const paymentStatus = order.paymentStatus || 'pending';
    
    const itemsHTML = order.items.map(item => `
        <div class="order-item">
            <div>
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-qty">× ${item.quantity}</div>
            </div>
            <div class="order-item-price">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</div>
        </div>
    `).join('');
    
    const actionsHTML = order.status === 'pending' 
        ? `
            <div class="order-actions">
                <button class="btn btn-primary" onclick="updateOrderStatus('${order.id}', 'processing')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                    </svg>
                    Process
                </button>
                <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `
        : order.status === 'processing' 
        ? `
            <div class="order-actions">
                <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'completed')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Complete
                </button>
                <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `
        : `
            <div class="order-actions">
                <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        `;
    
    const proofHTML = order.paymentProof && (paymentMethod === 'qris' || paymentMethod === 'transfer') 
        ? `
            <div class="order-proof">
                <div class="proof-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    Payment Proof
                </div>
                <img src="${order.paymentProof}" 
                     alt="Payment Proof" 
                     class="proof-image"
                     onclick="openImageModal('${order.paymentProof}')">
            </div>
        `
        : '';
    
    return `
        <div class="order-card ${order.status}">
            <div class="order-header">
                <div>
                    <div class="order-table">Table ${order.tableNumber}</div>
                    <div class="order-phone">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        ${order.customerPhone}
                    </div>
                    <div class="order-time">🕐 ${time}</div>
                </div>
                <div>
                    <div class="order-status-badge ${order.status}">${order.status}</div>
                    <div class="payment-badge ${paymentStatus}">${paymentStatus}</div>
                </div>
            </div>
            
            <div class="order-items">
                ${itemsHTML}
            </div>
            
            <div class="order-total">
                <span class="order-total-label">Total</span>
                <span class="order-total-value">Rp ${order.total.toLocaleString('id-ID')}</span>
            </div>
            
            <div class="order-payment-method">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">Payment Method:</span>
                <span class="payment-method-badge">${paymentMethod.toUpperCase()}</span>
            </div>
            
            ${proofHTML}
            ${actionsHTML}
        </div>
    `;
}

// ============================================
// Render Recent Orders
// ============================================

function renderRecentOrders() {
    if (!recentOrdersList) return;
    
    const recent = state.orders.slice(0, 5);
    
    if (recent.length === 0) {
        recentOrdersList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-tertiary);">
                <p>No recent orders</p>
            </div>
        `;
        return;
    }
    
    recentOrdersList.innerHTML = recent.map(order => {
        const time = order.createdAt ? formatTime(order.createdAt.toDate()) : 'Just now';
        const statusColor = {
            'pending': 'var(--warning)',
            'processing': 'var(--info)',
            'completed': 'var(--success)'
        }[order.status] || 'var(--text-tertiary)';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-secondary); border-radius: 12px; border-left: 4px solid ${statusColor};">
                <div>
                    <strong style="font-size: 1.1rem; color: var(--primary);">Table ${order.tableNumber}</strong>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 4px 0;">Rp ${order.total.toLocaleString('id-ID')}</p>
                    <small style="color: var(--text-tertiary);">${time}</small>
                </div>
                <div style="text-align: right;">
                    <span style="background: ${statusColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
                        ${order.status}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Order CRUD Operations
// ============================================

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: newStatus,
            updatedAt: Timestamp.now()
        });
        
        showToast(`Order moved to ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('❌ Update error:', error);
        showToast('Failed to update order', 'error');
    }
}

window.deleteOrder = async function(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'orders', orderId));
        showToast('Order deleted successfully', 'success');
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        showToast('Failed to delete order', 'error');
    }
}

// ============================================
// Render Products
// ============================================

function renderProducts() {
    if (!productsGrid) return;
    
    if (state.products.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <h3 style="color: var(--text-secondary);">No Products</h3>
                <p style="color: var(--text-tertiary);">Click "Add Product" to create your first product</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = state.products.map(product => `
        <div class="order-card">
            <img src="${product.imageUrl || 'https://via.placeholder.com/400x300/6F4E37/FFFFFF?text=' + encodeURIComponent(product.name)}" 
                 style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 16px;"
                 onerror="this.src='https://via.placeholder.com/400x300/6F4E37/FFFFFF?text=No+Image'">
            <h3 style="color: var(--primary); margin-bottom: 8px;">${product.name}</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 12px;">${product.description || 'No description'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">Rp ${product.price.toLocaleString('id-ID')}</span>
                <span style="background: var(--bg-tertiary); padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: var(--primary);">${product.category}</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="editProduct('${product.id}')" style="flex: 1;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// Product CRUD Operations
// ============================================

function openAddProductModal() {
    state.editingProductId = null;
    state.uploadedImageUrl = '';
    if (productModalTitle) productModalTitle.textContent = 'Add New Product';
    if (productForm) productForm.reset();
    if (productImagePreview) productImagePreview.style.display = 'none';
    if (productModal) productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.editProduct = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    state.editingProductId = productId;
    state.uploadedImageUrl = product.imageUrl || '';
    
    if (productModalTitle) productModalTitle.textContent = 'Edit Product';
    
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const descInput = document.getElementById('productDescription');
    const imageInput = document.getElementById('productImage');
    
    if (nameInput) nameInput.value = product.name;
    if (categoryInput) categoryInput.value = product.category;
    if (priceInput) priceInput.value = product.price;
    if (descInput) descInput.value = product.description || '';
    if (imageInput) imageInput.value = product.imageUrl || '';
    
    if (productImagePreview && product.imageUrl) {
        productImagePreview.src = product.imageUrl;
        productImagePreview.style.display = 'block';
    }
    
    if (productModal) productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeProductModal = function() {
    if (productModal) productModal.classList.remove('active');
    document.body.style.overflow = '';
    if (productForm) productForm.reset();
    if (productImagePreview) productImagePreview.style.display = 'none';
    state.editingProductId = null;
    state.uploadedImageUrl = '';
}

async function handleSaveProduct() {
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const descInput = document.getElementById('productDescription');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const category = categoryInput ? categoryInput.value : '';
    const price = priceInput ? parseInt(priceInput.value) : 0;
    const description = descInput ? descInput.value.trim() : '';
    const imageUrl = state.uploadedImageUrl;
    
    if (!name || !category || !price) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const productData = {
        name,
        category,
        price,
        description,
        imageUrl,
        active: true,
        updatedAt: Timestamp.now()
    };
    
    try {
        if (saveProductBtn) {
            saveProductBtn.disabled = true;
            saveProductBtn.textContent = 'Saving...';
        }
        
        if (state.editingProductId) {
            await updateDoc(doc(db, 'products', state.editingProductId), productData);
            showToast('Product updated successfully', 'success');
        } else {
            productData.createdAt = Timestamp.now();
            await addDoc(collection(db, 'products'), productData);
            showToast('Product added successfully', 'success');
        }
        
        closeProductModal();
        
    } catch (error) {
        console.error('❌ Save product error:', error);
        showToast('Failed to save product', 'error');
    } finally {
        if (saveProductBtn) {
            saveProductBtn.disabled = false;
            saveProductBtn.textContent = 'Save Product';
        }
    }
}

window.deleteProduct = async function(productId) {
    if (!confirm('Delete this product? This cannot be undone.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'products', productId));
        showToast('Product deleted', 'success');
    } catch (error) {
        console.error('❌ Delete product error:', error);
        showToast('Failed to delete product', 'error');
    }
}
