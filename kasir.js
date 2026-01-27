import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc, where, getDocs, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDOUb7G6NBe2IKTyLYKFYyf7e0uiNoDoBs",
    authDomain: "koyun-id.firebaseapp.com",
    projectId: "koyun-id",
    storageBucket: "koyun-id.firebasestorage.app",
    messagingSenderId: "672101013741",
    appId: "1:672101013741:web:64b367d77ec8df8ecf14e4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const ordersGrid = document.getElementById('ordersGrid');
const reportContent = document.getElementById('reportContent');
const logoutBtn = document.getElementById('logoutBtn');
const userRole = document.getElementById('userRole');
const reportPeriod = document.getElementById('reportPeriod');
const customDateRange = document.getElementById('customDateRange');
const generateReportBtn = document.getElementById('generateReportBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');

// State
let currentUser = null;
let currentFilter = 'all';
let ordersUnsubscribe = null;
let ordersData = [];

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || (userDoc.data().role !== 'kasir' && userDoc.data().role !== 'admin')) {
            await signOut(auth);
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = { uid: user.uid, ...userDoc.data() };
        userRole.textContent = currentUser.role === 'admin' ? 'Admin' : 'Kasir';
        
        loadOrders();
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat data');
    }
});

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}Section`).classList.add('active');
        
        if (window.innerWidth <= 1024) {
            sidebar.classList.remove('active');
        }
    });
});

// Mobile menu toggle
mobileMenuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Filter tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.status;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderOrders();
    });
});

// Load orders with real-time updates
function loadOrders() {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    ordersUnsubscribe = onSnapshot(q, (snapshot) => {
        ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderOrders();
    }, (error) => {
        console.error('Error loading orders:', error);
        ordersGrid.innerHTML = '<p style="padding:40px; text-align:center; color:var(--danger);">Gagal memuat pesanan. Refresh halaman.</p>';
    });
}

// Render orders
function renderOrders() {
    const filtered = currentFilter === 'all' 
        ? ordersData 
        : ordersData.filter(o => o.status === currentFilter);
    
    if (filtered.length === 0) {
        const emptyMessages = {
            'all': 'Belum ada pesanan masuk',
            'pending': 'Tidak ada pesanan pending',
            'processing': 'Tidak ada pesanan yang sedang diproses',
            'completed': 'Belum ada pesanan selesai'
        };
        
        ordersGrid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:80px 20px;">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="1.5" style="margin-bottom:24px;">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <h3 style="color:var(--text-medium); margin-bottom:12px; font-size:1.3rem;">${emptyMessages[currentFilter]}</h3>
                <p style="color:var(--text-light);">Pesanan akan muncul di sini secara real-time</p>
            </div>
        `;
        return;
    }
    
    ordersGrid.innerHTML = filtered.map(order => {
        const createdTime = order.createdAt ? 
            new Date(order.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }) : '-';
        
        const createdDate = order.createdAt ? 
            new Date(order.createdAt.seconds * 1000).toLocaleDateString('id-ID', { 
                day: '2-digit', 
                month: 'short' 
            }) : '-';
        
        // Payment status badge
        const paymentBadge = order.paymentStatus === 'paid' 
            ? '<span style="background:var(--success); color:white; padding:4px 12px; border-radius:12px; font-size:0.85rem; font-weight:600; display:inline-block;">✓ LUNAS</span>'
            : '<span style="background:var(--warning); color:white; padding:4px 12px; border-radius:12px; font-size:0.85rem; font-weight:600; display:inline-block;">⏳ BELUM BAYAR</span>';
        
        return `
            <div class="order-card ${order.status}">
                <div class="order-header">
                    <div>
                        <strong style="font-size:1.4rem; color:var(--primary-color); font-family:'Playfair Display', serif;">Meja ${order.tableNumber}</strong>
                        <p style="font-size:0.95rem; color:var(--text-medium); margin-top:6px; font-weight:500;">
                            📱 ${order.customerPhone}
                        </p>
                        <p style="font-size:0.85rem; color:var(--text-light); margin-top:4px;">
                            🕒 ${createdDate} • ${createdTime}
                        </p>
                    </div>
                    <div style="text-align:right;">
                        <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                        <div style="margin-top:10px;">${paymentBadge}</div>
                    </div>
                </div>
                
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span style="font-weight:500; color:var(--text-dark);">
                                <strong style="color:var(--primary-color); font-size:1.1rem;">${item.quantity}x</strong> ${item.name}
                            </span>
                            <span style="font-weight:700; color:var(--primary-color); font-size:1.05rem;">
                                Rp ${(item.price * item.quantity).toLocaleString('id-ID')}
                            </span>
                        </div>
                    `).join('')}
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:20px; border-top:3px solid var(--bg-light);">
                    <div>
                        <p style="font-size:0.9rem; color:var(--text-light); margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Total Pembayaran</p>
                        <strong style="font-size:1.8rem; color:var(--primary-color); font-family:'Playfair Display', serif;">Rp ${order.total.toLocaleString('id-ID')}</strong>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.95rem; color:var(--text-dark); font-weight:700; background:var(--bg-cream); padding:10px 18px; border-radius:12px; display:inline-block; border:2px solid var(--primary-light);">
                            ${getPaymentMethodIcon(order.paymentMethod)} ${order.paymentMethod.toUpperCase()}
                        </span>
                    </div>
                </div>
                
                ${order.paymentProof ? `
                    <div style="margin-top:20px; padding-top:20px; border-top:2px dashed var(--bg-light);">
                        <p style="font-size:0.95rem; color:var(--text-dark); margin-bottom:12px; font-weight:700; display:flex; align-items:center; gap:8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            Bukti Pembayaran:
                        </p>
                        <div style="position:relative; border-radius:12px; overflow:hidden; box-shadow:var(--shadow-lg); cursor:pointer;" onclick="openImageModal('${order.paymentProof}')">
                            <img src="${order.paymentProof}" 
                                 style="max-width:100%; display:block; transition:transform 0.3s ease;" 
                                 alt="Bukti Bayar"
                                 onmouseover="this.style.transform='scale(1.02)'"
                                 onmouseout="this.style.transform='scale(1)'">
                            <div style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,0.9); padding:8px 12px; border-radius:8px; font-size:0.85rem; font-weight:600; color:var(--primary-color);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                Klik untuk zoom
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${renderOrderActions(order)}
            </div>
        `;
    }).join('');
    
    attachOrderActions();
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'processing': 'Diproses',
        'completed': 'Selesai'
    };
    return statusMap[status] || status;
}

// Get payment method icon
function getPaymentMethodIcon(method) {
    const icons = {
        'qris': '📱',
        'transfer': '🏦',
        'cash': '💵'
    };
    return icons[method] || '💳';
}

// Render order actions
function renderOrderActions(order) {
    if (order.status === 'completed') {
        return `
            <div style="margin-top:20px; padding:16px; background:rgba(46, 204, 113, 0.1); border-radius:12px; text-align:center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" style="vertical-align:middle; margin-right:8px;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span style="color:var(--success); font-weight:700; font-size:1.05rem;">Pesanan Selesai</span>
            </div>
        `;
    }
    
    if (order.status === 'pending') {
        return `
            <div class="order-actions" style="margin-top:20px;">
                <button class="btn-action btn-process" data-id="${order.id}" style="width:100%;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Proses Pesanan
                </button>
            </div>
        `;
    }
    
    if (order.status === 'processing') {
        return `
            <div class="order-actions" style="margin-top:20px;">
                <button class="btn-action btn-complete" data-id="${order.id}" style="width:100%;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Tandai Selesai
                </button>
            </div>
        `;
    }
    
    return '';
}

// Attach order action handlers
function attachOrderActions() {
    document.querySelectorAll('.btn-process').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orderId = btn.dataset.id;
            await updateOrderStatus(orderId, 'processing');
        });
    });
    
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orderId = btn.dataset.id;
            await updateOrderStatus(orderId, 'completed');
        });
    });
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: newStatus,
            updatedAt: serverTimestamp(),
            processedBy: currentUser.uid
        });
        
        const statusMessages = {
            'processing': 'Pesanan sedang diproses',
            'completed': 'Pesanan telah selesai'
        };
        
        showNotification('success', statusMessages[newStatus]);
        
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('error', 'Gagal update status pesanan');
    }
}

// Show notification
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Open image modal (for payment proof)
window.openImageModal = function(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:800px; padding:0; background:transparent; box-shadow:none;">
            <button onclick="this.closest('.modal').remove()" style="position:absolute; top:20px; right:20px; background:white; border:none; width:48px; height:48px; border-radius:50%; cursor:pointer; box-shadow:var(--shadow-xl); z-index:10000;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <img src="${imageUrl}" style="max-width:100%; max-height:90vh; border-radius:12px; box-shadow:var(--shadow-xl);" alt="Bukti Pembayaran">
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

// Generate Sales Report
generateReportBtn.addEventListener('click', async () => {
    const period = reportPeriod.value;
    
    let startDate, endDate;
    const now = new Date();
    
    if (period === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (period === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = new Date(weekStart.setHours(0, 0, 0, 0));
        endDate = new Date();
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
    } else {
        alert('Fitur custom date akan segera hadir');
        return;
    }
    
    generateReportBtn.textContent = 'Memuat...';
    generateReportBtn.disabled = true;
    
    try {
        const q = query(
            collection(db, 'orders'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('createdAt', '<=', Timestamp.fromDate(endDate))
        );
        
        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(doc => doc.data());
        
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const processingOrders = orders.filter(o => o.status === 'processing').length;
        const avgOrder = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
        
        const paymentStats = completedOrders.reduce((acc, o) => {
            acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + 1;
            return acc;
        }, {});
        
        const paymentRevenue = completedOrders.reduce((acc, o) => {
            acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
            return acc;
        }, {});
        
        reportContent.innerHTML = `
            <div class="report-summary">
                <div class="summary-card" style="border-left-color:var(--info);">
                    <h3>Total Pesanan</h3>
                    <div class="value">${totalOrders}</div>
                    <p style="font-size:0.9rem; color:var(--text-light); margin-top:8px;">
                        Pending: ${pendingOrders} | Proses: ${processingOrders}
                    </p>
                </div>
                <div class="summary-card" style="border-left-color:var(--success);">
                    <h3>Selesai</h3>
                    <div class="value" style="color:var(--success);">${completedOrders.length}</div>
                    <p style="font-size:0.9rem; color:var(--text-light); margin-top:8px;">
                        ${totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0}% completion rate
                    </p>
                </div>
                <div class="summary-card" style="border-left-color:var(--primary-color);">
                    <h3>Total Pendapatan</h3>
                    <div class="value">Rp ${totalRevenue.toLocaleString('id-ID')}</div>
                    <p style="font-size:0.9rem; color:var(--text-light); margin-top:8px;">
                        Dari ${completedOrders.length} transaksi
                    </p>
                </div>
                <div class="summary-card" style="border-left-color:var(--accent-color);">
                    <h3>Rata-rata Order</h3>
                    <div class="value">Rp ${Math.round(avgOrder).toLocaleString('id-ID')}</div>
                    <p style="font-size:0.9rem; color:var(--text-light); margin-top:8px;">
                        Per transaksi
                    </p>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px; margin-top:32px;">
                <div style="background:var(--white); padding:32px; border-radius:var(--border-radius-lg); box-shadow:var(--shadow);">
                    <h3 style="margin-bottom:24px; color:var(--primary-color); display:flex; align-items:center; gap:10px; font-size:1.3rem;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Metode Pembayaran
                    </h3>
                    ${Object.keys(paymentStats).length > 0 ? Object.entries(paymentStats).map(([method, count]) => {
                        const revenue = paymentRevenue[method] || 0;
                        const percentage = completedOrders.length > 0 ? Math.round((count / completedOrders.length) * 100) : 0;
                        return `
                            <div style="padding:18px 0; border-bottom:1px solid var(--bg-light);">
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
                                    <span style="font-weight:700; text-transform:uppercase; font-size:1.05rem;">${getPaymentMethodIcon(method)} ${method}</span>
                                    <strong style="color:var(--primary-color); font-size:1.2rem;">${count} <span style="font-size:0.9rem; color:var(--text-light);">(${percentage}%)</span></strong>
                                </div>
                                <div style="font-size:1.3rem; color:var(--success); font-weight:700; font-family:'Playfair Display', serif;">
                                    Rp ${revenue.toLocaleString('id-ID')}
                                </div>
                            </div>
                        `;
                    }).join('') : '<p style="text-align:center; color:var(--text-light); padding:40px 0;">Belum ada data</p>'}
                </div>
                
                <div style="background:var(--white); padding:32px; border-radius:var(--border-radius-lg); box-shadow:var(--shadow);">
                    <h3 style="margin-bottom:24px; color:var(--primary-color); display:flex; align-items:center; gap:10px; font-size:1.3rem;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Status Pesanan
                    </h3>
                    <div style="padding:18px 0; border-bottom:1px solid var(--bg-light);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600; font-size:1.05rem;">✅ Completed</span>
                            <strong style="color:var(--success); font-size:1.8rem; font-family:'Playfair Display', serif;">${completedOrders.length}</strong>
                        </div>
                    </div>
                    <div style="padding:18px 0; border-bottom:1px solid var(--bg-light);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600; font-size:1.05rem;">🔄 Processing</span>
                            <strong style="color:var(--info); font-size:1.8rem; font-family:'Playfair Display', serif;">${processingOrders}</strong>
                        </div>
                    </div>
                    <div style="padding:18px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600; font-size:1.05rem;">⏳ Pending</span>
                            <strong style="color:var(--warning); font-size:1.8rem; font-family:'Playfair Display', serif;">${pendingOrders}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating sales report:', error);
        reportContent.innerHTML = '<p style="padding:40px; text-align:center; color:var(--danger);">Gagal generate laporan. Silakan coba lagi.</p>';
    }
    
    generateReportBtn.textContent = 'Generate';
    generateReportBtn.disabled = false;
});

// Logout
logoutBtn.addEventListener('click', async () => {
    if (confirm('Yakin ingin logout?')) {
        try {
            if (ordersUnsubscribe) ordersUnsubscribe();
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Gagal logout');
        }
    }
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
