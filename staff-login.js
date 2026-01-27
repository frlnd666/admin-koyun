import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

const form = document.getElementById('staffLoginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('errorMsg');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        errorMsg.textContent = 'Mohon lengkapi semua field';
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Login...</span>';
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (!userDoc.exists()) {
            errorMsg.textContent = 'User tidak terdaftar di sistem';
            await auth.signOut();
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                <span>Login</span>
            `;
            return;
        }
        
        const userData = userDoc.data();
        
        if (userData.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (userData.role === 'kasir') {
            window.location.href = 'kasir.html';
        } else {
            errorMsg.textContent = 'Akses tidak diizinkan. Hanya untuk admin dan kasir.';
            await auth.signOut();
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                <span>Login</span>
            `;
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errorMsg.textContent = 'Email atau password salah';
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg.textContent = 'Terlalu banyak percobaan login. Coba lagi nanti.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg.textContent = 'Tidak ada koneksi internet';
        } else {
            errorMsg.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
        }
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span>Login</span>
        `;
    }
});
