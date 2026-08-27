const {
    initializeApp,
    cert
} = require(
    "firebase-admin/app"
);


const {
    getFirestore
} = require(
    "firebase-admin/firestore"
);


let serviceAccount;


// ============================================
// RENDER / PRODUCTION
// ============================================

if (
    process.env.FIREBASE_SERVICE_ACCOUNT
) {

    serviceAccount =
        JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT
        );

}


// ============================================
// LOCAL DEVELOPMENT
// ============================================

else {

    serviceAccount =
        require(
            "../serviceAccountKey.json"
        );

}


// ============================================
// FIREBASE ADMIN
// ============================================

initializeApp({

    credential:
        cert(
            serviceAccount
        )

});


const db =
    getFirestore();


module.exports =
    db;