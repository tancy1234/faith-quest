const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

async function saveChatMessage(room, data) {

    const messagesRef = db
        .collection("chatRooms")
        .doc(room)
        .collection("messages");

    await messagesRef.add({

        username: data.username,
        uid: data.uid,
        text: data.text,
        createdAt: FieldValue.serverTimestamp()

    });

}

async function getRoomMessages(room){

    const messagesRef =
        db
        .collection("chatRooms")
        .doc(room)
        .collection("messages")
        .orderBy("createdAt","desc")
        .limit(100);

    const snapshot =
        await messagesRef.get();

    const messages = [];

    snapshot.forEach(doc=>{

        messages.push({
            id: doc.id,
            ...doc.data()
        });

    });

    // Oldest → newest
    messages.reverse();

    return messages;
}

module.exports = {
    saveChatMessage,
    getRoomMessages
};