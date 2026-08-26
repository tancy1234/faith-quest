import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
getAuth,
GoogleAuthProvider,
signInWithPopup
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyC5ipvCJS-MiNMe08RUhbc8jCqpmM_J2ac",
  authDomain: "bibleques.firebaseapp.com",
  projectId: "bibleques",
  storageBucket: "bibleques.firebasestorage.app",
  messagingSenderId: "199312681971",
  appId: "1:199312681971:web:c04b19e4cd972ea0198086"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();


document
.getElementById("googleLogin")
.onclick = async()=>{

    try{

        const result = await signInWithPopup(
            auth,
            provider
        );

        const user = result.user;


        document
        .getElementById("status")
        .innerHTML =
        `
        Welcome ${user.displayName}<br>
        Loading Faith Quest...
        `;


        console.log(user);


        setTimeout(()=>{

            window.location.href="chat.html";

        },1000);


    }
    catch(error){

        console.log(error);

    }

};