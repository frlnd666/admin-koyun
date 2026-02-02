/* ============================================
   KoYun Coffee V3.0 - Kasir Dashboard
   Real-time Orders with Sound Notifications
   PRODUCTION VERSION - PERFECT
   ============================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, getDocs, doc, getDoc, updateDoc, onSnapshot, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

console.log('✅ Firebase initialized - Kasir Dashboard V3.0');

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

// Notification Settings
const notificationToggle = document.getElementById('notificationToggle');
const soundToggle = document.getElementById('soundToggle');
const volumeControl = document.getElementById('volumeControl');

// ============================================
// State Management
// ============================================

let state = {
    user: null,
    userRole: null,
    orders: [],
    currentFilter: 'all',
    currentSection: 'orders',
    unsubscribe: null,
    previousOrderCount: 0,
    notificationEnabled: true,
    soundEnabled: true,
    volume: 0.5,
    lastOrderId: null
};

// ============================================
// Notification Sound (Multiple Options)
// ============================================

// Option 1: Simple Beep (Web Audio API)
function createNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(state.volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Option 2: Pleasant Bell Sound
function playNotificationBell() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create multiple oscillators for a bell-like sound
    const frequencies = [800, 1000, 1200];
    
    frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        const startVolume = state.volume / (index + 1);
        gainNode.gain.setValueAtTime(startVolume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.start(audioContext.currentTime + (index * 0.1));
        oscillator.stop(audioContext.currentTime + 1 + (index * 0.1));
    });
}

// Option 3: Using HTML5 Audio with Data URI (Ding sound)
function playNotificationDing() {
    try {
        // Simple ding sound as base64
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYJGGm98OScTgwOUKXh8LJnHgU2jdXzzn0vBSp+zPDbl0AKFF626+qrVxQKR6Hh8r1vIwUrgc7y2Yk3CRhqvPDjnE0LDk+k4e+yaCEFNo3V88+BLwUrfs3v2JNPBRMBAQA=');
        audio.volume = state.volume;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
        console.log('Sound notification not available');
    }
}

// Main notification function
function playNotificationSound() {
    if (!state.soundEnabled) return;
    
    // Use bell sound (most pleasant)
    playNotificationBell();
}

// ============================================
// Browser Notification
// ============================================

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return;
    }
    
    if (Notification.permission === 'granted') {
        state.notificationEnabled = true;
    } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        state.notificationEnabled = permission === 'granted';
    }
}

function showBrowserNotification(order) {
    if (!state.notificationEnabled) return;
    if (Notification.permission !== 'granted') return;
    
    const notification = new Notification('🔔 New Order!', {
        body: `Table ${order.tableNumber} - Rp ${order.total.toLocaleString('id-ID')}`,
        icon: '/images/logo.png', // Ganti dengan logo kamu
        badge: '/images/badge.png',
        tag: 'new-order',
        requireInteraction: false,
        silent: false
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
    
    setTimeout(() => notification.close(), 5000);
}

// ============================================
// Visual Notification Badge
// ============================================

function showVisualNotification() {
    // Flash the pending badge
    if (pendingBadge) {
        pendingBadge.classList.add('pulse');
        setTimeout(() => pendingBadge.classList.remove('pulse'), 2000);
    }
    
    // Flash the page title
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        document.title = flashCount % 2 === 0 ? '🔔 NEW ORDER!' : 'KoYun Kasir';
        flashCount++;
        if (flashCount >= 6) {
            clearInterval(flashInterval);
            document.title = 'KoYun Kasir';
        }
    }, 500);
}

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
        
        if (state.userRole !== 'kasir' && state.userRole !== 'admin') {
            console.warn('⚠️ Access denied: Not staff');
            showToast('Access denied. Staff only.', 'error');
            setTimeout(() => {
                signOut(auth);
                window.location.href = '/admin.html';
            }, 2000);
            return;
        }
        
        // ✅ PENTING: Admin bisa akses kasir.html, tapi auto redirect ke dashboard-admin
        if (state.userRole === 'admin') {
            console.log('🔄 Admin detected, redirecting to admin dashboard...');
            showToast('Redirecting to Admin Dashboard...', 'info');
            setTimeout(() => {
                window.location.href = '/dashboard-admin.html';
            }, 1000);
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
        
        console.log('✅ Kasir access granted');
        
        userName.textContent = userData.name || user.email.split('@')[0];
        userRole.textContent = 'Kasir';
        
        initApp();
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        showToast('Authentication error. Please login again.', 'error');
        setTimeout(() => {
            signOut(auth);
            window.location.href = '/admin.html';
        }, 2000);
        return;
    }
});


// ============================================
// Initialize App
// ============================================

async function initApp() {
    console.log('🚀 Initializing kasir dashboard V3.0...');
    
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        appContainer.style.display = 'flex';
    }, 1000);
    
    // Request notification permission
    await requestNotificationPermission();
    
    // Start real-time listeners
    startRealtimeOrders();
    
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Event listeners
    setupEventListeners();
    
    // Load saved preferences
    loadNotificationPreferences();
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // Sidebar toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }
    
    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
    
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            
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
    
    // Generate Report
    if (generateReport) {
        generateReport.addEventListener('click', handleGenerateReport);
    }
    
    // Notification settings
    if (notificationToggle) {
        notificationToggle.addEventListener('change', (e) => {
            state.notificationEnabled = e.target.checked;
            saveNotificationPreferences();
            showToast(`Browser notifications ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        });
    }
    
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            state.soundEnabled = e.target.checked;
            saveNotificationPreferences();
            showToast(`Sound alerts ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            
            // Test sound when enabled
            if (e.target.checked) {
                playNotificationSound();
            }
        });
    }
    
    if (volumeControl) {
        volumeControl.addEventListener('input', (e) => {
            state.volume = parseFloat(e.target.value);
            saveNotificationPreferences();
        });
        
        volumeControl.addEventListener('change', () => {
            // Test sound on volume change
            if (state.soundEnabled) {
                playNotificationSound();
            }
        });
    }
}

// ============================================
// Notification Preferences
// ============================================

function saveNotificationPreferences() {
    localStorage.setItem('kasir_notifications', JSON.stringify({
        notificationEnabled: state.notificationEnabled,
        soundEnabled: state.soundEnabled,
        volume: state.volume
    }));
}

function loadNotificationPreferences() {
    try {
        const saved = localStorage.getItem('kasir_notifications');
        if (saved) {
            const prefs = JSON.parse(saved);
            state.notificationEnabled = prefs.notificationEnabled ?? true;
            state.soundEnabled = prefs.soundEnabled ?? true;
            state.volume = prefs.volume ?? 0.5;
            
            if (notificationToggle) notificationToggle.checked = state.notificationEnabled;
            if (soundToggle) soundToggle.checked = state.soundEnabled;
            if (volumeControl) volumeControl.value = state.volume;
        }
    } catch (error) {
        console.log('Could not load preferences:', error);
    }
}

// ============================================
// Section Switching
// ============================================

function switchSection(section) {
    state.currentSection = section;
    
    navItems.forEach(item => {
        if (item.dataset.section === section) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    const titles = {
        'orders': 'Orders Management',
        'reports': 'Sales Reports'
    };
    pageTitle.textContent = titles[section];
    
    if (section === 'orders') {
        ordersSection.classList.add('active');
        if (reportsSection) reportsSection.classList.remove('active');
    } else if (section === 'reports') {
        ordersSection.classList.remove('active');
        if (reportsSection) reportsSection.classList.add('active');
    }
}

// ============================================
// Real-time Orders Listener with Notification
// ============================================

function startRealtimeOrders() {
    console.log('👂 Starting real-time listener...');
    
    const q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
    );
    
    if (state.unsubscribe) {
        state.unsubscribe();
    }
    
    state.unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📡 Real-time update received:', snapshot.size, 'orders');
        
        const newOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Detect new orders
        const changes = snapshot.docChanges();
        const hasNewOrder = changes.some(change => change.type === 'added');
        
        if (hasNewOrder && state.orders.length > 0) {
            // Get the newest order
            const newestOrder = newOrders[0];
            
            // Only notify if it's a different order than last time
            if (newestOrder.id !== state.lastOrderId) {
                console.log('🔔 NEW ORDER DETECTED!', newestOrder.id);
                
                // Play sound
                playNotificationSound();
                
                // Show visual notification
                showVisualNotification();
                
                // Show browser notification
                showBrowserNotification(newestOrder);
                
                // Show toast
                showToast(`New order from Table ${newestOrder.tableNumber}!`, 'success');
                
                // Update last order ID
                state.lastOrderId = newestOrder.id;
            }
        }
        
        state.orders = newOrders;
        state.previousOrderCount = newOrders.length;
        
        updateStats();
        renderOrders();
        
    }, (error) => {
        console.error('❌ Real-time listener error:', error);
        showToast('Failed to load orders', 'error');
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
    
    if (statPending) statPending.textContent = pending;
    if (statProcessing) statProcessing.textContent = processing;
    if (statCompleted) statCompleted.textContent = completed;
    if (statRevenue) statRevenue.textContent = `Rp ${revenue.toLocaleString('id-ID')}`;
    if (pendingBadge) pendingBadge.textContent = pending;
    
    // Update filter counts
    if (countAll) countAll.textContent = state.orders.length;
    if (countPending) countPending.textContent = state.orders.filter(o => o.status === 'pending').length;
    if (countProcessing) countProcessing.textContent = state.orders.filter(o => o.status === 'processing').length;
    if (countCompleted) countCompleted.textContent = state.orders.filter(o => o.status === 'completed').length;
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
        
        console.log('✅ Order updated');
        showToast(`Order moved to ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('❌ Update error:', error);
        showToast('Failed to update order', 'error');
    }
}

// ============================================
// Generate Report
// ============================================

function handleGenerateReport() {
    const period = reportPeriod.value;
    const data = getFilteredOrders(period);
    
    if (data.length === 0) {
        reportContent.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
                <h3>No data available</h3>
                <p>No orders found for the selected period</p>
            </div>
        `;
        return;
    }
    
    const totalRevenue = data
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const totalOrders = data.length;
    const completedOrders = data.filter(o => o.status === 'completed').length;
    
    reportContent.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h3 style="color: var(--primary); margin-bottom: 20px;">Report Summary - ${formatPeriodName(period)}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                    <p style="color: var(--text-secondary); margin-bottom: 8px;">Total Orders</p>
                    <h2 style="color: var(--primary); font-size: 2rem;">${totalOrders}</h2>
                </div>
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                    <p style="color: var(--text-secondary); margin-bottom: 8px;">Completed</p>
                    <h2 style="color: var(--success); font-size: 2rem;">${completedOrders}</h2>
                </div>
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                    <p style="color: var(--text-secondary); margin-bottom: 8px;">Total Revenue</p>
                    <h2 style="color: var(--primary); font-size: 2rem;">Rp ${totalRevenue.toLocaleString('id-ID')}</h2>
                </div>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: var(--bg-secondary);">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--primary);">Date</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--primary);">Table</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--primary);">Items</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--primary);">Total</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--primary);">Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(order => {
                    const date = order.createdAt ? order.createdAt.toDate().toLocaleString('id-ID', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'N/A';
                    const items = order.items.map(i => `${i.name} (${i.quantity}x)`).join(', ');
                    const statusColor = {
                        'pending': 'var(--warning)',
                        'processing': 'var(--info)',
                        'completed': 'var(--success)'
                    }[order.status];
                    
                    return `
                        <tr style="border-bottom: 1px solid #E8E4DF;">
                            <td style="padding: 12px;">${date}</td>
                            <td style="padding: 12px;">Table ${order.tableNumber}</td>
                            <td style="padding: 12px; font-size: 0.9rem; color: var(--text-secondary);">${items}</td>
                            <td style="padding: 12px; text-align: right; font-weight: 700; color: var(--primary);">Rp ${order.total.toLocaleString('id-ID')}</td>
                            <td style="padding: 12px; text-align: center;">
                                <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
                                    ${order.status}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    showToast('Report generated successfully', 'success');
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
    modalImage.src = imageUrl;
    imageModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeImageModal = function() {
    imageModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// Logout
// ============================================

async function handleLogout() {
    if (!confirm('Logout from dashboard?')) return;
    
    try {
        if (state.unsubscribe) {
            state.unsubscribe();
        }
        
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
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
    .pulse {
        animation: pulse 0.5s ease-in-out 3;
    }
`;
document.head.appendChild(styleAnimations);

console.log('✅ Kasir Dashboard V3.0 initialized with notifications');
