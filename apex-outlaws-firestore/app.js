// Apex Outlaws — Firebase Authentication + Cloud Firestore
// Project: apex-outlaws-2509
// Add a Firebase WEB app in Project settings and paste its Web App ID below.
// The Android google-services.json app_id is NOT the Web App ID.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
  onSnapshot, query, orderBy, limit, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRHGpZKVBX15R9dw3Yen7U69rXvgII8SE",
  authDomain: "apex-outlaws-2509.firebaseapp.com",
  projectId: "apex-outlaws-2509",
  storageBucket: "apex-outlaws-2509.firebasestorage.app",
  messagingSenderId: "9526482179",
  appId: "PASTE_WEB_APP_ID_FROM_FIREBASE_CONSOLE"
};

const ADMIN_UID = "0u90kcoJ5Wfx1Prvoa5FKv8FZEF2";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
let currentUser = null;
let isSignup = false;
let allPlayers = {};
let stopPlayerListener = null;
let stopActivityListener = null;
let adminListenerStarted = false;

const toast = message => {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2800);
};
const esc = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText = value => {
  if (!value) return "—";
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"});
};
const isAdmin = () => !!currentUser && currentUser.uid === ADMIN_UID;
const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click",()=>hide(b.dataset.close)));
$("openAuthBtn").addEventListener("click",()=>show("authModal"));
$("heroAuthBtn").addEventListener("click",()=>currentUser ? $("profile").scrollIntoView({behavior:"smooth"}) : show("authModal"));
$("logoutBtn").addEventListener("click",async()=>{await signOut(auth);toast("Signed out.");});
$("menuToggle").addEventListener("click",()=>$("nav-links").classList.toggle("open"));
document.querySelector(".nav-links").id = "nav-links";
document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>$("nav-links").classList.remove("open")));

function setAuthMode(signup) {
  isSignup = signup;
  $("signUpTab").classList.toggle("active",signup);
  $("signInTab").classList.toggle("active",!signup);
  $("nameField").classList.toggle("hidden",!signup);
  $("authHeading").innerHTML = signup ? 'JOIN THE <em>OUTLAWS.</em>' : 'WELCOME <em>BACK.</em>';
  $("authSubmit").textContent = signup ? "CREATE ACCOUNT ↗" : "SIGN IN ↗";
  $("authPassword").autocomplete = signup ? "new-password" : "current-password";
  $("authError").textContent = "";
}
$("signInTab").addEventListener("click",()=>setAuthMode(false));
$("signUpTab").addEventListener("click",()=>setAuthMode(true));

function authMessage(code) {
  const messages = {
    "auth/email-already-in-use":"An account already exists with this email.",
    "auth/invalid-email":"Enter a valid email address.",
    "auth/weak-password":"Password must contain at least 6 characters.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "permission-denied":"Firestore denied this action. Check that the published rules contain your admin UID."
  };
  return messages[code] || "Could not complete the request: " + (code || "unknown error");
}

$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  $("authError").textContent="";
  const email=$("authEmail").value.trim();
  const password=$("authPassword").value;
  const username=$("authName").value.trim() || "Outlaw";
  $("authSubmit").disabled=true;
  try {
    let credential;
    if(isSignup) {
      credential=await createUserWithEmailAndPassword(auth,email,password);
      await updateProfile(credential.user,{displayName:username});
      const userRef=doc(db,"users",credential.user.uid);
      await setDoc(userRef,{
        uid:credential.user.uid, username, email,
        createdAt:Date.now(), status:"active", currency:{AC:0}
      });
      await addDoc(collection(db,"users",credential.user.uid,"activity"),{
        type:"account_created",message:"Apex Outlaws account created",createdAt:Date.now()
      });
    } else {
      credential=await signInWithEmailAndPassword(auth,email,password);
    }
    hide("authModal");$("authForm").reset();toast(isSignup?"Welcome to Apex Outlaws.":"Welcome back.");
  } catch(err) {
    $("authError").textContent=authMessage(err.code);
  } finally {$("authSubmit").disabled=false;}
});

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  $("openAuthBtn").classList.toggle("hidden",!!user);
  $("logoutBtn").classList.toggle("hidden",!user);
  $("headerWallet").classList.toggle("hidden",!user);
  $("profile").classList.toggle("hidden",!user);
  $("adminPanel").classList.toggle("hidden",!isAdmin());

  if(stopPlayerListener){stopPlayerListener();stopPlayerListener=null;}
  if(stopActivityListener){stopActivityListener();stopActivityListener=null;}
  adminListenerStarted=false;
  allPlayers={};
  if(!user) {
    $("playerName").textContent="Outlaw";$("playerEmail").textContent="Not signed in";
    $("playerUid").textContent="—";$("memberSince").textContent="—";
    $("walletBalance").textContent="0";$("headerBalance").textContent="0";
    return;
  }

  const userRef=doc(db,"users",user.uid);
  try {
    const snap=await getDoc(userRef);
    if(!snap.exists()) {
      // Link a pre-existing Firebase Auth account to the Firestore UID document.
      // New profile starts with zero AC; a player cannot initialize their own balance.
      await setDoc(userRef,{
        uid:user.uid,username:user.displayName||"Outlaw",email:user.email||"",
        createdAt:Date.now(),status:"active",currency:{AC:0}
      });
    }
  } catch(err) {
    toast("Could not load player profile: "+err.message);
    return;
  }

  stopPlayerListener=onSnapshot(userRef,s=>{
    const p=s.data()||{};
    const name=p.username||user.displayName||"Outlaw";
    const balance=Number(p.currency?.AC||0);
    $("playerName").textContent=name;
    $("playerEmail").textContent=p.email||user.email||"";
    $("playerUid").textContent=user.uid;
    $("memberSince").textContent=dateText(p.createdAt);
    $("avatarInitials").textContent=name.slice(0,2).toUpperCase();
    $("walletBalance").textContent=balance.toLocaleString("en-IN");
    $("headerBalance").textContent=balance.toLocaleString("en-IN");
    $("editName").value=name;
  },err=>toast("Player profile: "+err.message));

  stopActivityListener=onSnapshot(query(collection(db,"users",user.uid,"activity"),orderBy("createdAt","desc"),limit(5)),s=>{
    const items=s.docs.map(d=>d.data());
    $("activityList").innerHTML=items.length?items.map(x=>`<div class="activity-row">${esc(x.message||x.type||"Account activity")} <small>${dateText(x.createdAt)}</small></div>`).join(""):"No activity yet.";
  },()=>{$("activityList").textContent="No activity available.";});

  if(isAdmin()) startAdminListener();
});

$("editProfileBtn").addEventListener("click",()=>show("editModal"));
$("editForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!currentUser)return;
  const username=$("editName").value.trim();
  if(username.length<3){$("editError").textContent="Gamer tag must be at least 3 characters.";return;}
  try {
    await updateDoc(doc(db,"users",currentUser.uid),{username});
    await updateProfile(currentUser,{displayName:username});
    hide("editModal");toast("Profile updated.");
  } catch(err){$("editError").textContent=err.message;}
});

onSnapshot(query(collection(db,"news"),orderBy("createdAt","desc"),limit(30)),s=>{
  const posts=s.docs.map(d=>({id:d.id,...d.data()}));
  $("newsFeed").innerHTML=posts.length?posts.map(p=>`
    <article class="news-card">
      <div class="news-image" ${p.imageUrl?`style="background-image:linear-gradient(0deg,#11151922,transparent),url('${esc(p.imageUrl)}')"`:""}><span class="news-category">${esc(p.category||"DISPATCH")}</span></div>
      <div class="news-copy"><h3>${esc(p.title||"Untitled dispatch")}</h3><p>${esc(p.body||"")}</p><span class="news-date">${dateText(p.createdAt)} · APEX INTEL</span></div>
    </article>`).join(""):'<div class="empty-state panel">No dispatches yet. Check back soon.</div>';
},err=>{$("newsFeed").innerHTML=`<div class="empty-state panel">Could not load news: ${esc(err.message)}</div>`;});

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));
  $("publishTab").classList.toggle("hidden",tab.dataset.tab!=="publish");
  $("playersTab").classList.toggle("hidden",tab.dataset.tab!=="players");
}));

$("postForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!isAdmin()){toast("Admin access required.");return;}
  const post={
    title:$("postTitle").value.trim(),category:$("postCategory").value,
    body:$("postBody").value.trim(),imageUrl:$("postImage").value.trim(),
    createdAt:Date.now(),authorUid:currentUser.uid
  };
  try {
    await addDoc(collection(db,"news"),post);
    $("postForm").reset();toast("Dispatch published.");
  } catch(err){toast("Publish failed: "+err.message);}
});

function startAdminListener(){
  if(adminListenerStarted)return;
  adminListenerStarted=true;
  onSnapshot(collection(db,"users"),s=>{
    allPlayers={};
    s.docs.forEach(d=>allPlayers[d.id]=d.data());
    renderPlayers();
  },err=>toast("Player database: "+err.message));
}
function renderPlayers(){
  const term=($("playerSearch").value||"").toLowerCase();
  const rows=Object.entries(allPlayers).filter(([uid,p])=>(p.username||"").toLowerCase().includes(term)||uid.toLowerCase().includes(term));
  $("playersTable").innerHTML=rows.length?rows.map(([uid,p])=>{
    const bal=Number(p.currency?.AC||0);
    return `<tr><td><b>${esc(p.username||"Outlaw")}</b><br><small>${esc(p.email||"")}</small></td><td class="mono">${esc(uid)}</td><td>${bal.toLocaleString("en-IN")} AC</td><td>${esc(p.status||"active")}</td><td><input class="credit-input" type="number" min="0" step="1" placeholder="Amount" id="amount-${esc(uid)}"><button class="btn btn-red btn-small" data-credit="${esc(uid)}" data-action="add">ADD</button><button class="btn btn-outline btn-small" data-credit="${esc(uid)}" data-action="remove">REMOVE</button></td></tr>`;
  }).join(""):'<tr><td colspan="5">No matching player accounts.</td></tr>';
}
$("playerSearch").addEventListener("input",renderPlayers);
$("playersTable").addEventListener("click",async e=>{
  const btn=e.target.closest("[data-credit]");if(!btn)return;
  if(!isAdmin()){toast("Admin access required.");return;}
  const uid=btn.dataset.credit,amount=Number($(`amount-${uid}`).value);
  if(!Number.isSafeInteger(amount)||amount<=0){toast("Enter a whole number greater than zero.");return;}
  try {
    const playerRef=doc(db,"users",uid);
    const next=await runTransaction(db,async transaction=>{
      const snap=await transaction.get(playerRef);
      if(!snap.exists())throw new Error("Player account not found.");
      const current=Number(snap.data().currency?.AC||0);
      const updated=btn.dataset.action==="add"?current+amount:current-amount;
      if(updated<0)throw new Error("Player does not have enough AC.");
      transaction.update(playerRef,{"currency.AC":updated});
      return updated;
    });
    await addDoc(collection(db,"users",uid,"activity"),{
      type:"currency_adjustment",
      message:`Admin ${btn.dataset.action==="add"?"added":"removed"} ${amount} AC`,
      createdAt:Date.now()
    });
    $(`amount-${uid}`).value="";
    toast(`Balance updated: ${next.toLocaleString("en-IN")} AC`);
  } catch(err){toast("Currency update failed: "+err.message);}
});
