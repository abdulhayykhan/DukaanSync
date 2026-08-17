const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyBnXWE9-kmzP9_f95dD9F9RYEsWRnCCfAI",
  authDomain: "dukaansync.firebaseapp.com",
  projectId: "dukaansync",
  storageBucket: "dukaansync.firebasestorage.app",
  messagingSenderId: "707927545163",
  appId: "1:707927545163:web:177796ed1bae51aec484ce"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function runTest() {
  const email = "hacker1234@example.com";
  const password = "password123";
  let user;
  
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    user = cred.user;
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;
    } else {
      throw err;
    }
  }
  
  console.log('Logged in as:', user.uid);
  const token = await user.getIdToken();

  const businessId = "U6LwBWsEqtwv7hTynIia"; // Target Business
  const shopId = "Wb7ATjxgAzTKV84YnSP3"; // Target Shop

  const body = {
    businessId,
    shopId,
    userId: user.uid,
    data: {
      subtotalMinor: 100000,
      grandTotalMinor: 100000,
      amountPaidMinor: 100000,
      paymentMethod: "cash",
      paymentStatus: "paid",
      items: [
        {
          itemId: "inv_79x52rwly",
          name: "Rice (5kg)",
          quantity: 1,
          unitPriceMinor: 100000,
        }
      ]
    }
  };

  console.log("Sending checkout request...");
  const res = await fetch('http://localhost:3000/api/sales/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log("Response Status:", res.status);
  console.log("Response Body:", data);

  if (res.status === 403) {
    console.log("✅ Success! Endpoint returned 403 Forbidden.");
  } else {
    console.log("❌ Failure! Endpoint did not return 403.");
  }
  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
