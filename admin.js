/* ============================================
   KoYun Coffee V2.0 - Staff Login
   Role-Based Access Control
   PRODUCTION VERSION - PERFECT
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
        
        // Only redirect if we're on login page
        const currentPath = window.location.pathname;
        if (currentPath.includes('admin.html') || currentPath === '/' || currentPath.endsWith('/')) {
            await redirectBasedOnRole(user);
        }
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
        
        console.log('✅ Authentication successful, UID:', user.uid);
        
        loginBtnText.textContent = 'Verifying access...';
        
        // Check role and redirect
        await redirectBasedOnRole(user);
        
    } catch (error) {
        console.error('❌ Login error:', error.code, error.message);
        
        // User-friendly error messages
        let message = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                message = 'Invalid email or password';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Try again later.';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Check your connection.';
                break;
            case 'auth/invalid-email':
                message = 'Invalid email format';
                break;
            case 'auth/user-disabled':
                message = 'Account disabled. Contact admin.';
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
        console.log('🔍 Fetching user document for UID:', user.uid);
        
        // Get user document directly by UID
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            console.error('❌ User document not found in Firestore');
            console.log('💡 Tip: Create document in Firestore with ID:', user.uid);
            
            showError('User not found. Please contact administrator.');
            
            // Reset button if on login page
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Login to Dashboard';
            }
            return;
        }
        
        const userData = userDocSnap.data();
        const role = userData.role || 'kasir';
        
        console.log('✅ User data:', {
            email: userData.email,
            role: role,
            name: userData.name
        });
        
        // Check if user is active
        if (userData.active === false) {
            showError('Account is disabled. Contact administrator.');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Login to Dashboard';
            }
            return;
        }
        
        // Redirect based on role
        redirectTo(role);
        
    } catch (error) {
        console.error('❌ Role check error:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            uid: user.uid
        });
        
        showError('Failed to verify role. Please try again.');
        
        // Reset button
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtnText.textContent = 'Login to Dashboard';
        }
    }
}

function redirectTo(role) {
    if (loginBtnText) {
        loginBtnText.textContent = '✓ Success! Redirecting...';
    }
    if (loginBtn) {
        loginBtn.style.background = '#2ECC71';
    }
    
    const destination = role === 'admin' ? '/dashboard-admin.html' : '/kasir.html';
    console.log('🔄 Redirecting to:', destination);
    
    setTimeout(() => {
        window.location.href = destination;
    }, 800);
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
