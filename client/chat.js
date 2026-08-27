import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";


import {
getAuth,
onAuthStateChanged,
getIdToken
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

let currentUser = null;
let gameUsername = "";
let currentRoom = "global";
let profileReady = false;

let useAdventureLens = false;


const MAX_CHAT_MESSAGES = 100;



const firebaseConfig = {

  apiKey: "AIzaSyC5ipvCJS-MiNMe08RUhbc8jCqpmM_J2ac",
  authDomain: "bibleques.firebaseapp.com",
  projectId: "bibleques",
  storageBucket: "bibleques.firebasestorage.app",
  messagingSenderId: "199312681971",
  appId: "1:199312681971:web:c04b19e4cd972ea0198086"

};


const collectionCategoryOrder = [

    "animal",
    "bug",
    "fruit",
    "leaf",
    "plant",
    "vegetable",
    "fish",
    "bird"

];

const collectionCategoryNames = {

    animal:
        "🐾 动物",

    bug:
        "🐛 虫类",

    fruit:
        "🍎 水果",

    leaf:
        "🍃 叶",

    plant:
        "🌱 植物",

    vegetable:
        "🥕 蔬菜",

    fish:
        "🐟 鱼类",

    bird:
        "🐦 鸟类"

};




const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const socket = io(
    "https://faith-quest.onrender.com",
    {
        autoConnect: false
    }
);

function formatTime(createdAt){

    if(!createdAt){
        return "";
    }


    // Firestore Timestamp
    if(createdAt.toDate){

        return createdAt
            .toDate()
            .toLocaleTimeString();

    }


    // Normal timestamp number
    return new Date(createdAt)
        .toLocaleTimeString();

}

onAuthStateChanged(auth, async (user)=>{

    if(user){

        currentUser = user;

        console.log(user);

        try {

            const idToken =
                await getIdToken(user);

            socket.auth = {
                token: idToken
            };


            if(!socket.connected){

                socket.connect();

            }


            socket.emit(
                "create_user"
            );

        }
        catch(error){

            console.error(
                "Firebase token error:",
                error
            );

            return;

        }


        socket.emit(
            "get_my_church"
        );


        socket.emit(
            "get_my_adventure",
            {
                uid:user.uid
            }
        );


        socket.emit(
            "join_room",
            currentRoom
        );

    }
    else{

        window.location.href =
            "index.html";

    }

});

const chatBox =
document.getElementById("chatBox");


const input =
document.getElementById("messageInput");
const userDropdown =
document.getElementById("userDropdown");


const sendBtn =
document.getElementById("sendBtn");

const usernameModal =
document.getElementById("usernameModal");


const usernameInput =
document.getElementById("usernameInput");


const usernameBtn =
document.getElementById("usernameBtn");


const usernameError =
document.getElementById("usernameError");



const churchCreateModal =
    document.getElementById("churchCreateModal");

const churchNameInput =
    document.getElementById("churchNameInput");

const churchCreateConfirm =
    document.getElementById("churchCreateConfirm");

const churchCreateCancel =
    document.getElementById("churchCreateCancel");

const churchCreateError =
    document.getElementById("churchCreateError");




const churchLeaveModal =
    document.getElementById("churchLeaveModal");

const churchLeaveConfirm =
    document.getElementById("churchLeaveConfirm");

const churchLeaveCancel =
    document.getElementById("churchLeaveCancel");

const churchLeaveError =
    document.getElementById("churchLeaveError");


function openChurchCreatePanel(){

    churchNameInput.value = "";

    churchCreateError.innerHTML = "";

    churchCreateModal.classList.remove("hidden");

    churchNameInput.focus();

}


function closeChurchCreatePanel(){

    churchCreateModal.classList.add("hidden");

}


churchCreateCancel.onclick = ()=>{

    closeChurchCreatePanel();

};

churchCreateConfirm.onclick = ()=>{

    const churchName =
        churchNameInput.value.trim();


    if(churchName === ""){

        churchCreateError.innerHTML =
            "❌ 请输入教会的名字";

        return;

    }


    socket.emit(
        "create_church",
        {
            uid: currentUser.uid,
            churchName: churchName
        }
    );

};

socket.on("confirm_church_leave", () => {

    churchLeaveError.innerHTML = "";

    churchLeaveModal.classList.remove("hidden");

});

churchLeaveCancel.onclick = () => {

    churchLeaveModal.classList.add("hidden");

};

churchLeaveConfirm.onclick = ()=>{
    churchLeaveConfirm.disabled = true;
    socket.emit("leave_church",{room:currentRoom});
};

socket.on("church_left", (data) => {

    churchLeaveConfirm.disabled = false;

    churchLeaveModal.classList.add("hidden");

    addMessage(
        "FaithBot",
        data.message,
        Date.now()
    );

});

socket.on("church_leave_error", (data) => {

    churchLeaveConfirm.disabled = false;

    churchLeaveError.innerHTML =
        data.message;

});


socket.on("open_church_create", () => {

    churchNameInput.value = "";

    churchCreateError.innerHTML = "";

    churchCreateModal.classList.remove("hidden");

    churchNameInput.focus();

});

socket.on("church_created", (data)=>{

    closeChurchCreatePanel();

    churchCreateError.innerHTML = "";

    console.log(
        "Church created:",
        data.churchId,
        data.churchName
    );


    addMessage(
        "FaithBot",
        `⛪ 成功建立教会!

🏛️ ${data.churchName}<br>

👑 你现在是教会领袖`,
        Date.now()
    );

});


const churchEnterModal =
    document.getElementById("churchEnterModal");

const churchList =
    document.getElementById("churchList");

const churchEnterConfirm =
    document.getElementById("churchEnterConfirm");

const churchEnterCancel =
    document.getElementById("churchEnterCancel");

const churchEnterError =
    document.getElementById("churchEnterError");

function openChurchEnterPanel(){

    churchEnterError.innerHTML = "";

    churchList.innerHTML =
        "<p>稍等...</p>";

    churchEnterModal.classList.remove("hidden");

    socket.emit("get_churches");

}


function closeChurchEnterPanel(){

    churchEnterModal.classList.add("hidden");

}

churchEnterCancel.onclick = ()=>{

    closeChurchEnterPanel();

};

socket.on("open_church_enter", ()=>{

    openChurchEnterPanel();

});


socket.on("church_list", (churches)=>{

    churchList.innerHTML = "";


    if(churches.length === 0){

        churchList.innerHTML =
            "<p>目前没有教会</p>";

        return;

    }


    churches.forEach(church=>{

        const div =
            document.createElement("div");

        div.className =
            "church-list-item";


        div.innerHTML = `

            <div>

                <strong>
                    ⛪ ${church.name}
                </strong>

                <br>

                <span>
                    👥 ${church.memberCount} members
                </span>

            </div>

            <button>
                Enter
            </button>

        `;


        div.querySelector("button").onclick = ()=>{

            socket.emit(
                "join_church",
                {
                    churchId: church.id,
                    room:currentRoom
                }
            );
            
            

        };


        churchList.appendChild(div);

    });

});

socket.on("church_joined", (data)=>{

    closeChurchEnterPanel();

});

socket.on("church_join_error", (data)=>{

    churchEnterError.innerHTML =
        data.message;

});

socket.on("church_donate_error",(data)=>{
    addMessage("FaithBot",data.message,Date.now());
});

const shopPopup =
    document.getElementById(
        "shopPopup"
    );


const closeShopBtn =
    document.getElementById(
        "closeShopBtn"
    );


const dailyFoodList =
    document.getElementById(
        "dailyFoodList"
    );


const shopItemList =
    document.getElementById(
        "shopItemList"
    );


const shopTotal =
    document.getElementById(
        "shopTotal"
    );


const shopBuyBtn =
    document.getElementById(
        "shopBuyBtn"
    );

const shopCart = {};



const dedicatePopup =
    document.getElementById(
        "dedicatePopup"
    );


const closeDedicateBtn =
    document.getElementById(
        "closeDedicateBtn"
    );


const dedicateCancelBtn =
    document.getElementById(
        "dedicateCancel"
    );


const dedicateFoodList =
    document.getElementById("dedicateFoodList");


const dedicateFoodValue =
    document.getElementById(
        "dedicateFoodValue"
    );


const dedicatePointValue =
    document.getElementById(
        "dedicatePointValue"
    );


const dedicateTotalValue =
    document.getElementById(
        "dedicateTotalValue"
    );


const dedicateBlessChance =
    document.getElementById(
        "dedicateBlessChance"
    );





const dedicateConfirm =
    document.getElementById("dedicateConfirm");

if (dedicateConfirm) {

    dedicateConfirm.onclick = () => {

        const foods = [];

        document
            .querySelectorAll(".dedicate-food-card")
            .forEach(card => {

                const quantityElement =
                    card.querySelector(
                        ".dedicate-quantity-number"
                    );

                const quantity =
                    Number(
                        quantityElement?.textContent
                    ) || 0;

                if (quantity <= 0) {
                    return;
                }

                foods.push({

                    id:
                        card.dataset.id,

                    quantity:
                        quantity

                });

            });


        if (foods.length === 0) {

            return;

        }


        console.log(
            "DEDICATE REQUEST:",
            foods
        );


        dedicateConfirm.disabled = true;


        socket.emit(
            "dedicate_food",
            {
                uid:
                    currentUser.uid,

                room: currentRoom,

                foods:
                    foods
            }
        );

    };

}

socket.on("dedicate_result", (result) => {

    console.log("DEDICATE RESULT:", result);

    if (!result.success) {

        dedicateConfirm.disabled = false;

        alert("❌ " + result.message);

        return;

    }

    closeDedicatePanel();

    dedicateConfirm.disabled = false;



    // ========================================
    // REFRESH BAG
    // ========================================

    socket.emit(
        "get_bag",
        {
            uid: currentUser.uid
        }
    );


    // ========================================
    // REFRESH PROFILE
    // ========================================

    socket.emit(
        "get_profile"
    );

});

socket.on(
    "dedicate_error",
    (data) => {

        console.error(
            "DEDICATE ERROR:",
            data
        );

        dedicateConfirm.disabled = false;

        alert(
            data.message
        );

    }
);

function closeDedicatePanel() {

    dedicatePopup.classList.add(
        "hidden"
    );

    dedicatePopup.style.display =
        "none";

}

closeDedicateBtn.onclick = (e) => {

    e.preventDefault();
    e.stopPropagation();

    closeDedicatePanel();

};


dedicateCancelBtn.onclick = () => {

    closeDedicatePanel();

};

socket.on(
    "open_dedicate",
    () => {

        console.log(
            "Opening dedication..."
        );


        dedicateFoodList.innerHTML =
            `
            <div class="dedicate-loading">
                稍等...
            </div>
            `;

        dedicatePopup.classList.remove(
            "hidden"
        );


        dedicatePopup.style.display =
            "flex";


        socket.emit(
            "get_dedicate_foods",
            {
                uid:
                    currentUser.uid
            }
        );

    }
);

socket.on("dedicate_foods", (foods) => {

    console.log("DEDICATE FOODS:", foods);

    const foodList =
        document.getElementById("dedicateFoodList");

    if (!foodList) {
        console.error(
            "dedicateFoodList not found."
        );
        return;
    }

    foodList.innerHTML = "";

    if (!Array.isArray(foods) || foods.length === 0) {

        foodList.innerHTML = `
            <div class="dedicate-empty">

                <div class="dedicate-empty-icon">
                    🍽️
                </div>

                <div class="dedicate-empty-title">
                    没有物品适合
                </div>

                <div class="dedicate-empty-text">
                    目前没有物品奉献
                </div>

            </div>
        `;

        updateDedicateSummary();

        return;
    }


    foods.forEach(food => {

        const card =
            document.createElement("div");

        card.className =
            "dedicate-food-card";


        card.dataset.id =
            food.id;

        card.dataset.price =
            food.price;

        card.dataset.blessChance =
            food.blessChance || 0;

        card.dataset.owned =
            food.quantity;


        card.innerHTML = `

            <div class="dedicate-food-info">

                <div class="dedicate-food-emoji">
                    ${food.emoji}
                </div>


                <div class="dedicate-food-details">

                    <div class="dedicate-food-name">
                        ${food.name}
                    </div>

                    <div class="dedicate-food-owned">
                        Owned: ${food.quantity}
                    </div>

                    <div class="dedicate-food-price">
                        ${food.price} 🏆 each
                    </div>

                </div>

            </div>


            <div class="dedicate-quantity-control">

                <button
                    class="dedicate-quantity-btn dedicate-minus"
                    type="button">

                    −

                </button>


                <span
                    class="dedicate-quantity-number">

                    0

                </span>


                <button
                    class="dedicate-quantity-btn dedicate-plus"
                    type="button">

                    +

                </button>

            </div>

        `;


        const minusBtn =
            card.querySelector(
                ".dedicate-minus"
            );

        const plusBtn =
            card.querySelector(
                ".dedicate-plus"
            );

        const quantityDisplay =
            card.querySelector(
                ".dedicate-quantity-number"
            );


        let selectedQuantity = 0;


        plusBtn.onclick = () => {

            if (
                selectedQuantity >=
                food.quantity
            ) {
                return;
            }

            selectedQuantity++;

            quantityDisplay.textContent =
                selectedQuantity;

            updateDedicateSummary();

        };


        minusBtn.onclick = () => {

            if (
                selectedQuantity <= 0
            ) {
                return;
            }

            selectedQuantity--;

            quantityDisplay.textContent =
                selectedQuantity;

            updateDedicateSummary();

        };


        foodList.appendChild(card);

    });


    updateDedicateSummary();

});

function updateDedicateSummary() {

    const cards =
        document.querySelectorAll(
            ".dedicate-food-card"
        );

    let foodValue = 0;
    let blessingWeight = 0;

    cards.forEach(card => {

        const quantityElement =
            card.querySelector(
                ".dedicate-quantity-number"
            );

        if (!quantityElement) {
            return;
        }

        const quantity =
            Number(quantityElement.textContent) || 0;

        const price =
            Number(card.dataset.price) || 0;

        const blessChance =
            Number(card.dataset.blessChance) || 0;

        foodValue +=
            quantity * price;

        blessingWeight +=
            quantity * blessChance;

    });

    const foodValueElement =
        document.getElementById(
            "dedicateFoodValue"
        );

    const blessWeightElement =
        document.getElementById(
            "dedicateBlessWeight"
        );

    const totalValueElement =
        document.getElementById(
            "dedicateTotalValue"
        );

    if (foodValueElement) {

        foodValueElement.textContent =
            `${foodValue} 🏆`;

    }

    if (blessWeightElement) {

        blessWeightElement.textContent =
            blessingWeight;

    }

    if (totalValueElement) {

        totalValueElement.textContent =
            `${foodValue} 🏆`;

    }

    const confirmBtn =
        document.getElementById(
            "dedicateConfirm"
        );

    if (confirmBtn) {

        confirmBtn.disabled =
            foodValue <= 0;

    }

}








const menuBtn = document.getElementById("menu");
const sidebar = document.querySelector(".sidebar");
menuBtn.onclick = ()=>{

    sidebar.classList.toggle("hide");

};

socket.on("church_create_error", (data)=>{

    churchCreateError.innerHTML =
        data.message;

});

const profilePopup = document.getElementById("profilePopup");



const userArea =
document.getElementById("userArea");


userArea.onclick = (e)=>{


    e.stopPropagation();


    profilePopup.classList.toggle(
        "hidden"
    );


    if(!profilePopup.classList.contains("hidden")){


        if(profileReady){

            socket.emit(
                "get_profile"
            );

        }
        else{

            console.log(
                "Profile not ready yet"
            );

        }

    }


};

function removeMathQuestion(messageId) {

    const message =
        document.querySelector(
            `[data-message-id="${messageId}"]`
        );

    if (!message) {
        return;
    }

    // Only remove Memorize questions
    if (
        message.dataset.mathType !== "memorize"
    ) {
        return;
    }

    message.remove();
}

socket.on(
    "remove_math_question",
    (data) => {

        if (data.room &&
            data.room !== currentRoom) {

            return;

        }

        removeMathQuestion(
            data.userId,
            data.gameType
        );

    }
);

function addMessage(
    username,
    text,
    createdAt,
    isMe = false,
    data = null
) {

    const div = document.createElement("div");

    div.className = "message";

    if (isMe) {
        div.classList.add("my-message");
    }


    // ============================================
    // MATH QUESTION IDENTIFIER
    // ============================================

    if (data?.isMathGame) {

        div.dataset.mathGame = "true";

        div.dataset.mathOwner =
            data.mathGameOwner;

        div.dataset.mathType =
            data.mathGameType;

        div.dataset.messageId =
            data.messageId;

    }


    div.innerHTML = `
        <div class="username">
            ${username}
        </div>

        <div class="text">
            ${text}
        </div>

        <div class="time">
            ${formatTime(createdAt)}
        </div>
    `;

    chatBox.appendChild(div);


    // Keep only the latest messages
    while (
        chatBox.children.length >
        MAX_CHAT_MESSAGES
    ) {

        chatBox.removeChild(
            chatBox.firstChild
        );

    }


    // Always scroll to the latest message
    chatBox.scrollTop =
        chatBox.scrollHeight;
}

sendBtn.onclick=()=>{

    const text =
    input.value.trim();


    if(text==="") return;


    socket.emit(
        "send_message",
        {
            username:gameUsername,
            uid:currentUser.uid,
            text:text,
            room:currentRoom,
            createdAt: Date.now()
        }
    );


    input.value="";

    userDropdown.style.display="none";

};



socket.on(
"profile_data",
(data)=>{


    console.log("PROFILE:", data);



    document.getElementById(
        "profileName"
    ).innerHTML =
        data.username || "Unknown";



    document.getElementById(
        "profileLevel"
    ).innerHTML =
        "⭐ Lv." + data.level;



    document.getElementById(
        "profileXP"
    ).innerHTML =
        data.xp;


    document.getElementById(
        "profileStars"
    ).innerHTML =
        data.stars || 0;

    document.getElementById(
        "profilePoints"
    ).innerHTML =
        data.points;



    document.getElementById(
        "profileCorrect"
    ).innerHTML =
        data.totalCorrect || 0;



    document.getElementById(
        "profileWrong"
    ).innerHTML =
        data.totalWrong || 0;



    const correct =
        data.totalCorrect || 0;


    const wrong =
        data.totalWrong || 0;


    let accuracy = 0;


    if(correct + wrong > 0){

        accuracy =
        Math.round(
            correct /
            (correct + wrong)
            * 100
        );

    }



    document.getElementById(
        "profileAccuracy"
    ).innerHTML =
        accuracy + "%";



    // XP BAR

   const xpBar =
    document.getElementById("xpProgress");


    if(xpBar){

        xpBar.style.width =
        data.progress.percentage + "%";

    }


    const xpText =
    document.getElementById("xpText");


    if(xpText){

        xpText.innerHTML =
        `${data.progress.currentXP} / ${data.progress.neededXP} XP`;

    }

    console.log(
        "PROFILE UPDATED:",
        data
    );



});

socket.on("user_list", (users) => {

    console.log("Users received:", users);

    const userList =
        document.getElementById("userList");

    if (!userList) {
        return;
    }

    userList.innerHTML = "";

    users.forEach(user => {

        const div =
            document.createElement("div");

        div.className = "sidebar-user";

        const status =
            user.online ? "🟢" : "⚫";

        div.innerHTML = `
            <span class="user-status">${status}</span>
            <span class="user-icon">👤</span>
            <span class="user-name">${user.username}</span>
            <span class="user-level">Lv.${user.level}</span>
        `;

        userList.appendChild(div);

    });

});

socket.emit("get_users");

input.addEventListener(
    "input",
    () => {

        const text =
            input.value;


        // Find the last @ mention being typed
        const match =
            text.match(
                /@([^@]*)$/
            );


        if (
            match
        ) {

            const keyword =
                match[1]
                    .trim();


            socket.emit(
                "search_user",
                {
                    keyword:
                        keyword,

                    currentUid:
                        currentUser.uid
                }
            );

        }
        else {

            userDropdown.style.display =
                "none";

        }

    }
);


socket.on(
    "user_results",
    users => {

        userDropdown.innerHTML =
            "";


        if (
            !users ||
            users.length === 0
        ) {

            userDropdown.style.display =
                "none";

            return;

        }


        users.forEach(
            user => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "user-item";


                div.innerHTML =
                    "👤 " +
                    user.username;


                div.onclick =
                    () => {

                        const current =
                            input.value;


                        const newText =
                            current.replace(
                                /@[^@]*$/,
                                "@" +
                                user.username +
                                " "
                            );


                        input.value =
                            newText;


                        userDropdown.style.display =
                            "none";


                        input.focus();

                    };


                userDropdown.appendChild(
                    div
                );

            }
        );


        userDropdown.style.display =
            "block";

    }
);

input.addEventListener(
"keypress",
(e)=>{

    if(e.key==="Enter"){

        sendBtn.click();

    }

});

socket.on("connect",()=>{

    console.log(
        "Connected to server:",
        socket.id
    );

});

socket.on(
    "receive_message",
    (data) => {

        if (data.room !== currentRoom) {
            return;
        }


        // ============================================
        // MATH TIMEOUT
        // ============================================

        if (data.isMathTimeout) {

            removeMathQuestion(
                data.mathGameOwner,
                data.mathGameType
            );

        }


        // ============================================
        // ADD MESSAGE
        // ============================================

        addMessage(
            data.username,
            data.text,
            data.createdAt,
            data.uid === currentUser.uid,
            data
        );

    }
);


socket.on(
"need_username",
()=>{


    usernameModal.classList.remove(
        "hidden"
    );


});

socket.on(
"room_messages",
(data)=>{


    console.log(
        "Loading messages:",
        data.room
    );


    data.messages.forEach(message=>{


        addMessage(
            message.username,
            message.text,
            message.createdAt,
            message.uid === currentUser.uid,
            message
        );


    });


});

socket.on(
    "blind_box_result",
    (result) => {

        if (
            !result.success
        ) {

            alert(
                result.message
            );

            return;

        }


        alert(

            `🎁 开盲盒!\n\n` +

            `${result.reward.emoji} ` +
            `${result.reward.name}`

        );


        // Refresh bag

        socket.emit(
            "get_bag",
            {
                uid:
                    currentUser.uid
            }
        );

    }
);

usernameBtn.onclick=()=>{


    const username =
    usernameInput.value.trim();



    socket.emit(
        "set_username",
        {
            uid:currentUser.uid,

            username:username
        }
    );


};

socket.on("open_shop", () => {

    console.log(
        "Opening shop..."
    );


    // Reset previous selections

    Object.keys(shopCart)
        .forEach(id => {

            delete shopCart[id];

        });


    shopPopup.style.display =
        "flex";


    updateShopTotal();


    socket.emit(
        "get_shop"
    );

});


socket.on(
    "shop_data",
    (shop) => {

        console.log(
            "SHOP DATA:",
            shop
        );


        dailyFoodList.innerHTML =
            "";


        shopItemList.innerHTML =
            "";


        // ========================
        // FOODS
        // ========================

        shop.foods.forEach(
            food => {

                createShopProduct(
                    dailyFoodList,
                    food
                );

            }
        );


        // ========================
        // BLIND BOX
        // ========================

        createShopProduct(
            shopItemList,
            shop.blindBox
        );


        // ========================
        // ITEMS
        // ========================

        shop.items.forEach(
            item => {

                createShopProduct(
                    shopItemList,
                    item
                );

            }
        );


        updateShopTotal();

    }
);

function createShopProduct(
    container,
    product
) {

    const div =
        document.createElement(
            "div"
        );


    div.className =
        "shop-product";


    div.innerHTML = `

        <div class="shop-product-info">

            <span
                class="shop-product-emoji">

                ${product.emoji}

            </span>


            <div
                class="shop-product-details">

                <span
                    class="shop-product-name">

                    ${product.name}

                </span>


                <span
                    class="shop-product-price">

                    ${product.price} 🏆

                </span>

            </div>

        </div>


        <div
            class="quantity-control">

            <button
                class="quantity-btn minus">

                −

            </button>


            <span
                class="quantity-number">

                0

            </span>


            <button
                class="quantity-btn plus">

                +

            </button>

        </div>

    `;


    const minus =
        div.querySelector(
            ".minus"
        );


    const plus =
        div.querySelector(
            ".plus"
        );


    const number =
        div.querySelector(
            ".quantity-number"
        );


    shopCart[product.id] = {

        id:
            product.id,

        quantity:
            0,

        price:
            product.price

    };


    minus.onclick = () => {

        if (
            shopCart[product.id]
            .quantity > 0
        ) {

            shopCart[product.id]
                .quantity--;

            number.textContent =
                shopCart[product.id]
                .quantity;

            updateShopTotal();

        }

    };


    plus.onclick = () => {

        if (
            shopCart[product.id]
            .quantity < 99
        ) {

            shopCart[product.id]
                .quantity++;

            number.textContent =
                shopCart[product.id]
                .quantity;

            updateShopTotal();

        }

    };


    container.appendChild(
        div
    );

}

function updateShopTotal() {

    let total = 0;

    let hasItem = false;


    Object.values(shopCart)
        .forEach(product => {

            if (
                product.quantity > 0
            ) {

                hasItem = true;


                total +=
                    product.price *
                    product.quantity;

            }

        });


    shopTotal.textContent =
        `🏆 总共: ${total} Points`;


    shopBuyBtn.disabled =
        !hasItem;

}




shopBuyBtn.onclick = () => {

    const purchases = [];


    Object.values(shopCart)
        .forEach(product => {

            if (
                product.quantity > 0
            ) {

                purchases.push({

                    id:
                        product.id,

                    quantity:
                        product.quantity

                });

            }

        });


    if (
        purchases.length === 0
    ) {

        return;

    }


    console.log(
        "PURCHASE REQUEST:",
        purchases
    );


    socket.emit(
        "buy_shop_items",
        {
            uid: currentUser.uid,
            purchases: purchases
        }
    );

};


// ================================
// CLOSE
// ================================

closeShopBtn.onclick = () => {

    shopPopup.style.display =
        "none";

};


const bagPopup =
    document.getElementById(
        "bagPopup"
    );


const closeBagBtn =
    document.getElementById(
        "closeBagBtn"
    );


const bagContent =
    document.getElementById(
        "bagContent"
    );


const sellPopup =
    document.getElementById(
        "sellPopup"
    );


const sellTitle =
    document.getElementById(
        "sellTitle"
    );


const sellItemInfo =
    document.getElementById(
        "sellItemInfo"
    );


const sellMinus =
    document.getElementById(
        "sellMinus"
    );


const sellPlus =
    document.getElementById(
        "sellPlus"
    );


const sellQuantity =
    document.getElementById(
        "sellQuantity"
    );


const sellTotal =
    document.getElementById(
        "sellTotal"
    );


const sellConfirm =
    document.getElementById(
        "sellConfirm"
    );


const sellCloseBtn =
    document.getElementById("sellCloseBtn");

let currentSell = null;

// =====================================
// OPEN BAG
// =====================================

socket.on(
    "open_bag",
    () => {

        console.log(
            "Opening bag..."
        );


        bagPopup.style.display =
            "flex";


        bagContent.innerHTML =
            "<p>稍等...</p>";


        socket.emit(
            "get_bag",
            {
                uid:
                    currentUser.uid
            }
        );

    }
);


// =====================================
// RECEIVE BAG
// =====================================

socket.on(
    "bag_data",
    (data) => {

        console.log(
            "BAG DATA:",
            data
        );


        renderBag(data);

    }
);


// =====================================
// RENDER BAG
// =====================================

function renderBag(
    data
) {

    bagContent.innerHTML =
        "";


    // ============================
    // FOOD
    // ============================

    const foodSection =
        createBagSection(
            "🍔 食物"
        );


    const foods =
        data.foods || {};


    const foodIds =
        Object.keys(foods);


    if (
        foodIds.length === 0
    ) {

        addBagEmptyMessage(
            foodSection,
            "没有食物"
        );

    }
    else {

        foodIds.forEach(
            id => {

                const food =
                    foods[id];


                addBagProduct(
                    foodSection,
                    food.emoji,
                    food.name,
                    food.quantity,
                    id,
                    food.price
                );

            }
        );

    }


    bagContent.appendChild(
        foodSection
    );


    // ============================
    // ITEMS
    // ============================

    const itemSection =
        createBagSection(
            "🎒 物品"
        );


    const items =
        data.items || {};


    const itemIds =
        Object.keys(items);


    if (
        itemIds.length === 0
    ) {

        addBagEmptyMessage(
            itemSection,
            "没有物品"
        );

    }
    else {

        itemIds.forEach(
            id => {

                const item =
                    items[id];


                addBagProduct(
                    itemSection,
                    item.emoji,
                    item.name,
                    item.quantity,
                    id,
                    item.price
                );

            }
        );

    }


    bagContent.appendChild(
        itemSection
    );


    // ============================
    // FISH
    // ============================

    const fishSection =
        createBagSection(
            "🐟 鱼类"
        );


    const fish =
        data.fish || {};


    const fishIds =
        Object.keys(fish);


    if (
        fishIds.length === 0
    ) {

        addBagEmptyMessage(
            fishSection,
            "没有鱼类"
        );

    }
    else {

        fishIds.forEach(
            id => {

                const fishItem =
                    fish[id];


                const fishSellPrices = {
                    normal: 40,
                    rare: 100,
                    super_rare: 400
                };


                const fishSellPrice =
                    fishSellPrices[
                        fishItem.rarity
                    ] || 0;


                addBagProduct(
                    fishSection,
                    fishItem.emoji,
                    fishItem.name,
                    fishItem.quantity,
                    id,
                    fishSellPrice,
                    fishItem.rarity
                );

            }
        );

    }


    bagContent.appendChild(
        fishSection
    );


    // ============================
    // BIRDS
    // ============================

    const birdSection =
        createBagSection(
            "🐦 鸟类"
        );


    const birds =
        data.birds || {};


    const birdIds =
        Object.keys(birds);


    if (
        birdIds.length === 0
    ) {

        addBagEmptyMessage(
            birdSection,
            "没有鸟类"
        );

    }
    else {

        birdIds.forEach(
            id => {

                const bird =
                    birds[id];


                const birdSellPrices = {
                    normal: 400,
                    rare: 800,
                    super_rare: 1600
                };


                const birdSellPrice =
                    birdSellPrices[
                        bird.rarity
                    ] || 0;


                addBagProduct(
                    birdSection,
                    bird.emoji,
                    bird.name,
                    bird.quantity,
                    id,
                    birdSellPrice,
                    bird.rarity
                );

            }
        );

    }


    bagContent.appendChild(
        birdSection
    );


    // ============================
    // DIAMONDS
    // ============================

    const diamondSection =
        createBagSection(
            "💎 钻石"
        );


    const diamonds =
        data.diamonds || 0;


    addBagProduct(
        diamondSection,
        "💎",
        "钻石",
        diamonds
    );


    bagContent.appendChild(
        diamondSection
    );

}


// =====================================
// CREATE SECTION
// =====================================

function createBagSection(
    title
) {

    const section =
        document.createElement(
            "div"
        );


    section.className =
        "bag-section";


    section.innerHTML = `

        <h3>
            ${title}
        </h3>

    `;


    return section;

}


// =====================================
// ADD PRODUCT
// =====================================

function addBagProduct(
    container,
    emoji,
    name,
    quantity,
    id = null,
    price = 0,
    rarity = null
) {

    const div =
        document.createElement(
            "div"
        );


    div.className =
        "bag-product";


    const sellable =
        price > 0;

    console.log(
        "BAG PRODUCT:",
        {
            id: id,
            name: name,
            quantity: quantity,
            price: price,
            sellable: sellable
        }
    );

    div.innerHTML = `

        <div class="bag-product-info">

            <span class="bag-product-emoji">
                ${emoji}
            </span>

            <div class="bag-product-details">

                <span class="bag-product-name">
                    ${name}
                </span>

                <span class="bag-product-quantity">
                    ×${quantity}
                </span>

            </div>

        </div>


        <div class="bag-product-actions">

            ${
                id === "blind_box"

                ? `
                    <button
                        class="bag-use-btn">

                        Open

                    </button>
                  `

                : ""

            }

            ${
                id === "treasure"

                ? `
                    <button
                        class="bag-open-btn">

                        Open

                    </button>
                `

                : ""
            }


            ${
                sellable &&
                id !== "blind_box"

                ? `
                    <button
                        class="bag-sell-btn">

                        Sell

                    </button>
                  `

                : ""

            }

        </div>

    `;

    // tresure
    // =========================
    // TREASURE
    // =========================

    if (
        id === "treasure"
    ) {

        const openBtn =
            div.querySelector(
                ".bag-open-btn"
            );


        if (
            openBtn
        ) {

            openBtn.onclick = () => {

                console.log(
                    "OPEN TREASURE CLICKED"
                );


                socket.emit(
                    "open_treasure",
                    {
                        uid:
                            currentUser.uid
                    }
                );

            };

        }

    }

    // =========================
    // BLIND BOX
    // =========================

    if (
        id === "blind_box"
    ) {

        const useBtn =
            div.querySelector(
                ".bag-use-btn"
            );


        if (useBtn) {

            useBtn.onclick = () => {

                socket.emit(
                    "open_blind_box",
                    {
                        uid:
                            currentUser.uid
                    }
                );

            };

        }

    }


    // =========================
    // SELL
    // =========================

    if (
        sellable &&
        id !== "blind_box" &&
        id !== "treasure"
    ) {

        const sellBtn =
            div.querySelector(
                ".bag-sell-btn"
            );


        sellBtn.onclick = () => {

            console.log("SELL BUTTON CLICKED");

            openSellPanel({

                id:
                    id,

                name:
                    name,

                emoji:
                    emoji,

                quantity:
                    quantity,

                price:
                    price

            });

        };

    }


    container.appendChild(
        div
    );

}

function closeSellPanel() {

    sellPopup.classList.add(
        "hidden"
    );

    sellPopup.style.display =
        "none";

    currentSell = null;

}

function openSellPanel(product) {

    currentSell = {

        id:
            product.id,

        name:
            product.name,

        emoji:
            product.emoji,

        quantity:
            1,

        availableQuantity:
            product.quantity,

        sellPrice:
            Math.floor(
                product.price / 2
            )

    };

    console.log(
        "CURRENT SELL:",
        currentSell
    );


    sellTitle.textContent =
        `卖 ${product.name}`;


    sellItemInfo.innerHTML = `

        <span class="sell-item-emoji">
            ${product.emoji}
        </span>

        <div class="sell-item-name">
            ${product.name}
        </div>

        <p>
            你有 ×${product.quantity}
        </p>

    `;

    document.getElementById("sellPrice").textContent =
        `🏆 ${currentSell.sellPrice} Points `;


    updateSellTotal();


    updateSellTotal();

    sellPopup.classList.remove("hidden");

    sellPopup.style.display = "flex";

    console.log(
        "SELL POPUP DISPLAY:",
        sellPopup.style.display
    );

}

function updateSellTotal() {

    if (!currentSell) {
        return;
    }


    const total =
        currentSell.quantity *
        currentSell.sellPrice;


    sellQuantity.textContent =
        currentSell.quantity;


    sellTotal.textContent =
        `🏆 获得: ${total} Points`;

}

sellMinus.onclick = () => {

    if (!currentSell) {
        return;
    }


    if (
        currentSell.quantity > 1
    ) {

        currentSell.quantity--;

        updateSellTotal();

    }

};

sellPlus.onclick = () => {

    if (!currentSell) {
        return;
    }


    if (
        currentSell.quantity <
        currentSell.availableQuantity
    ) {

        currentSell.quantity++;

        updateSellTotal();

    }

};

sellCloseBtn.onclick = (e) => {

    e.preventDefault();
    e.stopPropagation();

    closeSellPanel();

};

// =====================================
// EMPTY MESSAGE
// =====================================

function addBagEmptyMessage(
    container,
    message
) {

    const div =
        document.createElement(
            "p"
        );


    div.className =
        "bag-empty";


    div.textContent =
        message;


    container.appendChild(
        div
    );

}


// =====================================
// CLOSE BAG
// =====================================

closeBagBtn.onclick = () => {

    bagPopup.style.display =
        "none";

};



socket.on(
"username_ready",
(data)=>{

    gameUsername = data.username;

    profileReady = true;


    document.getElementById("user").innerHTML =
    `👤 ${gameUsername}`;


    usernameModal.classList.add("hidden");


});

socket.on(
"username_error",
(data)=>{


    usernameError.innerHTML =
        data.message;


});

socket.on("church_list_error", (data)=>{

    churchList.innerHTML = "";

    churchEnterError.innerHTML =
        data.message;

});


socket.on(
    "shop_purchase_result",
    (result) => {

        console.log(
            "SHOP PURCHASE RESULT:",
            result
        );


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        alert(
            result.message +
            "\n\n" +
            "🏆 使用: " +
            result.totalCost +
            " Points\n " +
            "🏆 剩下: " +
            result.remainingPoints
        );


        // Close shop

        shopPopup.style.display =
            "none";

    }
);

socket.on(
    "sell_result",
    (result) => {

        if (
            !result.success
        ) {

            alert(
                result.message
            );

            return;

        }


        alert(

            `✅ 成功卖出!\n\n ` +

            `📦 数量: ${result.quantity}\n ` +

            `🏆 获得: ${result.total} Points`

        );


        closeSellPanel();


        socket.emit(
            "get_bag",
            {
                uid: currentUser.uid
            }
        );


        socket.emit(
            "get_profile"
        );

    }
);

sellConfirm.onclick = () => {

    if (!currentSell) {
        return;
    }


    socket.emit(
        "sell_bag_item",
        {

            uid:
                currentUser.uid,

            id:
                currentSell.id,

            quantity:
                currentSell.quantity

        }
    );

};

const adventureMapInfo =
    document.getElementById("adventureMaps");




const adventurePopup =
    document.getElementById("adventurePopup");

const adventureMaps =
    document.getElementById("adventureMaps");

const adventureTimeList =
    document.getElementById("adventureTimeList");

const adventureLocationList =
    document.getElementById("adventureLocationList");

const startAdventureBtn =
    document.getElementById("startAdventureBtn");

const closeAdventureBtn =
    document.getElementById("closeAdventureBtn");

let selectedAdventureConfig = null;

let selectedAdventureLocation =
    null;

const adventureTimer =
    document.getElementById("adventureTimer");



console.log("ADVENTURE ELEMENTS:", {

    adventurePopup,
    adventureMapInfo,
    adventureTimeList,
    adventureLocationList,
    startAdventureBtn,
    closeAdventureBtn,
    adventureTimer

});
// ========================================
// OPEN
// ========================================

socket.on(
    "my_adventure",
    (data) => {

        console.log(
            "MY ACTIVE ADVENTURE:",
            data
        );


        if (
            !data.adventure
        ) {

            return;

        }


        startAdventureTimer(
            data.adventure
        );

    }
);

socket.on(
    "open_adventure",
    (data) => {

        resetAdventureLens();

        // =========================
        // LENS QUANTITY
        // =========================

        adventureLensQuantity =
            Number(data.lensQuantity) || 0;

        updateAdventureLensButton();

        adventurePopup
            .classList
            .remove("hidden");

        adventurePopup.style.display =
            "flex";

        adventureMapInfo.textContent =
            `🗺️ 地图: ${data.mapQuantity}`;

        selectedAdventureConfig =
            null;

        selectedAdventureLocation =
            null;

        startAdventureBtn.disabled =
            true;

        renderAdventureDurations(
            data.durations
        );

        renderAdventureLocations(
            data.locations
        );

    }
);


// ========================================
// DURATIONS
// ========================================

function renderAdventureDurations(durations) {

    adventureTimeList.innerHTML = "";

    if (!Array.isArray(durations)) {
        return;
    }

    durations.forEach(duration => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "adventure-time-btn";

        button.innerHTML = `
            <span class="adventure-time-name">
                ${duration.name}
            </span>

            <span class="adventure-time-power">
                ⭐ 能量值 ${duration.rewardPower}
            </span>
        `;

        button.onclick = () => {

            document
                .querySelectorAll(
                    ".adventure-time-btn"
                )
                .forEach(btn => {
                    btn.classList.remove("selected");
                });

            button.classList.add("selected");

            selectedAdventureConfig =
                duration;

            updateAdventureStartButton();
        };

        adventureTimeList.appendChild(button);

    });

}


// ========================================
// LOCATIONS
// ========================================

function renderAdventureLocations(locations) {

    adventureLocationList.innerHTML = "";

    if (!Array.isArray(locations)) {
        return;
    }

    locations.forEach(location => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "adventure-location-btn";

        button.textContent =
            location.name;

        button.onclick = () => {

            document
                .querySelectorAll(
                    ".adventure-location-btn"
                )
                .forEach(btn => {
                    btn.classList.remove("selected");
                });

            button.classList.add("selected");

            selectedAdventureLocation =
                location.id;

            updateAdventureStartButton();
        };

        adventureLocationList.appendChild(button);

    });

}


// ========================================
// START BUTTON
// ========================================

function updateAdventureStartButton() {

    startAdventureBtn.disabled =
        !selectedAdventureConfig ||
        !selectedAdventureLocation;

}


const adventureLensBtn =
    document.getElementById(
        "adventureLensBtn"
    );

let adventureLensQuantity = 0;


adventureLensBtn.onclick = () => {

    // No lens
    if (adventureLensQuantity <= 0) {

        useAdventureLens = false;

        updateAdventureLensButton();

        return;
    }

    // Toggle
    useAdventureLens =
        !useAdventureLens;

    updateAdventureLensButton();

};

function updateAdventureLensButton() {

    if (!adventureLensBtn) {
        return;
    }

    if (adventureLensQuantity <= 0) {

        useAdventureLens = false;

        adventureLensBtn.classList.remove(
            "selected"
        );

        adventureLensBtn.innerHTML =
            `🔍 使用放大镜
             <span>
                 × 0
             </span>`;

        adventureLensBtn.disabled = true;

        return;
    }

    adventureLensBtn.disabled = false;


    if (useAdventureLens) {

        adventureLensBtn.classList.add(
            "selected"
        );

        adventureLensBtn.innerHTML =
            `🔍 已使用放大镜 ✓
             <span>
                 × ${adventureLensQuantity}
             </span>`;

    }
    else {

        adventureLensBtn.classList.remove(
            "selected"
        );

        adventureLensBtn.innerHTML =
            `🔍 使用放大镜
             <span>
                 × ${adventureLensQuantity}
             </span>`;

    }

}

function resetAdventureLens() {

    useAdventureLens = false;

    if (!adventureLensBtn) {
        return;
    }

    adventureLensBtn.classList.remove(
        "selected"
    );

    updateAdventureLensButton();

}

// ========================================
// STARTED
// ========================================

socket.on(
    "adventure_started",
    (data) => {

        console.log(
            "ADVENTURE STARTED:",
            data
        );


        adventurePopup.style.display =
            "none";

        adventurePopup
            .classList
            .add("hidden");


        const adventure =
            data.adventure;


        if (!adventure) {

            console.error(
                "❌ Missing adventure data"
            );

            return;

        }


        // =========================
        // DISPLAY CHAT MESSAGE
        // =========================

        if (data.message) {

            addMessage(
                "FaithBot",
                data.message,
                Date.now()
            );

        }


        // =========================
        // START TIMER
        // =========================

        startAdventureTimer(
            adventure
        );

    }
);

socket.on("adventure_finished",(data) => {

        console.log(
            "🔥 CLIENT RECEIVED adventure_finished:",
            data
        );

        const rewards =
            data.rewards || [];

        let message =
            `🎉 冒险完成！\n\n <br>`;

        let nothingCount = 0;

        rewards.forEach(
            reward => {

                // -------------------------
                // NOTHING
                // -------------------------

                if (
                    reward.type ===
                    "nothing"
                ) {

                    nothingCount++;

                }

                // -------------------------
                // FOOD
                // -------------------------

                else if (
                    reward.type ===
                    "food"
                ) {

                    message +=
                        `${reward.emoji} ${reward.name} ×${reward.quantity}\n <br>`;

                }

                // -------------------------
                // COLLECTION
                // -------------------------

                else if (
                    reward.type ===
                    "collection"
                ) {

                    message +=
                        `${reward.emoji} ${reward.name}\n <br>`;

                }

                // -------------------------
                // HATCH EGG
                // -------------------------

                else if (
                    reward.type ===
                    "hatch_egg"
                ) {

                    message +=
                        `🥚 孵化蛋 ×${reward.quantity}\n <br>`;

                }

                // -------------------------
                // TREASURE
                // -------------------------

                else if (
                    reward.type ===
                    "treasure"
                ) {

                    message +=
                        `🪎 宝藏 ×${reward.quantity}\n <br>`;

                }

            }
        );


        // -------------------------
        // SHOW NOTHING ONCE
        // -------------------------

        if (
            nothingCount > 0
        ) {

            message +=
                `▫️ 什么也没有发现 ×${nothingCount}\n <br>`;

        }


        console.log(
            "💬 FINISH MESSAGE:",
            message
        );


        addMessage(
            "FaithBot",
            message,
            Date.now()
        );


        socket.emit(
            "get_bag",
            {
                uid:
                    currentUser.uid
            }
        );


        socket.emit(
            "get_profile"
        );

    }
);
// ========================================
// ERROR
// ========================================

socket.on(
    "adventure_error",
    (data) => {

        startAdventureBtn.disabled =
            false;


        alert(
            data.message
        );

    }
);



startAdventureBtn.onclick = () => {

    if (
        !selectedAdventureConfig ||
        !selectedAdventureLocation
    ) {
        return;
    }

    const duration =
        selectedAdventureConfig.duration;

    const locationId =
        selectedAdventureLocation;

    console.log(
        "START ADVENTURE:",
        {
            duration,
            locationId,
            config: selectedAdventureConfig,
            useAdventureLens
        }
    );

    socket.emit(
        "start_adventure",
        {
            uid: currentUser.uid,
            room: currentRoom,
            configId: selectedAdventureConfig.id,
            locationId: selectedAdventureLocation,
            useAdventureLens:
                useAdventureLens
        }
    );

};
// ========================================
// CLOSE
// ========================================

closeAdventureBtn.onclick = () => {

    adventurePopup.style.display =
        "none";

    adventurePopup
        .classList
        .add("hidden");

};


let adventureTimerInterval = null;

function startAdventureTimer(adventure) {

    const timerElement =
        document.getElementById("adventureTimer");

    if (!timerElement) {
        console.error(
            "❌ 无法获得有效冒险数据"
        );
        return;
    }

    // Clear previous timer
    if (adventureTimerInterval) {

        clearInterval(
            adventureTimerInterval
        );

    }

    // =========================
    // GET END TIME
    // =========================

    const endTime =
        adventure.endTime;

    if (!endTime) {

        console.error(
            "❌ Adventure has no endTime:",
            adventure
        );

        timerElement.textContent =
            "";

        return;
    }


    function updateTimer() {

        const remaining =
            Math.max(
                0,
                endTime - Date.now()
            );


        // =========================
        // FINISHED
        // =========================

        if (remaining <= 0) {

            timerElement.textContent =
                "🎉 冒险完成！<br>";

            clearInterval(
                adventureTimerInterval
            );

            adventureTimerInterval = null;


            socket.emit(
                "finish_adventure",
                {
                    uid: currentUser.uid,
                    room: currentRoom
                }
            );


            return;
        }


        // =========================
        // TIME
        // =========================

        const totalSeconds =
            Math.floor(
                remaining / 1000
            );


        const hours =
            Math.floor(
                totalSeconds / 3600
            );


        const minutes =
            Math.floor(
                (totalSeconds % 3600) / 60
            );


        const seconds =
            totalSeconds % 60;


        if (hours > 0) {

            timerElement.textContent =
                `⏳ 冒险进行中：${hours}小时 ${minutes}分钟 ${seconds}秒`;

        }
        else if (minutes > 0) {

            timerElement.textContent =
                `⏳ 冒险进行中：${minutes}分钟 ${seconds}秒`;

        }
        else {

            timerElement.textContent =
                `⏳ 冒险进行中：${seconds}秒`;

        }

    }


    updateTimer();


    adventureTimerInterval =
        setInterval(
            updateTimer,
            1000
        );

}

function renderCollection(
    collection
) {

    collectionContent.innerHTML =
        "";


    collectionCategoryOrder.forEach(
        category => {

            const items =
                collection.filter(
                    item =>
                        item.category ===
                        category
                );


            if (
                items.length === 0
            ) {

                return;

            }


            // ============================
            // SECTION
            // ============================

            const section =
                document.createElement(
                    "div"
                );


            section.className =
                "collection-section";


            // ============================
            // TITLE
            // ============================

            const title =
                document.createElement(
                    "div"
                );


            title.className =
                "collection-section-title";


            title.textContent =
                collectionCategoryNames[
                    category
                ];


            section.appendChild(
                title
            );


            // ============================
            // GRID
            // ============================

            const grid =
                document.createElement(
                    "div"
                );


            grid.className =
                "collection-grid";


            // ============================
            // ITEMS
            // ============================

            items.forEach(
                item => {

                    const card =
                        document.createElement(
                            "div"
                        );


                    card.className =
                        "collection-card";


                    if (
                        !item.owned
                    ) {

                        card.classList.add(
                            "locked"
                        );

                    }


                    card.innerHTML = `

                        <div
                            class="collection-emoji"
                        >
                            ${item.emoji}
                        </div>


                        <div
                            class="collection-name"
                        >
                            ${
                                item.owned
                                    ? item.name
                                    : "???"
                            }
                        </div>

                    `;


                    grid.appendChild(
                        card
                    );

                }
            );


            section.appendChild(
                grid
            );


            collectionContent.appendChild(
                section
            );

        }
    );

}

socket.on("show_collection",data => {

        renderCollection(
            data.collection
        );


        collectionPopup.style.display =
            "flex";

    }
);

closeCollectionBtn.onclick =
    () => {

        collectionPopup.style.display =
            "none";

    };

document.querySelectorAll(".room").forEach(room=>{

    room.onclick=()=>{


        document
        .querySelectorAll(".room")
        .forEach(r=>{

            r.classList.remove("active-room");

        });



        room.classList.add("active-room");



        currentRoom = room.dataset.room;



        console.log(
            "Current Room:",
            currentRoom
        );


        // Clear old messages
        chatBox.innerHTML = "";


        socket.emit(
            "join_room",
            currentRoom
        );
    };

});

socket.on(
    "dedicate_food_error",
    (data) => {

        console.error(
            "DEDICATE FOOD ERROR:",
            data
        );


        dedicateFoodList.innerHTML = `
            <div class="dedicate-empty">
                ❌ ${data.message}
            </div>
        `;

    }
);


socket.on(
    "hide_math_question",
    (data) => {

        const message =
            document.querySelector(
                `[data-message-id="${data.messageId}"]`
            );

        if (!message) {
            return;
        }

        if (
            message.dataset.mathType !== "memorize"
        ) {
            return;
        }

        message.remove();
    }
);

socket.emit(
    "open_treasure",
    {
        uid:
            currentUser.uid
    }
);

socket.on(
    "treasure_opened",
    data => {

        alert(
            `🧰 宝箱开启成功！\n\n` +
            `🏆 获得 ${data.rewardPoints} Points`
        );

    }
);

