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
