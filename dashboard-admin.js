/* ============================================
   KoYun Coffee V2.0 - Admin Dashboard Logic
   Full-Featured with Export, Analytics, CRUD
   PRODUCTION VERSION - PERFECT & FINAL
   ============================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, onSnapshot, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

console.log('✅ Firebase initialized - Admin Dashboard');

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
const countAll = document.getElementById('countAll');
const countPending = document.getElementById('countPending');
const countProcessing = document.getElementById('countProcessing');
const countCompleted = document.getElementById('countCompleted');

// Grids
const ordersGrid = document.getElementById('ordersGrid');
const productsGrid = document.getElementById('productsGrid');
const recentOrdersList = document.getElementById('recentOrdersList');

// Modals
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const productModal = document.getElementById('productModal');

// Product Form
const addProductBtn = document.getElementById('addProductBtn');
const productForm = document.getElementById('productForm');
const productModalTitle = document.getElementById('productModalTitle');
const saveProductBtn = document.getElementById('saveProductBtn');

// Reports
const reportPeriod = document.getElementById('reportPeriod');
const exportExcel = document.getElementById('exportExcel');
const exportCSV = document.getElementById('exportCSV');

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
    currentFilter: 'all',
    currentSection: 'dashboard',
    unsubscribeOrders: null,
    unsubscribeProducts: null,
    editingProductId: null
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
        // Get user document by UID
        console.log('🔍 Fetching user document for UID:', user.uid);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            console.error('❌ User document not found in Firestore');
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
        console.log('📧 User email:', userData.email);
        
        // Check if user is admin
        if (state.userRole !== 'admin') {
            console.warn('⚠️ Access denied: Not an admin');
            showToast('Access denied. Admin only.', 'error');
            setTimeout(() => {
                window.location.href = '/kasir.html';
            }, 1500);
            return;
        }
        
        // Check if active
        if (userData.active === false) {
            console.warn('⚠️ Account disabled');
            showToast('Account is disabled.', 'error');
            setTimeout(() => {
                signOut(auth);
                window.location.href = '/admin.html';
            }, 2000);
            return;
        }
        
        // Set user info
        userName.textContent = userData.name || user.email.split('@')[0];
        userRole.textContent = 'Administrator';
        
        console.log('✅ Admin access granted');
        
        // Initialize app
        initApp();
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message
        });
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
    console.log('🚀 Initializing admin dashboard...');
    
    // Hide loading, show app
    setTimeout(() => {
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
    }, 1000);
    
    // Start real-time listeners
    startRealtimeOrders();
    startRealtimeProducts();
    
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Event listeners
    setupEventListeners();
    
    console.log('✅ Admin dashboard initialized successfully');
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
    
    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = '';
            }, 500);
            
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
    
    // Export buttons
    if (exportExcel) {
        exportExcel.addEventListener('click', handleExportExcel);
    }
    
    if (exportCSV) {
        exportCSV.addEventListener('click', handleExportCSV);
    }
}

// ============================================
// Section Switching
// ============================================

window.switchToSection = function(section) {
    state.currentSection = section;
    
    // Update navigation
    navItems.forEach(item => {
        if (item.dataset.section === section) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard Overview',
        'orders': 'Orders Management',
        'products': 'Product Management',
        'analytics': 'Sales Analytics',
        'reports': 'Export Reports',
        'settings': 'System Settings'
    };
    if (pageTitle) pageTitle.textContent = titles[section] || 'Dashboard';
    
    // Show/hide sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// ============================================
// Real-time Orders Listener
// ============================================

function startRealtimeOrders() {
    console.log('👂 Starting real-time orders listener...');
    
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    if (state.unsubscribeOrders) {
        state.unsubscribeOrders();
    }
    
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

// ============================================
// Real-time Products Listener
// ============================================

function startRealtimeProducts() {
    console.log('👂 Starting real-time products listener...');
    
    const q = query(collection(db, 'products'), orderBy('name'));
    
    if (state.unsubscribeProducts) {
        state.unsubscribeProducts();
    }
    
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

// ============================================
// Update Statistics
// ============================================

function updateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = state.orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate();
        return orderDate >= today;
    });
    
    const pending = todayOrders.filter(o => o.status === 'pending').length;
    const processing = todayOrders.filter(o => o.status === 'processing').length;
    const completed = todayOrders.filter(o => o.status === 'completed').length;
    const revenue = todayOrders
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
    if (countAll) countAll.textContent = state.orders.length;
    if (countPending) countPending.textContent = state.orders.filter(o => o.status === 'pending').length;
    if (countProcessing) countProcessing.textContent = state.orders.filter(o => o.status === 'processing').length;
    if (countCompleted) countCompleted.textContent = state.orders.filter(o => o.status === 'completed').length;
}

// ============================================
// Render Orders
// ============================================

function renderOrders() {
    if (!ordersGrid) return;
    
    const filtered = state.currentFilter === 'all' 
        ? state.orders 
        : state.orders.filter(o => o.status === state.currentFilter);
    
    if (filtered.length === 0) {
        ordersGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 20px; opacity: 0.3;">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <h3 style="color: var(--text-secondary); margin-bottom: 8px;">No Orders Found</h3>
                <p style="color: var(--text-tertiary);">No ${state.currentFilter === 'all' ? '' : state.currentFilter} orders at the moment</p>
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
// Render Recent Orders (Dashboard)
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
// Update Order Status
// ============================================

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        console.log('📝 Updating order:', orderId, 'to', newStatus);
        
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: newStatus,
            updatedAt: Timestamp.now()
        });
        
        console.log('✅ Order updated');
        showToast(`Order moved to ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('❌ Update error:', error);
        showToast('Failed to update order', 'error');
    }
}

// ============================================
// Delete Order (Admin Only)
// ============================================

window.deleteOrder = async function(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting order:', orderId);
        
        await deleteDoc(doc(db, 'orders', orderId));
        
        console.log('✅ Order deleted');
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
// Product CRUD
// ============================================

function openAddProductModal() {
    state.editingProductId = null;
    if (productModalTitle) productModalTitle.textContent = 'Add New Product';
    if (productForm) productForm.reset();
    if (productModal) productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.editProduct = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    state.editingProductId = productId;
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
    
    if (productModal) productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeProductModal = function() {
    if (productModal) productModal.classList.remove('active');
    document.body.style.overflow = '';
    if (productForm) productForm.reset();
    state.editingProductId = null;
}

async function handleSaveProduct() {
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const descInput = document.getElementById('productDescription');
    const imageInput = document.getElementById('productImage');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const category = categoryInput ? categoryInput.value : '';
    const price = priceInput ? parseInt(priceInput.value) : 0;
    const description = descInput ? descInput.value.trim() : '';
    const imageUrl = imageInput ? imageInput.value.trim() : '';
    
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
            // Update existing product
            await updateDoc(doc(db, 'products', state.editingProductId), productData);
            showToast('Product updated successfully', 'success');
        } else {
            // Add new product
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

// ============================================
// Export Functions
// ============================================

function handleExportExcel() {
    const period = reportPeriod ? reportPeriod.value : 'all';
    const data = getFilteredOrders(period);
    
    if (data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    // Create Excel-like CSV format with BOM for UTF-8
    let csv = '\uFEFF';
    csv += 'KoYun Coffee - Sales Report\n';
    csv += `Period: ${formatPeriodName(period)}\n`;
    csv += `Generated: ${new Date().toLocaleString('id-ID')}\n\n`;
    
    csv += 'Order ID,Date,Time,Table,Phone,Items,Total,Payment Method,Status\n';
    
    data.forEach(order => {
        const date = order.createdAt ? order.createdAt.toDate() : new Date();
        const items = order.items.map(i => `${i.name} (${i.quantity}x)`).join('; ');
        
        csv += `"${order.id}",`;
        csv += `"${date.toLocaleDateString('id-ID')}",`;
        csv += `"${date.toLocaleTimeString('id-ID')}",`;
        csv += `"Table ${order.tableNumber}",`;
        csv += `"${order.customerPhone}",`;
        csv += `"${items}",`;
        csv += `"Rp ${order.total.toLocaleString('id-ID')}",`;
        csv += `"${order.paymentMethod}",`;
        csv += `"${order.status}"\n`;
    });
    
    downloadFile(csv, `KoYun-Report-${period}-${Date.now()}.csv`, 'text/csv');
    showToast('Excel file downloaded', 'success');
}

function handleExportCSV() {
    const period = reportPeriod ? reportPeriod.value : 'all';
    const data = getFilteredOrders(period);
    
    if (data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    let csv = 'Order ID,Date,Time,Table,Phone,Items,Total,Payment,Status\n';
    
    data.forEach(order => {
        const date = order.createdAt ? order.createdAt.toDate() : new Date();
        const items = order.items.map(i => `${i.name} (${i.quantity}x)`).join('; ');
        
        csv += `${order.id},`;
        csv += `${date.toLocaleDateString('id-ID')},`;
        csv += `${date.toLocaleTimeString('id-ID')},`;
        csv += `${order.tableNumber},`;
        csv += `${order.customerPhone},`;
        csv += `"${items}",`;
        csv += `${order.total},`;
        csv += `${order.paymentMethod},`;
        csv += `${order.status}\n`;
    });
    
    downloadFile(csv, `KoYun-Export-${period}-${Date.now()}.csv`, 'text/csv');
    showToast('CSV file downloaded', 'success');
}

function getFilteredOrders(period) {
    const now = new Date();
    let startDate;
    
    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        return state.orders;
    }
    
    return state.orders.filter(order => {
        if (!order.createdAt) return false;
        return order.createdAt.toDate() >= startDate;
    });
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function formatPeriodName(period) {
    const now = new Date();
    if (period === 'today') return now.toLocaleDateString('id-ID', { dateStyle: 'full' });
    if (period === 'week') return 'This Week';
    if (period === 'month') return now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return 'All Time';
}

// ============================================
// Image Modal
// ============================================

window.openImageModal = function(imageUrl) {
    if (modalImage) modalImage.src = imageUrl;
    if (imageModal) imageModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeImageModal = function() {
    if (imageModal) imageModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// Logout
// ============================================

async function handleLogout() {
    if (!confirm('Logout from admin dashboard?')) return;
    
    try {
        // Unsubscribe listeners
        if (state.unsubscribeOrders) state.unsubscribeOrders();
        if (state.unsubscribeProducts) state.unsubscribeProducts();
        
        await signOut(auth);
        console.log('✅ Logged out');
        window.location.href = '/admin.html';
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// ============================================
// Utility Functions
// ============================================

function updateTime() {
    if (!currentTime) return;
    
    const now = new Date();
    currentTime.textContent = now.toLocaleDateString('id-ID', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const colors = {
        success: '#2ECC71',
        error: '#E74C3C',
        info: '#3498DB',
        warning: '#F39C12'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const styleAnimations = document.createElement('style');
styleAnimations.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(styleAnimations);

console.log('✅ Admin Dashboard V2.0 initialized');
