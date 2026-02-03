/* ============================================
   KoYun Coffee V3.0 - Admin Dashboard
   ULTIMATE Complete with Analytics, Staff, Expenses
   PRODUCTION VERSION - FIXED INFINITE RELOAD BUG
   Last Updated: 2026-02-03
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
    setDoc  // ✅ ADDED FOR STAFF CREATION FIX
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
    console.log('👂 Starting real-time orders listener...');
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    if (state.unsubscribeOrders) state.unsubscribeOrders();
    
    state.unsubscribeOrders = onSnapshot(q, (snapshot) => {
        console.log('📡 Orders update:', snapshot.size, 'orders');
        state.orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateStats();
        renderOrders();
        renderRecentOrders();
    }, (error) => {
        console.error('❌ Orders listener error:', error);
        showToast('Failed to load orders', 'error');
    });
}

function startRealtimeProducts() {
    console.log('👂 Starting real-time products listener...');
    const q = query(collection(db, 'products'), orderBy('name'));
    
    if (state.unsubscribeProducts) state.unsubscribeProducts();
    
    state.unsubscribeProducts = onSnapshot(q, (snapshot) => {
        console.log('📡 Products update:', snapshot.size, 'products');
        state.products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderProducts();
    }, (error) => {
        console.error('❌ Products listener error:', error);
        showToast('Failed to load products', 'error');
    });
}

function startRealtimeStaff() {
    console.log('👂 Starting real-time staff listener...');
    const q = query(collection(db, 'users'), where('role', '==', 'kasir'));
    
    if (state.unsubscribeStaff) state.unsubscribeStaff();
    
    state.unsubscribeStaff = onSnapshot(q, (snapshot) => {
        console.log('📡 Staff update:', snapshot.size, 'staff members');
        state.staff = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderStaffList();
    }, (error) => {
        console.error('❌ Staff listener error:', error);
        showToast('Failed to load staff', 'error');
    });
}

function startRealtimeExpenses() {
    console.log('👂 Starting real-time expenses listener...');
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    
    if (state.unsubscribeExpenses) state.unsubscribeExpenses();
    
    state.unsubscribeExpenses = onSnapshot(q, (snapshot) => {
        console.log('📡 Expenses update:', snapshot.size, 'expenses');
        state.expenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderExpensesList();
        updateProfitLoss();
    }, (error) => {
        console.error('❌ Expenses listener error:', error);
        showToast('Failed to load expenses', 'error');
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
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>No ${state.currentFilter === 'all' ? '' : state.currentFilter} orders for selected date range</p>
            </div>
        `;
        return;
    }
    
    ordersGrid.innerHTML = filtered.map(order => {
        const date = order.createdAt ? order.createdAt.toDate() : new Date();
        const items = order.items ? order.items.map(item => 
            `${item.quantity}x ${item.name}`
        ).join(', ') : 'No items';
        
        const statusColors = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'completed': '#10b981'
        };
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <h3>Table ${order.tableNumber}</h3>
                        <span class="order-time">${date.toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                    <div class="order-status" style="background: ${statusColors[order.status]}">
                        ${order.status}
                    </div>
                </div>
                
                <div class="order-items">
                    <p>${items}</p>
                </div>
                
                <div class="order-footer">
                    <div class="order-total">
                        <span>Total:</span>
                        <strong>Rp ${order.total.toLocaleString('id-ID')}</strong>
                    </div>
                    <div class="order-payment">
                        <span>${order.paymentMethod || 'Cash'}</span>
                    </div>
                </div>
                
                ${order.proofImage ? `
                    <div class="order-proof">
                        <img src="${order.proofImage}" alt="Payment Proof" 
                             onclick="showImageModal('${order.proofImage}')" 
                             style="cursor: pointer; max-width: 100px; border-radius: 8px;">
                    </div>
                ` : ''}
                
                <div class="order-actions">
                    ${order.status === 'pending' ? `
                        <button onclick="updateOrderStatus('${order.id}', 'processing')" class="btn-processing">
                            Process
                        </button>
                    ` : ''}
                    ${order.status === 'processing' ? `
                        <button onclick="updateOrderStatus('${order.id}', 'completed')" class="btn-complete">
                            Complete
                        </button>
                    ` : ''}
                    <button onclick="deleteOrder('${order.id}')" class="btn-delete">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Render Recent Orders (Dashboard)
// ============================================

function renderRecentOrders() {
    if (!recentOrdersList) return;
    
    const recent = state.orders.slice(0, 5);
    
    if (recent.length === 0) {
        recentOrdersList.innerHTML = `
            <div class="empty-state-small">
                <p>No recent orders</p>
            </div>
        `;
        return;
    }
    
    recentOrdersList.innerHTML = recent.map(order => {
        const date = order.createdAt ? order.createdAt.toDate() : new Date();
        const time = date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="recent-order-item">
                <div class="recent-order-info">
                    <strong>Table ${order.tableNumber}</strong>
                    <span class="recent-order-status status-${order.status}">${order.status}</span>
                </div>
                <div class="recent-order-meta">
                    <span class="recent-order-total">Rp ${order.total.toLocaleString('id-ID')}</span>
                    <span class="recent-order-time">${time}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Render Products
// ============================================

function renderProducts() {
    if (!productsGrid) return;
    
    if (state.products.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🍽️</div>
                <p>Click "Add Product" to create your first product</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = state.products.map(product => `
        <div class="product-card">
            ${product.image ? `
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" 
                         onclick="showImageModal('${product.image}')" 
                         style="cursor: pointer;">
                </div>
            ` : `
                <div class="product-image-placeholder">
                    <span>📷</span>
                </div>
            `}
            
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.description || 'No description'}</p>
                <div class="product-price">Rp ${product.price.toLocaleString('id-ID')}</div>
            </div>
            
            <div class="product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                Stock: ${product.stock}
            </div>
            
            <div class="product-actions">
                <button onclick="editProduct('${product.id}')" class="btn-edit">
                    ✏️ Edit
                </button>
                <button onclick="deleteProduct('${product.id}')" class="btn-delete">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// Order Status Update
// ============================================

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: newStatus,
            updatedAt: Timestamp.now()
        });
        
        showToast(`Order updated to ${newStatus}`, 'success');
    } catch (error) {
        console.error('❌ Update order error:', error);
        showToast('Failed to update order', 'error');
    }
}

// ============================================
// Delete Order
// ============================================

window.deleteOrder = async function(orderId) {
    if (!confirm('Delete this order? This action cannot be undone.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'orders', orderId));
        showToast('Order deleted successfully', 'success');
    } catch (error) {
        console.error('❌ Delete order error:', error);
        showToast('Failed to delete order', 'error');
    }
}

// ============================================
// Product Modal Functions
// ============================================

function openAddProductModal() {
    state.editingProductId = null;
    
    if (productModalTitle) productModalTitle.textContent = 'Add New Product';
    if (productForm) productForm.reset();
    if (productImagePreview) productImagePreview.style.display = 'none';
    
    state.uploadedImageUrl = '';
    
    if (productModal) productModal.style.display = 'flex';
}

window.editProduct = async function(productId) {
    state.editingProductId = productId;
    
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    if (productModalTitle) productModalTitle.textContent = 'Edit Product';
    
    // Fill form
    const nameInput = document.getElementById('productName');
    const descInput = document.getElementById('productDescription');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const categoryInput = document.getElementById('productCategory');
    const imageInput = document.getElementById('productImage');
    
    if (nameInput) nameInput.value = product.name || '';
    if (descInput) descInput.value = product.description || '';
    if (priceInput) priceInput.value = product.price || 0;
    if (stockInput) stockInput.value = product.stock || 0;
    if (categoryInput) categoryInput.value = product.category || '';
    if (imageInput) imageInput.value = product.image || '';
    
    if (product.image && productImagePreview) {
        productImagePreview.src = product.image;
        productImagePreview.style.display = 'block';
    }
    
    state.uploadedImageUrl = product.image || '';
    
    if (productModal) productModal.style.display = 'flex';
}

window.closeProductModal = function() {
    if (productModal) productModal.style.display = 'none';
    if (productForm) productForm.reset();
    if (productImagePreview) productImagePreview.style.display = 'none';
    state.editingProductId = null;
    state.uploadedImageUrl = '';
}

// ============================================
// Save Product (Create/Update)
// ============================================

async function handleSaveProduct() {
    const nameInput = document.getElementById('productName');
    const descInput = document.getElementById('productDescription');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const categoryInput = document.getElementById('productCategory');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const price = priceInput ? parseFloat(priceInput.value) : 0;
    const stock = stockInput ? parseInt(stockInput.value) : 0;
    const category = categoryInput ? categoryInput.value.trim() : '';
    const image = state.uploadedImageUrl || '';
    
    if (!name || price <= 0) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        if (saveProductBtn) {
            saveProductBtn.disabled = true;
            saveProductBtn.textContent = 'Saving...';
        }
        
        const productData = {
            name,
            description,
            price,
            stock,
            category,
            image,
            updatedAt: Timestamp.now()
        };
        
        if (state.editingProductId) {
            // Update existing
            await updateDoc(doc(db, 'products', state.editingProductId), productData);
            showToast('Product updated successfully', 'success');
        } else {
            // Create new
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

// ============================================
// Delete Product
// ============================================

window.deleteProduct = async function(productId) {
    if (!confirm('Delete this product? This action cannot be undone.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'products', productId));
        showToast('Product deleted successfully', 'success');
    } catch (error) {
        console.error('❌ Delete product error:', error);
        showToast('Failed to delete product', 'error');
    }
}

