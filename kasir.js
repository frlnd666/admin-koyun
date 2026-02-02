/* ============================================
   KoYun Coffee V2.0 - Kasir Dashboard Logic
   Real-time Order Management
   ============================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, onSnapshot, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

console.log('✅ Firebase initialized');

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
const ordersSection = document.getElementById('ordersSection');
const reportsSection = document.getElementById('reportsSection');
const pageTitle = document.getElementById('pageTitle');

// User Info
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');

// Stats
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

// Orders
const ordersGrid = document.getElementById('ordersGrid');

// Reports
const reportPeriod = document.getElementById('reportPeriod');
const generateReport = document.getElementById('generateReport');
const reportContent = document.getElementById('reportContent');

// Image Modal
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');

// Time Display
const currentTime = document.getElementById('currentTime');

// ============================================
// State Management
// ============================================

let state = {
    user: null,
    orders: [],
    currentFilter: 'all',
    currentSection: 'orders',
    unsubscribe: null
};

// ============================================
// Authentication Check
// ============================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('✅ User authenticated:', user.email);
        state.user = user;
        userName.textContent = user.email.split('@')[0];
        initApp();
    } else {
        console.log('❌ No user authenticated');
        window.location.href = '/admin.html';
    }
});

// ============================================
// Initialize App
// ============================================

async function initApp() {
    console.log('🚀 Initializing dashboard...');
    
    // Hide loading, show app
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.style.display = 'flex';
    }, 1000);
    
    // Start real-time listeners
    startRealtimeOrders();
    
    // Update time every second
    updateTime();
    setInterval(updateTime, 1000);
    
    // Event listeners
    setupEventListeners();
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // Sidebar toggle (mobile)
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
    });
    
    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });
    
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            
            // Close sidebar on mobile
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('active');
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
    refreshBtn.addEventListener('click', () => {
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshBtn.style.transform = '';
        }, 500);
        
        loadOrders();
        showToast('Data refreshed', 'success');
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Generate Report
    generateReport.addEventListener('click', handleGenerateReport);
}

// ============================================
// Section Switching
// ============================================

function switchSection(section) {
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
        'orders': 'Orders Management',
        'reports': 'Sales Reports'
    };
    pageTitle.textContent = titles[section];
    
    // Show/hide sections
    if (section === 'orders') {
        ordersSection.classList.add('active');
        reportsSection.classList.remove('active');
    } else if (section === 'reports') {
        ordersSection.classList.remove('active');
        reportsSection.classList.add('active');
    }
}

// ============================================
// Real-time Orders Listener
// ============================================

function startRealtimeOrders() {
    console.log('👂 Starting real-time listener...');
    
    const q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
    );
    
    // Unsubscribe from previous listener if exists
    if (state.unsubscribe) {
        state.unsubscribe();
    }
    
    state.unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📡 Real-time update received:', snapshot.size, 'orders');
        
        state.orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateStats();
        renderOrders();
        
        // Play sound for new orders (optional)
        if (snapshot.docChanges().some(change => change.type === 'added')) {
            playNotificationSound();
        }
    }, (error) => {
        console.error('❌ Real-time listener error:', error);
        showToast('Failed to load orders', 'error');
    });
}

function loadOrders() {
    // Manual refresh (already handled by real-time listener)
    console.log('🔄 Manual refresh triggered');
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
    
    statPending.textContent = pending;
    statProcessing.textContent = processing;
    statCompleted.textContent = completed;
    statRevenue.textContent = `Rp ${revenue.toLocaleString('id-ID')}`;
    pendingBadge.textContent = pending;
    
    // Update filter counts
    countAll.textContent = state.orders.length;
    countPending.textContent = state.orders.filter(o => o.status === 'pending').length;
    countProcessing.textContent = state.orders.filter(o => o.status === 'processing').length;
    countCompleted.textContent = state.orders.filter(o => o.status === 'completed').length;
}

// ============================================
// Render Orders
// ============================================

function renderOrders() {
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
            </div>
        `
        : `
            <div class="order-completed-badge">
                <span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Order Completed
                </span>
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
        
        console.log('✅ Order updated successfully');
        showToast(`Order moved to ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('❌ Update error:', error);
        showToast('Failed to update order', 'error');
    }
}

// ============================================
// Image Modal
// ============================================

window.openImageModal = function(imageUrl) {
    modalImage.src = imageUrl;
    imageModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeImageModal = function() {
    imageModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// Generate Report
// ============================================

async function handleGenerateReport() {
    const period = reportPeriod.value;
    
    console.log('📊 Generating report for:', period);
    
    let startDate, endDate;
    const now = new Date();
    
    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (period === 'week') {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        endDate = new Date();
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
    }
    
    const filteredOrders = state.orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate();
        return orderDate >= startDate && orderDate < endDate;
    });
    
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    const totalRevenue = filteredOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrder = completedOrders > 0 ? totalRevenue / completedOrders : 0;
    
    // Payment methods breakdown
    const cashOrders = filteredOrders.filter(o => o.paymentMethod === 'cash').length;
    const qrisOrders = filteredOrders.filter(o => o.paymentMethod === 'qris').length;
    const transferOrders = filteredOrders.filter(o => o.paymentMethod === 'transfer').length;
    
    reportContent.innerHTML = `
        <div class="report-summary">
            <div class="summary-card">
                <h3>Total Orders</h3>
                <div class="value">${totalOrders}</div>
            </div>
            <div class="summary-card">
                <h3>Completed</h3>
                <div class="value">${completedOrders}</div>
            </div>
            <div class="summary-card">
                <h3>Total Revenue</h3>
                <div class="value">Rp ${totalRevenue.toLocaleString('id-ID')}</div>
            </div>
            <div class="summary-card">
                <h3>Average Order</h3>
                <div class="value">Rp ${Math.round(averageOrder).toLocaleString('id-ID')}</div>
            </div>
        </div>
        
        <div style="background: var(--bg-tertiary); padding: var(--space-lg); border-radius: var(--radius-md); margin-top: var(--space-lg);">
            <h3 style="margin-bottom: var(--space-md); color: var(--primary);">Payment Methods</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md);">
                <div style="text-align: center; padding: var(--space-md); background: var(--bg-primary); border-radius: var(--radius-sm);">
                    <div style="font-size: 0.9rem; color: var(--text-tertiary); margin-bottom: 4px;">Cash</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${cashOrders}</div>
                </div>
                <div style="text-align: center; padding: var(--space-md); background: var(--bg-primary); border-radius: var(--radius-sm);">
                    <div style="font-size: 0.9rem; color: var(--text-tertiary); margin-bottom: 4px;">QRIS</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${qrisOrders}</div>
                </div>
                <div style="text-align: center; padding: var(--space-md); background: var(--bg-primary); border-radius: var(--radius-sm);">
                    <div style="font-size: 0.9rem; color: var(--text-tertiary); margin-bottom: 4px;">Transfer</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${transferOrders}</div>
                </div>
            </div>
        </div>
        
        <div style="margin-top: var(--space-xl); text-align: center;">
            <p style="color: var(--text-tertiary); margin-bottom: var(--space-md);">Report generated for: <strong>${formatPeriod(period)}</strong></p>
            <button onclick="window.print()" class="btn btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Report
            </button>
        </div>
    `;
    
    showToast('Report generated successfully', 'success');
}

// ============================================
// Logout
// ============================================

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        await signOut(auth);
        console.log('✅ Logged out successfully');
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
    const now = new Date();
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    currentTime.textContent = now.toLocaleDateString('id-ID', options);
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

function formatPeriod(period) {
    const now = new Date();
    if (period === 'today') return now.toLocaleDateString('id-ID', { dateStyle: 'full' });
    if (period === 'week') return 'This Week';
    if (period === 'month') return now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return period;
}

function playNotificationSound() {
    // Optional: Play notification sound
    // const audio = new Audio('/notification.mp3');
    // audio.play().catch(e => console.log('Sound play failed:', e));
}

function showToast(message, type = 'info') {
    const colors = {
        success: 'var(--success)',
        error: 'var(--danger)',
        info: 'var(--info)',
        warning: 'var(--warning)'
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
        box-shadow: var(--shadow-xl);
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

// Add toast animations
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

console.log('✅ Kasir Dashboard V2.0 initialized');
