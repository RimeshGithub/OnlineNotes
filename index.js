/* === Imports === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js"
import { getAuth,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged, 
         GoogleAuthProvider,
         signInWithPopup } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js"
import { getFirestore,
         collection,
         addDoc,
         serverTimestamp,
         onSnapshot,
         query,
         where,
         orderBy,
         doc,
         updateDoc,
         deleteDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js"

/* === Firebase Setup === */
/* IMPORTANT: Replace this with your own firebaseConfig when doing challenges */
const firebaseConfig = {
  apiKey: "AIzaSyC3JfDWRpFegL2xV5_vUmE5p_0YRrNWoU4",
  authDomain: "fir-project-e955e.firebaseapp.com",
  databaseURL: "https://fir-project-e955e-default-rtdb.firebaseio.com",
  projectId: "fir-project-e955e",
  storageBucket: "fir-project-e955e.appspot.com",
  messagingSenderId: "67657787043",
  appId: "1:67657787043:web:ea8982f313ffd57e910116"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()
const db = getFirestore(app)

/* === UI === */

/* == UI - Elements == */

const viewLoggedOut = document.getElementById("logged-out-view")
const viewLoggedIn = document.getElementById("logged-in-view")

const signInWithGoogleButtonEl = document.getElementById("sign-in-with-google-btn")

const emailInputEl = document.getElementById("email-input")
const passwordInputEl = document.getElementById("password-input")

const signInButtonEl = document.getElementById("sign-in-btn")
const createAccountButtonEl = document.getElementById("create-account-btn")

const signOutButtonEl = document.getElementById("sign-out-btn")

const userProfilePictureEl = document.getElementById("user-profile-picture")
const userGreetingEl = document.getElementById("user-greeting")

const appEl = document.getElementById("app-container")

/* == UI - Event Listeners == */

signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle)

signInButtonEl.addEventListener("click", authSignInWithEmail)

createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail)

signOutButtonEl.addEventListener("click", authSignOut)

const collectionName = "notes"
let renderCount = 0

onAuthStateChanged(auth, (user) => {
    if (user) {
        showLoggedInView()
        showProfilePicture(userProfilePictureEl, user)
        showUserGreeting(userGreetingEl, user)
        fetchAllPosts(user)   
        
    } else {
        showLoggedOutView()
    }
})

/* === Functions === */

/* = Functions - Firebase - Authentication = */

function authSignInWithGoogle() {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Signed in with Google")
        }).catch((error) => {
            console.error(error.message)
            alert(error.message)
        })
}

function authSignInWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value
    let unknownUser = (email.toString()).split('@')[0]
    localStorage.setItem("unknownUser",unknownUser)
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            clearAuthFields()
        })
        .catch((error) => {
            console.error(error.message)
            alert(error.message)
        })
}

function authCreateAccountWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            clearAuthFields()
        })
        .catch((error) => {
            console.error(error.message) 
            alert(error.message)
        })
}

function authSignOut() {
    signOut(auth)
        .then(() => {
        }).catch((error) => {
            console.error(error.message)
            alert(error.message)
        })
}

/* = Functions - Firebase - Cloud Firestore = */

async function addNoteToDB(user) {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            uid: user.uid,
            body: "",
            createdAt: serverTimestamp()
        })
        console.log("Document written with ID: ", docRef.id)

    } catch (error) {
        console.error(error.message)
        alert(error.message)
    }
}

async function updateNoteInDB(docId, newBody) {
    const noteRef = doc(db, collectionName, docId);

    await updateDoc(noteRef, {
        body: newBody
    })
}

async function deleteNoteFromDB(docId) {
    await deleteDoc(doc(db, collectionName, docId))
}

function fetchInRealtimeAndRenderPostsFromDB(query, user) {
    onSnapshot(query, (querySnapshot) => {
        clearAll(appEl)
        let notesSize = querySnapshot.size
        
        if(notesSize == 0)
           createAddButton()
        
        querySnapshot.forEach((doc) => {
            renderPost(appEl, doc, user, notesSize)
        })
    })
}

function fetchAllPosts(user) {
    const noteRef = collection(db, collectionName)
    
    const q = query(noteRef, orderBy("createdAt", "asc"))

    fetchInRealtimeAndRenderPostsFromDB(q, user)
}

/* == Functions - UI Functions == */

function createTimeHeader(noteData) {
    const headerDiv = document.createElement("div")
    headerDiv.className = "timeheader"
    
        const timeData = document.createElement("p")
        timeData.textContent = displayDate(noteData.createdAt)

        headerDiv.appendChild(timeData)
        
    return headerDiv
}

function createNoteBody(wholeDoc) {
    const noteData = wholeDoc.data()
    const noteId = wholeDoc.id
    const noteBody = document.createElement("textarea")
    
    noteBody.className = "noteBody"
    noteBody.placeholder = "Enter your notes"
    noteBody.value = noteBody.body? noteData.body : ""
    
    noteBody.addEventListener('input', ()=>{
         updateNoteInDB(noteId, noteBody.value)
    })
    
    return noteBody
}

function createDeleteNoteButton(wholeDoc) {
    const noteId = wholeDoc.id
    
    const button = document.createElement('button')
    button.textContent = 'Delete'
    button.addEventListener('click', function() {
        const confirmation = confirm("Do you want to delete this note?")
        
        if(confirmation)
            deleteNoteFromDB(noteId)
    })
    return button
}

function createAddButton()
{
    const addButton = document.createElement("button")
    addButton.className = "btn-add"
    addButton.textContent = "+Add Note"
    
    addButton.addEventListener('click', addButtonPressed)
    
    appEl.appendChild(addButton)
}

function renderPost(appEl, wholeDoc, user, notesSize) {
    const noteData = wholeDoc.data()
    
    const noteDiv = document.createElement("div")
    noteDiv.className = "noteDiv"
    
    if(noteData.uid == user.uid){
       noteDiv.appendChild(createTimeHeader(noteData))
       noteDiv.appendChild(createNoteBody(wholeDoc))
       noteDiv.appendChild(createDeleteNoteButton(wholeDoc))
    
       appEl.appendChild(noteDiv)
       renderCount++
    }
    
    if(renderCount == notesSize){
       renderCount = 0
       createAddButton()  
     } 
}

function addButtonPressed() {
    const user = auth.currentUser
    addNoteToDB(user)
}

function showProfilePicture(imgElement, user) {
    const photoURL = user.photoURL
    
    if (photoURL) {
        imgElement.src = photoURL
    } else {
        imgElement.src = "assets/images/default.jpeg"
    }
}

function showUserGreeting(element, user) {
    const displayName = user.displayName
    
    if (displayName) {  
        element.textContent = displayName
    } else {
        element.textContent = localStorage.getItem("unknownUser")
    }
}

function displayDate(firebaseDate) {
    if (!firebaseDate) {
        return "Date processing"
    }
    
    const date = firebaseDate.toDate()
    
    const day = date.getDate()
    const year = date.getFullYear()
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]

    let hours = date.getHours()
    let minutes = date.getMinutes()
    hours = hours < 10 ? "0" + hours : hours
    minutes = minutes < 10 ? "0" + minutes : minutes

    return `${day} ${month} ${year} - ${hours}:${minutes}`
}

function clearAll(element) {
    element.innerHTML = ""
}

function showLoggedOutView() {
    hideView(viewLoggedIn)
    showView(viewLoggedOut)
}

function showLoggedInView() {
    hideView(viewLoggedOut)
    showView(viewLoggedIn)
}

function showView(view) {
    view.style.display = "flex" 
}

function hideView(view) {
    view.style.display = "none"
}

function clearInputField(field) {
	field.value = ""
}

function clearAuthFields() {
	clearInputField(emailInputEl)
	clearInputField(passwordInputEl)
}