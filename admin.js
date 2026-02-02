/* ============================================
   KoYun Coffee V2.0 - Staff Login
   Role-Based Access Control
   PRODUCTION VERSION
   ============================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const auth = getAuth(app);
const db = getFirestore(app);

console.log('✅ Firebase initialized');

// ============================================
// DOM Elements
// ============================================

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const errorMessage = document.getElementById('errorMessage');

// ============================================
// Check if Already Logged In
// ============================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('✅ User already authenticated:', user.email);
        await redirectBasedOnRole(user);
    }
});

// ============================================
// Login Form Submit
// ============================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }
    
    // Disable button
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Authenticating...';
    hideError();
    
    try {
        console.log('🔐 Attempting login for:', email);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Authentication successful');
        
        loginBtnText.textContent = 'Verifying access...';
        
        // Check role and redirect
        await redirectBasedOnRole(user);
        
    } catch (error) {
        console.error('❌ Login error:', error.code);
        
        // User-friendly error messages
        let message = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                message = 'Invalid email or password';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Check your internet connection.';
                break;
            case 'auth/invalid-email':
                message = 'Invalid email format';
                break;
            case 'auth/user-disabled':
                message = 'This account has been disabled';
                break;
        }
        
        showError(message);
        
        // Reset button
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Login to Dashboard';
    }
});

// ============================================
// Role-Based Redirect
// ============================================

async function redirectBasedOnRole(user) {
    try {
        console.log('🔍 Checking user role...');
        
        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            console.warn('⚠️ User document not found, creating default...');
            // Default to kasir if no user doc exists
            redirectTo('kasir');
            return;
        }
        
        const userData = userDoc.data();
        const role = userData.role || 'kasir';
        
        console.log('👤 User role:', role);
        
        // Redirect based on role
        redirectTo(role);
        
    } catch (error) {
        console.error('❌ Role check error:', error);
        // Default to kasir on error
        redirectTo('kasir');
    }
}

function redirectTo(role) {
    loginBtnText.textContent = '✓ Success! Redirecting...';
    loginBtn.style.background = 'var(--success)';
    
    setTimeout(() => {
        if (role === 'admin') {
            console.log('🔄 Redirecting to Admin Dashboard');
            window.location.href = '/dashboard-admin.html';
        } else {
            console.log('🔄 Redirecting to Kasir Dashboard');
            window.location.href = '/kasir.html';
        }
    }, 500);
}

// ============================================
// Error Display
// ============================================

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

console.log('✅ Login page initialized');
