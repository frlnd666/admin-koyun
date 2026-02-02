import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDOUb7G6NBe2IKTyLYKFYyf7e0uiNoDoBs",
  authDomain: "koyun-id.firebaseapp.com",
  projectId: "koyun-id",
  storageBucket: "koyun-id.firebasestorage.app",
  messagingSenderId: "672101013741",
  appId: "1:672101013741:web:64b367d77ec8df8ecf14e4"
};

const cloudinaryConfig = {
    cloudName: "promohub",
    uploadPreset: "promohub"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const productsGrid = document.getElementById('productsGrid');
const expensesTable = document.getElementById('expensesTable');
const salesContent = document.getElementById('salesContent');
const tablesGrid = document.getElementById('tablesGrid');
const logoutBtn = document.getElementById('logoutBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');

const productModal = document.getElementById('productModal');
const expenseModal = document.getElementById('expenseModal');
const productForm = document.getElementById('productForm');
const expenseForm = document.getElementById('expenseForm');
const closeProductModal = document.getElementById('closeProductModal');
const closeExpenseModal = document.getElementById('closeExpenseModal');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
            await signOut(auth);
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = { uid: user.uid, ...userDoc.data() };
        
        loadProducts();
        loadExpenses();
        loadTables();
        loadKasirList();
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

let productsData = [];

async function loadProducts() {
    try {
        const snapshot = await getDocs(collection(db, 'products'));
        productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p style="padding:40px; text-align:center; color:var(--danger);">Gagal memuat produk</p>';
    }
}

function renderProducts() {
    if (productsData.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="1.5" style="margin-bottom:20px;">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                </svg>
                <h3 style="color:var(--text-medium); margin-bottom:8px;">Belum Ada Produk</h3>
                <p style="color:var(--text-light);">Klik "Tambah Produk" untuk mulai menambahkan menu</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = productsData.map(product => `
        <div class="product-card">
            <img src="${product.imageUrl || 'https://via.placeholder.com/300x200/6F4E37/FFFFFF?text=' + encodeURIComponent(product.name)}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x200/6F4E37/FFFFFF?text=KoYun'">
            <div class="product-info">
                <h3 style="font-size:1.2rem; margin-bottom:8px;">${product.name}</h3>
                <p style="color:var(--text-light); font-size:0.9rem; margin:8px 0;">
                    <span style="background:var(--bg-light); padding:4px 12px; border-radius:12px; display:inline-block; font-weight:600;">${getCategoryName(product.category)}</span>
                </p>
                <p style="font-weight:700; color:var(--primary-color); font-size:1.3rem; margin-top:12px;">Rp ${product.price.toLocaleString('id-ID')}</p>
                <p style="font-size:0.85rem; color:var(--text-light); margin-top:8px;">
                    Status: <strong style="color:${product.active ? 'var(--success)' : 'var(--danger)'};">${product.active ? 'Aktif' : 'Tidak Aktif'}</strong>
                </p>
            </div>
            <div class="product-actions">
                <button class="btn-edit" data-id="${product.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
                <button class="btn-delete" data-id="${product.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Hapus
                </button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
}

function getCategoryName(category) {
    const names = {
        'coffee': 'Coffee',
        'non-coffee': 'Non Coffee',
        'snack': 'Snack'
    };
    return names[category] || category;
}

document.getElementById('addProductBtn').addEventListener('click', () => {
    document.getElementById('productModalTitle').textContent = 'Tambah Produk';
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

function editProduct(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;
    
    document.getElementById('productModalTitle').textContent = 'Edit Produk';
    document.getElementById('productId').value = id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDesc').value = product.description || '';
    
    if (product.imageUrl) {
        const preview = document.getElementById('imagePreview');
        preview.src = product.imageUrl;
        preview.style.display = 'block';
    }
    
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function deleteProduct(id) {
    if (!confirm('Hapus produk ini? Tindakan ini tidak dapat dibatalkan.')) return;
    
    try {
        await deleteDoc(doc(db, 'products', id));
        alert('Produk berhasil dihapus');
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Gagal menghapus produk');
    }
}

document.getElementById('productImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5000000) {
            alert('Ukuran file terlalu besar. Maksimal 5MB');
            e.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('imagePreview');
            preview.src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const description = document.getElementById('productDesc').value.trim();
    const imageFile = document.getElementById('productImage').files[0];
    
    if (!name || !category || !price) {
        alert('Mohon lengkapi semua field yang wajib diisi');
        return;
    }
    
    const submitBtn = productForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Menyimpan...</span>';
    
    let imageUrl = '';
    
    if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const data = await response.json();
            imageUrl = data.secure_url;
        } catch (error) {
            console.error('Upload error:', error);
            alert('Gagal upload gambar. Pastikan konfigurasi Cloudinary sudah benar.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Simpan</span>';
            return;
        }
    } else if (productId) {
        const existing = productsData.find(p => p.id === productId);
        imageUrl = existing ? existing.imageUrl || '' : '';
    }
    
    const productData = {
        name,
        category,
        price,
        description,
        imageUrl,
        active: true,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (productId) {
            await updateDoc(doc(db, 'products', productId), productData);
            alert('Produk berhasil diupdate');
        } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            alert('Produk berhasil ditambahkan');
        }
        
        productModal.classList.remove('active');
        document.body.style.overflow = '';
        loadProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Gagal menyimpan produk');
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Simpan</span>';
});

let expensesData = [];

async function loadExpenses() {
    try {
        const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExpenses();
    } catch (error) {
        console.error('Error loading expenses:', error);
        expensesTable.innerHTML = '<p style="padding:40px; text-align:center; color:var(--danger);">Gagal memuat pengeluaran</p>';
    }
}

function renderExpenses() {
    if (expensesData.length === 0) {
        expensesTable.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="1.5" style="margin-bottom:20px;">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <h3 style="color:var(--text-medium); margin-bottom:8px;">Belum Ada Data Pengeluaran</h3>
                <p style="color:var(--text-light);">Klik "Tambah Pengeluaran" untuk mencatat pengeluaran</p>
            </div>
        `;
        return;
    }
    
    const totalExpense = expensesData.reduce((sum, exp) => sum + exp.amount, 0);
    
    expensesTable.innerHTML = `
        <div style="background:linear-gradient(135deg, var(--white), var(--bg-cream)); padding:32px; border-radius:var(--border-radius-lg); margin-bottom:24px; box-shadow:var(--shadow); border-left:6px solid var(--danger);">
            <h3 style="color:var(--text-dark); margin-bottom:12px; font-size:1rem; text-transform:uppercase; letter-spacing:0.5px;">💸 Total Pengeluaran</h3>
            <p style="font-size:3rem; font-weight:700; color:var(--danger); font-family:'Playfair Display', serif;">Rp ${totalExpense.toLocaleString('id-ID')}</p>
            <p style="font-size:0.95rem; color:var(--text-light); margin-top:8px;">${expensesData.length} transaksi tercatat</p>
        </div>
        <div style="background:var(--white); border-radius:var(--border-radius-lg); overflow:hidden; box-shadow:var(--shadow);">
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:var(--primary-color); color:var(--white);">
                    <tr>
                        <th style="padding:18px; text-align:left; font-weight:600;">Tanggal</th>
                        <th style="padding:18px; text-align:left; font-weight:600;">Deskripsi</th>
                        <th style="padding:18px; text-align:left; font-weight:600;">Kategori</th>
                        <th style="padding:18px; text-align:right; font-weight:600;">Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    ${expensesData.map((exp, index) => {
                        const date = exp.createdAt ? 
                            new Date(exp.createdAt.seconds * 1000).toLocaleDateString('id-ID', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                            }) : 
                            '-';
                        const bgColor = index % 2 === 0 ? 'var(--bg-cream)' : 'var(--white)';
                        return `
                            <tr style="background:${bgColor}; border-bottom:1px solid var(--bg-light);">
                                <td style="padding:16px; color:var(--text-medium);">${date}</td>
                                <td style="padding:16px; color:var(--text-dark); font-weight:500;">${exp.description}</td>
                                <td style="padding:16px;">
                                    <span style="background:var(--bg-light); padding:6px 14px; border-radius:16px; font-size:0.85rem; font-weight:600; color:var(--text-medium); text-transform:capitalize;">
                                        ${exp.category}
                                    </span>
                                </td>
                                <td style="padding:16px; text-align:right; font-weight:700; color:var(--danger); font-size:1.1rem;">
                                    Rp ${exp.amount.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

document.getElementById('addExpenseBtn').addEventListener('click', () => {
    expenseForm.reset();
    expenseModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const description = document.getElementById('expenseDesc').value.trim();
    const amount = parseInt(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    
    if (!description || !amount || amount <= 0) {
        alert('Mohon lengkapi semua field dengan benar');
        return;
    }
    
    const submitBtn = expenseForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Menyimpan...</span>';
    
    const expenseData = {
        description,
        amount,
        category,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
    };
    
    try {
        await addDoc(collection(db, 'expenses'), expenseData);
        alert('Pengeluaran berhasil ditambahkan');
        expenseModal.classList.remove('active');
        document.body.style.overflow = '';
        loadExpenses();
    } catch (error) {
        console.error('Error saving expense:', error);
        alert('Gagal menyimpan pengeluaran');
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Simpan</span>';
});

let kasirList = [];

async function loadKasirList() {
    try {
        const q = query(collection(db, 'users'), where('role', '==', 'kasir'));
        const snapshot = await getDocs(q);
        kasirList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const filterKasir = document.getElementById('filterKasir');
        filterKasir.innerHTML = '<option value="all">Semua Kasir</option>' +
            kasirList.map(k => `<option value="${k.id}">${k.name || k.email}</option>`).join('');
    } catch (error) {
        console.error('Error loading kasir list:', error);
    }
}

document.getElementById('generateSalesBtn').addEventListener('click', async () => {
    const period = document.getElementById('salesPeriod').value;
    const kasirFilter = document.getElementById('filterKasir').value;
    
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
    
    const generateBtn = document.getElementById('generateSalesBtn');
    generateBtn.textContent = 'Memuat...';
    generateBtn.disabled = true;
    
    try {
        const q = query(
            collection(db, 'orders'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('createdAt', '<=', Timestamp.fromDate(endDate))
        );
        
        const snapshot = await getDocs(q);
        let orders = snapshot.docs.map(doc => doc.data());
        
        if (kasirFilter !== 'all') {
            orders = orders.filter(o => o.processedBy === kasirFilter);
        }
        
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
        
        salesContent.innerHTML = `
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
                    <div class="value">Rp ${Math.round(avgOrder).toLocaleString('id-ID')}</div>
                    <p style="font-size:0.85rem; color:var(--text-light); margin-top:8px;">
                        Per transaksi
                    </p>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:24px; margin-top:24px;">
                <div style="background:var(--white); padding:32px; border-radius:var(--border-radius-lg); box-shadow:var(--shadow);">
                    <h3 style="margin-bottom:24px; color:var(--primary-color); display:flex; align-items:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Metode Pembayaran
                    </h3>
                    ${Object.entries(paymentStats).map(([method, count]) => {
                        const revenue = paymentRevenue[method] || 0;
                        const percentage = completedOrders.length > 0 ? Math.round((count / completedOrders.length) * 100) : 0;
                        return `
                            <div style="padding:16px 0; border-bottom:1px solid var(--bg-light);">
                                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                    <span style="font-weight:600; text-transform:uppercase;">${method}</span>
                                    <strong style="color:var(--primary-color);">${count} (${percentage}%)</strong>
                                </div>
                                <div style="font-size:1.1rem; color:var(--text-medium); font-weight:600;">
                                    Rp ${revenue.toLocaleString('id-ID')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="background:var(--white); padding:32px; border-radius:var(--border-radius-lg); box-shadow:var(--shadow);">
                    <h3 style="margin-bottom:24px; color:var(--primary-color); display:flex; align-items:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Status Pesanan
                    </h3>
                    <div style="padding:16px 0; border-bottom:1px solid var(--bg-light);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600;">✅ Completed</span>
                            <strong style="color:var(--success); font-size:1.4rem;">${completedOrders.length}</strong>
                        </div>
                    </div>
                    <div style="padding:16px 0; border-bottom:1px solid var(--bg-light);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600;">🔄 Processing</span>
                            <strong style="color:var(--info); font-size:1.4rem;">${processingOrders}</strong>
                        </div>
                    </div>
                    <div style="padding:16px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600;">⏳ Pending</span>
                            <strong style="color:var(--warning); font-size:1.4rem;">${pendingOrders}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating sales report:', error);
        salesContent.innerHTML = '<p style="padding:40px; text-align:center; color:var(--danger);">Gagal generate laporan. Silakan coba lagi.</p>';
    }
    
    generateBtn.textContent = 'Generate';
    generateBtn.disabled = false;
});

async function loadTables() {
    try {
        const q = query(collection(db, 'tables'), orderBy('number'));
        const snapshot = await getDocs(q);
        const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTables(tables);
    } catch (error) {
        console.error('Error loading tables:', error);
        tablesGrid.innerHTML = '<p style="padding:40px; text-align:center; color:var(--danger);">Gagal memuat data meja</p>';
    }
}

function renderTables(tables) {
    if (tables.length === 0) {
        tablesGrid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="1.5" style="margin-bottom:20px;">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
                <h3 style="color:var(--text-medium); margin-bottom:8px;">Belum Ada Meja</h3>
                <p style="color:var(--text-light);">Klik "Generate Meja Baru" untuk membuat QR Code meja</p>
            </div>
        `;
        return;
    }
    
    const baseURL = 'https://koyun.vercel.app'; 

    
    tablesGrid.innerHTML = tables.map(table => `
        <div class="qr-card">
            <div style="background:var(--primary-color); color:var(--white); padding:16px; border-radius:12px 12px 0 0; margin:-24px -24px 20px;">
                <h3 style="margin:0; font-size:1.5rem; font-family:'Playfair Display', serif;">Meja ${table.number}</h3>
            </div>
            <div class="qr-code" id="qr-${table.number}"></div>
            <p style="font-size:0.9rem; color:var(--text-light); margin:16px 0 20px; line-height:1.4;">
                📱 Scan QR Code ini untuk<br>mengakses menu KoYun
            </p>
            <button class="btn-primary" onclick="downloadQR('qr-${table.number}', 'KoYun-Meja-${table.number}')" style="width:100%;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download QR
            </button>
        </div>
    `).join('');
    
    tables.forEach(table => {
        const qrContainer = document.getElementById(`qr-${table.number}`);
        if (qrContainer) {
            new QRCode(qrContainer, {
                text: `${baseURL}?table=${table.number}`,
                width: 180,
                height: 180,
                colorDark: "#6F4E37",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    });
}

document.getElementById('generateTableBtn').addEventListener('click', async () => {
    const tableNumber = prompt('Masukkan nomor meja (contoh: 1, 2, 3, dst):');
    
    if (!tableNumber) return;
    
    if (!/^\d+$/.test(tableNumber)) {
        alert('Nomor meja harus berupa angka');
        return;
    }
    
    try {
        const q = query(collection(db, 'tables'), where('number', '==', tableNumber));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            alert('Nomor meja sudah ada. Gunakan nomor lain.');
            return;
        }
        
        await addDoc(collection(db, 'tables'), {
            number: tableNumber,
            active: true,
            createdAt: serverTimestamp()
        });
        
        alert(`Meja ${tableNumber} berhasil dibuat!`);
        loadTables();
    } catch (error) {
        console.error('Error creating table:', error);
        alert('Gagal membuat meja');
    }
});

window.downloadQR = function(elementId, filename) {
    const qrElement = document.getElementById(elementId);
    const canvas = qrElement.querySelector('canvas');
    
    if (canvas) {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        tempCanvas.width = canvas.width + 100;
        tempCanvas.height = canvas.height + 160;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        ctx.fillStyle = '#6F4E37';
        ctx.font = 'bold 32px Playfair Display';
        ctx.textAlign = 'center';
        ctx.fillText('KoYun Coffee', tempCanvas.width / 2, 45);
        
        ctx.drawImage(canvas, 50, 80);
        
        ctx.font = '18px Poppins';
        ctx.fillText('Scan untuk lihat menu', tempCanvas.width / 2, tempCanvas.height - 30);
        
        const url = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        link.click();
    }
};

closeProductModal.addEventListener('click', () => {
    productModal.classList.remove('active');
    document.body.style.overflow = '';
});

closeExpenseModal.addEventListener('click', () => {
    expenseModal.classList.remove('active');
    document.body.style.overflow = '';
});

productModal.addEventListener('click', (e) => {
    if (e.target === productModal) {
        productModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

expenseModal.addEventListener('click', (e) => {
    if (e.target === expenseModal) {
        expenseModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

logoutBtn.addEventListener('click', async () => {
    if (confirm('Yakin ingin logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Gagal logout');
        }
    }
});
