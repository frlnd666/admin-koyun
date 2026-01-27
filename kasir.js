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

const ordersGrid = document.getElementById('ordersGrid');
const reportContent = document.getElementById('reportContent');
const logoutBtn = document.getElementById('logoutBtn');
const userRole = document.getElementById('userRole');
const reportPeriod = document.getElementById('reportPeriod');
const customDateRange = document.getElementById('customDateRange');
const generateReportBtn = document.getElementById('generateReportBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');

let currentUser = null;
let currentFilter = 'all';
let ordersUnsubscribe = null;

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

mobileMenuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.status;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderOrders();
    });
});

let ordersData = [];

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

function renderOrders() {
    const filtered = currentFilter === 'all' 
        ? ordersData 
        : ordersData.filter(o => o.status === currentFilter);
    
    if (filtered.length === 0) {
        ordersGrid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="1.5" style="margin-bottom:20px;">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                <h3 style="color:var(--text-medium); margin-bottom:8px;">Tidak Ada Pesanan</h3>
                <p style="color:var(--text-light);">Pesanan akan muncul di sini secara real-time</p>
            </div>
        `;
        return;
    }
    
    ordersGrid.innerHTML = filtered.map(order => {
        const createdTime = order.createdAt ? 
            new Date(order.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 
            '-';
        
        return `
            <div class="order-card ${order.status}">
                <div class="order-header">
                    <div>
                        <strong style="font-size:1.2rem; color:var(--primary-color);">Meja ${order.tableNumber}</strong>
                        <p style="font-size:0.9rem; color:var(--text-light); margin-top:4px;">📱 ${order.customerPhone}</p>
                        <p style="font-size:0.85rem; color:var(--text-light); margin-top:2px;">🕒 ${createdTime}</p>
                    </div>
                    <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span>${item.quantity}x ${item.name}</span>
                            <span style="font-weight:600; color:var(--primary-color);">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:16px; border-top:2px solid var(--bg-light);">
                    <div>
                        <p style="font-size:0.85rem; color:var(--text-light); margin-bottom:4px;">Total</p>
                        <strong style="font-size:1.4rem; color:var(--primary-color);">Rp ${order.total.toLocaleString('id-ID')}</strong>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.9rem; color:var(--text-medium); font-weight:600; background:var(--bg-cream); padding:6px 12px; border-radius:8px;">${order.paymentMethod.toUpperCase()}</span>
                    </div>
                </div>
                ${renderOrderActions(order)}
            </div>
        `;
    }).join('');
    
    attachOrderActions();
}

function getStatusText(status) {
    const texts = {
        pending: 'Pending',
        processing: 'Diproses',
        completed: 'Selesai'
    };
    return texts[status] || status;
}

function renderOrderActions(order) {
    if (order.status === 'pending') {
        return `
            <div class="order-actions">
                <button class="btn-action btn-process" data-id="${order.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Proses Pesanan
                </button>
            </div>
        `;
    } else if (order.status === 'processing') {
        return `
            <div class="order-actions">
                <button class="btn-action btn-complete" data-id="${order.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

function attachOrderActions() {
    document.querySelectorAll('.btn-process').forEach(btn => {
        btn.addEventListener('click', () => updateOrderStatus(btn.dataset.id, 'processing'));
    });
    
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', () => updateOrderStatus(btn.dataset.id, 'completed'));
    });
}

async function updateOrderStatus(orderId, status) {
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: status,
            updatedAt: serverTimestamp(),
            processedBy: currentUser.uid
        });
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Gagal update status pesanan');
    }
}

reportPeriod.addEventListener('change', () => {
    if (reportPeriod.value === 'custom') {
        customDateRange.style.display = 'flex';
        customDateRange.classList.add('active');
    } else {
        customDateRange.style.display = 'none';
        customDateRange.classList.remove('active');
    }
});

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
        const startInput = document.getElementById('startDate').value;
        const endInput = document.getElementById('endDate').value;
        if (!startInput || !endInput) {
            alert('Pilih tanggal mulai dan akhir');
            return;
        }
        startDate = new Date(startInput);
        endDate = new Date(endInput);
        endDate.setHours(23, 59, 59, 999);
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
                <div class="summary-card">
                    <h3>Total Pesanan</h3>
                    <div class="value">${totalOrders}</div>
                    <p style="font-size:0.85rem; color:var(--text-light); margin-top:8px;">
                        Pending: ${pendingOrders} | Proses: ${processingOrders}
                    </p>
                </div>
                <div class="summary-card">
                    <h3>Selesai</h3>
                    <div class="value" style="color:var(--success);">${completedOrders.length}</div>
                    <p style="font-size:0.85rem; color:var(--text-light); margin-top:8px;">
                        ${totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0}% completion rate
                    </p>
                </div>
                <div class="summary-card">
                    <h3>Total Pendapatan</h3>
                    <div class="value">Rp ${totalRevenue.toLocaleString('id-ID')}</div>
                    <p style="font-size:0.85rem; color:var(--text-light); margin-top:8px;">
                        Dari ${completedOrders.length} transaksi
                    </p>
                </div>
                <div class="summary-card">
                    <h3>Rata-rata Order</h3>
                    <div class="value">Rp ${completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length).toLocaleString('id-ID') : '0'}</div>
                    <p style="font-size:0.85rem; color:var(--text-light); margin-top:8px;">
                        Per transaksi
                    </p>
                </div>
            </div>
            
            <div style="background:var(--white); padding:32px; border-radius:var(--border-radius-lg); box-shadow:var(--shadow); margin-top:24px;">
                <h3 style="margin-bottom:24px; color:var(--primary-color);">💳 Metode Pembayaran</h3>
                ${Object.entries(paymentStats).map(([method, count]) => {
                    const revenue = paymentRevenue[method] || 0;
                    const percentage = completedOrders.length > 0 ? Math.round((count / completedOrders.length) * 100) : 0;
                    return `
                        <div style="padding:16px 0; border-bottom:1px solid var(--bg-light);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                <span style="font-weight:600; text-transform:uppercase;">${method}</span>
                                <strong style="color:var(--primary-color);">${count} transaksi (${percentage}%)</strong>
                            </div>
                            <div style="font-size:1.1rem; color:var(--text-medium); font-weight:600;">
                                Pendapatan: Rp ${revenue.toLocaleString('id-ID')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error generating report:', error);
        reportContent.innerHTML = '<p style="padding:40px; text-align:center; color:var(--danger);">Gagal generate laporan. Silakan coba lagi.</p>';
    }
    
    generateReportBtn.textContent = 'Generate';
    generateReportBtn.disabled = false;
});

logoutBtn.addEventListener('click', async () => {
    if (confirm('Yakin ingin logout?')) {
        if (ordersUnsubscribe) ordersUnsubscribe();
        await signOut(auth);
        window.location.href = 'index.html';
    }
});
