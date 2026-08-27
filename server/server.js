const db=require("./config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const cors=require("cors");

const playerRoute=require("./routes/player");

const app=express();

const admin = require("firebase-admin");

const {
    getAuth: getAdminAuth
} = require(
    "firebase-admin/auth"
);

app.use(cors());
app.use(express.json());
app.use("/player",playerRoute);
const server=http.createServer(app);

const helpCommand = require("./commands/help");
const profileCommand = require("./commands/profile");
const quizCommand = require("./commands/quiz");
const activeQuiz = require("./game/quizManager");
const rewards = require("./game/rewards");
const {
    getLevel,
    getLevelProgress
} = require("./game/level");
const leaderboardCommand = require("./commands/leaderboard");
const startWeeklyReset = require("./game/weeklyReset");
const wishCommand = require("./commands/wish");
const { saveChatMessage,getRoomMessages } = require("./game/chatManager");
const dailyCommand = require("./commands/daily");
const {getChurchLevel}=require("./game/churchLevel");
const workCommand = require("./commands/work");
const {
    getShopData,
    loadFoods,
    loadItems,
} = require("./game/shopManager");
const {randomBlindBoxReward} = require("./game/blindBoxManager");
const {
    calculateFoodDedication,
    calculateComboBlessWeight,
    calculateBlessRewardChances,
    rollBlessingReward,
    calculateDedicationReward
} = require("./game/dedicateManager");
const startWeeklyDedicateReset =
    require("./game/weeklyResetDedicate");
const giveCommand = require("./commands/give");
const robCommand = require("./commands/rob");
const fishCommand = require("./commands/fish");
const {
    fish,
    loadFish
} = require("./game/fishManager");
const adventureCommand =
    require("./commands/adventure");
const {
    mathCommand,
    handleMathAnswer,
    formatMathResult,
    handleMathTimeout
} = require("./commands/math");
const {
    getMathGame
} = require("./game/mathGameManager");
const birdCommand =
    require("./commands/bird");
const collectionCommand =
    require("./commands/collectionCommand");
const {
    getActiveTrivia,
    checkTriviaAnswer
} = require(
    "./game/triviaManager"
);
const triviaCommand =
    require(
        "./commands/trivia"
    );


const triviaRewards = {

    easy: 10,

    medium: 20,

    hard: 35,

    insane: 50

};

const mathQuizRewards = {
    easy: 10,
    medium: 20,
    hard: 50
};


const loadBirds = () => {

    const filePath =
        path.join(
            __dirname,
            "data",
            "bird.json"
        );

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );

};

// ============================================
// MATH REWARDS
// ============================================

const mathRewards = {
    easy: 10,
    medium: 20,
    hard: 50
};

// ============================================
// MATH COOLDOWN
// ============================================

const mathCooldowns = new Map();

const MATH_COOLDOWN = 3 * 60 * 1000; // 3 minutes

const io=new Server(server,{
    cors:{
        origin:"*"
    }
});

const onlineUsers = new Set();

// ============================================
// SOCKET FIREBASE AUTHENTICATION
// ============================================

io.use(async (socket, next)=>{

        try{

            const token =
                socket.handshake
                    .auth
                    ?.token;


            if(!token){

                return next(
                    new Error(
                        "AUTH_REQUIRED"
                    )
                );

            }


            const decodedToken =
                await getAdminAuth()
                    .verifyIdToken(
                        token
                    );


            socket.uid =
                decodedToken.uid;


            socket.email =
                decodedToken.email ||
                null;


            socket.photoURL =
                decodedToken.picture ||
                null;


            console.log(
                "Firebase verified:",
                socket.uid
            );


            next();

        }
        catch(error){

            console.error(
                "SOCKET AUTH ERROR:",
                error.message
            );


            next(
                new Error(
                    "INVALID_AUTH_TOKEN"
                )
            );

        }

    }
);


function getTreasurePoints() {

    return Math.floor(
        Math.random() *
        (
            10000 -
            1000 +
            1
        )
    ) + 1000;

}

async function openTreasure(
    uid
) {

    const userRef =
        db.collection("users")
            .doc(uid);


    return await db.runTransaction(
        async transaction => {

            const userDoc =
                await transaction.get(
                    userRef
                );


            if (
                !userDoc.exists
            ) {

                throw new Error(
                    "USER_NOT_FOUND"
                );

            }


            const user =
                userDoc.data();


            const inventory =
                user.inventory || {};


            const items = {

                ...(inventory.items || {})

            };


            const treasureCount =
                Number(
                    items.treasure || 0
                );


            // ====================================
            // CHECK TREASURE
            // ====================================

            if (
                treasureCount <= 0
            ) {

                throw new Error(
                    "NO_TREASURE"
                );

            }


            // ====================================
            // REMOVE 1 TREASURE
            // ====================================

            if (
                treasureCount === 1
            ) {

                delete items.treasure;

            }
            else {

                items.treasure =
                    treasureCount - 1;

            }


            // ====================================
            // RANDOM 1000 - 10000 POINTS
            // ====================================

            const rewardPoints =
                Math.floor(
                    Math.random() *
                    9001
                ) + 1000;


            const newPoints =
                (
                    user.points || 0
                ) +
                rewardPoints;


            // ====================================
            // SAVE
            // ====================================

            transaction.update(
                userRef,
                {

                    points:
                        newPoints,

                    "inventory.items":
                        items

                }
            );


            return {

                rewardPoints:
                    rewardPoints,

                remainingTreasure:
                    treasureCount - 1

            };

        }
    );

}



async function broadcastUserList() {

    try {

        const snapshot =
            await db.collection("users")
            .get();

        const users = [];

        snapshot.forEach(doc => {

            const user = doc.data();

            if (!user.username) {
                return;
            }

            users.push({

                uid: doc.id,

                username: user.username,

                level: user.level || 1,

                churchId: user.churchId || null,

                online: onlineUsers.has(doc.id)

            });

        });

        io.emit(
            "user_list",
            users
        );

    }
    catch(error) {

        console.error(
            "Broadcast user list error:",
            error
        );

    }

}

app.get("/",(req,res)=>{
    res.send("Faith Quest Server Running");
});

app.get("/test",async(req,res)=>{
    try{
        await db.collection("test")
        .add({
            message:"Hello Firebase",
            time:new Date()
        });

        res.send("Saved");

    }catch(error){
        console.log(error);
        res.status(500).send("Error");
    }
});

async function sendProfile(socket,uid){


    const userDoc =
        await db.collection("users")
        .doc(uid)
        .get();


    if(!userDoc.exists)
        return;


    const user =
        userDoc.data();



    const progress =
        getLevelProgress(user.xp);



    socket.emit(
        "profile_update",
        {

            username:user.username,

            level:user.level,

            progress:progress

        }
    );


}

async function calculateChurchMemberXP(church) {

    const members = church.members || [];

    if (members.length === 0) {
        return 0;
    }

    let totalXP = 0;

    for (const uid of members) {

        const userDoc =
            await db.collection("users")
            .doc(uid)
            .get();

        if (userDoc.exists) {

            const user =
                userDoc.data();

            totalXP += user.xp || 0;
        }
    }

    return totalXP;
}

io.on("connection",(socket)=>{

    socket.use(([event, data], next)=>{

        if(
            data &&
            typeof data === "object" &&
            !Array.isArray(data)
        ){

            if(
                Object.prototype
                    .hasOwnProperty
                    .call(
                        data,
                        "uid"
                    )
            ){

                data.uid =
                    socket.uid;

            }


            if(
                Object.prototype
                    .hasOwnProperty
                    .call(
                        data,
                        "currentUid"
                    )
            ){

                data.currentUid =
                    socket.uid;

            }

        }


        next();

    });

    console.log(
        "User Connected:",
        socket.id
    );

    
    socket.on(
        "get_profile",
        async()=>{


            if(!socket.uid){

                console.log(
                    "No user uid found"
                );

                return;

            }



            const userDoc =
                await db.collection("users")
                .doc(socket.uid)
                .get();



            if(!userDoc.exists){

                return;

            }



            const user =
                userDoc.data();



            const progress =
                getLevelProgress(
                    user.xp || 0
                );



            socket.emit(
                "profile_data",
                {

                    username:
                        user.username,

                    level:
                        user.level,

                    xp:
                        user.xp || 0,

                    stars:user.stars || 0,

                    points:
                        user.points || 0,

                    totalCorrect:
                        user.totalCorrect || 0,

                    totalWrong:
                        user.totalWrong || 0,

                    progress:
                        progress

                }
            );


        }
    );

    socket.on("get_users", async () => {

        try {

            const snapshot =
                await db.collection("users")
                .orderBy("usernameLower")
                .get();

            const users = [];

            snapshot.forEach(doc => {

                const user = doc.data();

                if (!user.username) {
                    return;
                }

                // Don't show yourself
                if (doc.id === socket.uid) {
                    return;
                }

                users.push({

                    uid: doc.id,

                    username: user.username,

                    level: user.level || 1,

                    churchId: user.churchId || null,

                    online: onlineUsers.has(doc.id)

                });

            });

            socket.emit(
                "user_list",
                users
            );

        }
        catch(error) {

            console.error(
                "Get users error:",
                error
            );

            socket.emit(
                "user_list_error",
                {
                    message:
                        "❌ 无法读取用户"
                }
            );

        }

    });

    socket.on(
        
        "join_room",
        async(room)=>{


            socket.join(room);

            console.log(
                "User joined room:",
                room
            );


            let messages =
                await getRoomMessages(room);



            // Convert Firestore timestamp
            messages = messages.map(message=>{

                if(message.createdAt){

                    if(message.createdAt.toMillis){

                        message.createdAt =
                            message.createdAt.toMillis();

                    }

                }


                return message;

            });



        socket.emit(
            "room_messages",
            {
                room:room,
                messages:messages
            }
        );


    });

    socket.on(
    "set_username",
    async(data)=>{


        const username =
            data.username.trim();



        if(username.length < 3){


            socket.emit(
                "username_error",
                {
                    message:
                    "用户名一定要3个以上的字体"
                }
            );


            return;

        }



        const usernameLower =
            username.toLowerCase();



        // check duplicate

        const check =
            await db.collection("users")
            .where(
                "usernameLower",
                "==",
                usernameLower
            )
            .get();



        if(!check.empty){


            socket.emit(
                "username_error",
                {
                    message:
                    "用户名已被使用"
                }
            );


            return;

        }



        await db.collection("users")
        .doc(data.uid)
        .update({

            username:username,

            usernameLower:usernameLower

        });



        socket.emit(
            "username_ready",
            {
                username:username
            }
        );


    });

    socket.on(
    "search_user",
    async(data)=>{


        const keyword =
            data.keyword.toLowerCase();



        const snapshot =
            await db.collection("users")
            .where(
                "usernameLower",
                ">=",
                keyword
            )
            .where(
                "usernameLower",
                "<=",
                keyword + "\uf8ff"
            )
            .limit(5)
            .get();



        let results=[];



        snapshot.forEach(doc=>{


            if(doc.id !== data.currentUid){

                results.push({

                    uid:doc.id,

                    username:doc.data().username

                });

            }


        });



        socket.emit(
            "user_results",
            results
        );


    });

    socket.on("create_user",async()=>{

        onlineUsers.add(
            socket.uid
        );


        console.log(
            "Socket UID saved:",
            socket.uid
        );


        broadcastUserList();


        console.log(
            "User is online:",
            socket.uid
        );


        const userRef =
            db.collection("users")
                .doc(
                    socket.uid
                );


        const userDoc =
            await userRef.get();


        if(!userDoc.exists){

            await userRef.set({

                email:
                    socket.email,

                photoURL:
                    socket.photoURL,

                username:
                    null,

                usernameLower:
                    null,

                level:1,

                xp:0,

                points:0,

                stars:0,

                totalCorrect:0,

                totalWrong:0,

                churchId:null,

                workCooldown:null,

                createdAt:
                    new Date()

            });


            socket.emit(
                "need_username"
            );


            console.log(
                "New user needs username:",
                socket.uid
            );

        }
        else{

            const user =
                userDoc.data();


            if(!user.username){

                socket.emit(
                    "need_username"
                );

            }
            else{

                socket.emit(
                    "username_ready",
                    {
                        username:
                            user.username
                    }
                );

            }

        }

    });

    async function sendBotMessage(room, message) {

        const botMessage = {
            username: "FaithBot",
            uid: "FaithBot",
            room: room,
            text: message,
            createdAt: Date.now()
        };

        await saveChatMessage(
            room,
            botMessage
        );

        io.to(room).emit(
            "receive_message",
            botMessage
        );

    }

    socket.on("send_message",async (data) => {

        if(!data.room){

            data.room = "room";

        }

        

        await saveChatMessage(
            data.room,
            data
        );

        console.log(data);

        // Always show user's message
        io.to(data.room).emit(
            "receive_message",
            data
        );


        const answer = data.text.trim().toUpperCase();


        // Check if THIS user has a quiz
        const quiz = activeQuiz[data.uid];


        if(
            quiz &&
            ["A","B","C","D"].includes(answer)
        ){

            clearTimeout(quiz.timer);


            if(answer === quiz.answer){

                const difficulty =
                    quiz.difficulty.charAt(0).toUpperCase() +
                    quiz.difficulty.slice(1).toLowerCase();

                const reward = rewards[quiz.difficulty];

                const userRef = db.collection("users").doc(data.uid);

                const userDoc = await userRef.get();

                const user = userDoc.data();

                const newXP = user.xp + reward.xp;

                const newPoints = user.points + reward.points;

                const oldLevel = user.level;

                const newLevel = getLevel(newXP);

                await userRef.update({

                    xp: newXP,

                    points: newPoints,

                    level: newLevel,

                    totalCorrect: (user.totalCorrect || 0) + 1



                });

                if (user.churchId) {

                    const churchRef =
                        db.collection("churches")
                        .doc(user.churchId);

                    const churchDoc =
                        await churchRef.get();

                    if (churchDoc.exists) {

                        const church =
                            churchDoc.data();

                        const memberXP =
                            await calculateChurchMemberXP(church);

                        const totalDonations =
                            church.totalDonations || 0;

                        const churchAmount =
                            memberXP + totalDonations;

                        const churchLevel =
                            getChurchLevel(churchAmount);

                        await churchRef.update({

                            memberXP: memberXP,

                            level: churchLevel

                        });

                    }

                }

                sendProfile(socket,data.uid);

                if (newLevel > oldLevel) {

                    await sendBotMessage(
                        data.room,
                        `🎉 恭喜！

                    ${user.username}

                    升级到 Lv.${newLevel}！`
                    );

                }
                await sendBotMessage(
                    data.room,
                    `✅ 回答正确！<br>
                🎁 获得奖励 <br>

                ⭐ XP +${reward.xp} <br>
                🏆 Points +${reward.points} <br>
                📈 当前等级：Lv.${newLevel}`
                );

            }
            else{

                const userRef = db.collection("users").doc(data.uid);

                const userDoc = await userRef.get();

                const user = userDoc.data();

                await userRef.update({

                    totalWrong: (user.totalWrong || 0) + 1

                });
                await sendBotMessage(
                    data.room,
                    `❌ 回答错误！

                正确答案：
                ${quiz.answer}`
                );

            }


            delete activeQuiz[data.uid];

            return;
        }

        // ============================================
        // TRIVIA ANSWER
        // ============================================

        const activeTrivia =
            getActiveTrivia(
                data.uid
            );


        if (
            activeTrivia &&
            ["A", "B", "C", "D"].includes(answer)
        ) {

            const result =
                checkTriviaAnswer(
                    data.uid,
                    answer
                );


            // ========================================
            // TIMEOUT
            // ========================================

            if (
                !result.success &&
                result.error === "TIMEOUT"
            ) {

                return;

            }


            // ========================================
            // ANSWER RESULT
            // ========================================

            if (
                result.success
            ) {

                const q =
                    result.question;


                const correctAnswer =
                    result.correctAnswer;


                const correctOption =
                    q.options[
                        correctAnswer
                    ];


                // ====================================
                // CORRECT
                // ====================================

                if (
                    result.correct
                ) {

                    const reward =
                        triviaRewards[
                            result.difficulty
                        ] || 0;


                    const userRef =
                        db.collection("users")
                            .doc(data.uid);


                    const userDoc =
                        await userRef.get();


                    if (
                        userDoc.exists
                    ) {

                        const user =
                            userDoc.data();


                        const newPoints =
                            (user.points || 0) +
                            reward;


                        await userRef.update({

                            points:
                                newPoints,

                            

                        });


                        // ====================================
                        // REFRESH PROFILE
                        // ====================================

                        sendProfile(
                            socket,
                            data.uid
                        );


                        // ====================================
                        // CORRECT MESSAGE
                        // ====================================

                        await sendBotMessage(
                            data.room,
                            `🎉 Trivia Correct! <br>

                ✅ ${correctAnswer}. ${correctOption.en} / ${correctOption.zh} <br>

                🎁 Reward / 奖励：<br>
                🏆 Points +${reward} <br>

                💡 Explanation / 解释：<br>
                ${q.explanation.en}

                ${q.explanation.zh}`
                        );

                    }


                    return;

                }

                // ====================================
                // WRONG
                // ====================================

                else {

                    const userOption =
                        q.options[
                            result.userAnswer
                        ];


                    const userRef =
                        db.collection("users")
                            .doc(data.uid);


                    const userDoc =
                        await userRef.get();


                    if (
                        userDoc.exists
                    ) {

                        const user =
                            userDoc.data();


                        await userRef.update({

                            totalWrong:
                                (user.totalWrong || 0) + 1

                        });

                    }


                    await sendBotMessage(
                        data.room,
                        `❌ Trivia Wrong! <br>

                Your Answer / 你的答案：<br>
                ${result.userAnswer}. ${userOption.en} / ${userOption.zh} <br>

                ✅ Correct Answer / 正确答案：<br>
                ${correctAnswer}. ${correctOption.en} / ${correctOption.zh} <br>

                💡 Explanation / 解释：<br>
                ${q.explanation.en}

                ${q.explanation.zh}`
                    );


                    return;

                }


                return;

            }

        }

        // ============================================
        // CHECK IF THIS USER HAS A MATH GAME
        // ============================================

        

        const mathGame =
            getMathGame(
                data.uid
            );


        if (
            mathGame
        ) {

            // Remember game type before answer handling
            const mathGameType =
                mathGame.type;


            const result =
                handleMathAnswer(
                    data.uid,
                    data.text.trim()
                );


            // ============================================
            // MATH REWARD
            // ============================================

            if (
                result &&
                result.correct
            ) {

                const reward =
                    mathRewards[
                        mathGame.difficulty
                    ] || 0;


                const userRef =
                    db.collection("users")
                        .doc(data.uid);


                const userDoc =
                    await userRef.get();


                if (
                    userDoc.exists
                ) {

                    const user =
                        userDoc.data();


                    const newPoints =
                        (user.points || 0) +
                        reward;


                    await userRef.update({

                        points:
                            newPoints

                    });


                    const rewardMessage = {

                        username:
                            "FaithBot",

                        uid:
                            "FaithBot",

                        text:
                            `🎁 Reward: +${reward} Points`,

                        room:
                            data.room,

                        createdAt:
                            Date.now()

                    };


                    await saveChatMessage(
                        data.room,
                        rewardMessage
                    );


                    io.to(
                        data.room
                    ).emit(
                        "receive_message",
                        rewardMessage
                    );

                }

            }


            // ============================================
            // REMOVE OLD MATH QUESTION
            // ============================================

            if (
                result &&
                (
                    result.correct ||
                    result.expired ||
                    result.finished === true ||
                    result.correct === false
                )
            ) {

                io.to(
                    data.room
                ).emit(
                    "remove_math_question",
                    {

                        userId:
                            data.uid,

                        gameType:
                            mathGameType

                    }
                );

            }


            // ============================================
            // SHOW RESULT
            // ============================================

            const resultText =
                formatMathResult(
                    result
                );


            if (
                resultText
            ) {

                const resultMessage = {

                    username:
                        "FaithBot",

                    uid:
                        "FaithBot",

                    text:
                        resultText,

                    room:
                        data.room,

                    createdAt:
                        Date.now()

                };


                await saveChatMessage(
                    data.room,
                    resultMessage
                );


                io.to(
                    data.room
                ).emit(
                    "receive_message",
                    resultMessage
                );

            }


            return;

        }

        // If not quiz owner, treat as normal message
        if(data.text.trim().toLowerCase().startsWith("c#")){

            console.log("COMMAND CHECK:", data.text);

            handleCommand(
                data,
                socket,
                io
            );

        }

    });


    socket.on("disconnect",()=>{

        if (socket.uid) {

            onlineUsers.delete(socket.uid);

            console.log(
                "User went offline:",
                socket.uid
            );
            broadcastUserList();
        }

        console.log(
            "User Disconnected:",
            socket.id
        );

    });

    socket.on("create_church", async(data)=>{

        try{

            console.log("CREATE CHURCH REQUEST");

            const uid = data.uid;
            const churchName = data.churchName.trim();

            console.log("UID:", uid);
            console.log("Church Name:", churchName);


            // =========================
            // 1. Check user
            // =========================

            const userRef =
                db.collection("users").doc(uid);

            const userDoc =
                await userRef.get();


            if(!userDoc.exists){

                socket.emit(
                    "church_create_error",
                    {
                        message:
                            "❌ 无法获得用户."
                    }
                );

                return;

            }


            // =========================
            // 2. Check if already owns
            // =========================

            const existingChurch =
                await db.collection("churches")
                .where(
                    "ownerId",
                    "==",
                    uid
                )
                .limit(1)
                .get();


            if(!existingChurch.empty){

                socket.emit(
                    "church_create_error",
                    {
                        message:
                            "❌ 你已经有教会了"
                    }
                );

                return;

            }


            // =========================
            // 3. Create church
            // =========================

            const churchRef =
                db.collection("churches").doc();


            await churchRef.set({

                name: churchName,

                ownerId: uid,

                members: [uid],

                totalDonations:0,
                memberXP:userDoc.data().xp||0,
                level:getChurchLevel(userDoc.data().xp||0),

                createdAt: new Date()

            });


            // =========================
            // 4. Update player
            // =========================

            await userRef.update({

                churchId: churchRef.id,

                churchRole: "owner"

            });


            console.log(
                "Church created:",
                churchRef.id
            );


            // =========================
            // 5. Tell client
            // =========================

            socket.emit("church_created", {
                churchId:churchRef.id,
                churchName:churchName
            });

                        const botMessage = {
                username:"FaithBot",
                uid:"FaithBot",
                room:data.room,
                text:`⛪ Church created successfully!

            🏛️ ${churchName}

            👑 ${userDoc.data().username} is now the church owner.`,
                createdAt:Date.now()
            };

            await saveChatMessage(data.room, botMessage);

            io.to(data.room).emit(
                "receive_message",
                botMessage
            );


        }
        catch(error){

            console.error(
                "Create church error:",
                error
            );


            socket.emit(
                "church_create_error",
                {

                    message:
                        "❌ 无法建立教会"

                }
            );

        }

    });

    socket.on("get_churches", async()=>{

        try{

            const snapshot =
                await db.collection("churches")
                .orderBy("name")
                .get();


            const churches = [];


            snapshot.forEach(doc=>{

                const church =
                    doc.data();


                churches.push({

                    id: doc.id,

                    name:
                        church.name,

                    memberCount:
                        church.members
                        ? church.members.length
                        : 0

                });

            });


            socket.emit(
                "church_list",
                churches
            );


        }
        catch(error){

            console.error(
                "Get churches error:",
                error
            );


            socket.emit(
                "church_list_error",
                {
                    message:
                        "❌ 无法显示教会"
                }
            );

        }

    });

    socket.on("get_my_church", async () => {

        try {

            const uid = socket.uid;

            if (!uid) {
                socket.emit("my_church_data", {
                    inChurch: false
                });
                return;
            }

            const userDoc =
                await db.collection("users")
                .doc(uid)
                .get();

            if (!userDoc.exists) {
                socket.emit("my_church_data", {
                    inChurch: false
                });
                return;
            }

            const user = userDoc.data();

            // User is not in a church
            if (!user.churchId) {

                socket.emit("my_church_data", {
                    inChurch: false
                });

                return;
            }

            // Get church
            const churchDoc =
                await db.collection("churches")
                .doc(user.churchId)
                .get();

            // Church doesn't exist anymore
            if (!churchDoc.exists) {

                await db.collection("users")
                    .doc(uid)
                    .update({
                        churchId: null,
                        churchRole: null
                    });

                socket.emit("my_church_data", {
                    inChurch: false
                });

                return;
            }

            const church = churchDoc.data();

            const donations =
                church.totalDonations || 0;

            const memberXP =
                church.memberXP || 0;

            const amount =
                donations + memberXP;

            socket.emit("my_church_data", {

                inChurch: true,

                churchId: churchDoc.id,

                churchName: church.name,

                churchLevel: church.level || 1,

                churchAmount: amount,

                totalDonations: donations,

                memberXP: memberXP,

                memberCount:
                    church.members
                        ? church.members.length
                        : 0,

                role:
                    user.churchRole || "member"

            });

        }
        catch(error) {

            console.error(
                "Get my church error:",
                error
            );

            socket.emit("my_church_error", {
                message:
                    "❌ 无法获得教会信息"
            });

        }

    });

    

    

    socket.on("join_church", async(data)=>{

        try{

            const uid = socket.uid;
            const churchId = data.churchId;


            if(!uid){

                socket.emit(
                    "church_join_error",
                    {
                        message:
                            "❌ 用户不存在"
                    }
                );

                return;

            }


            // =========================
            // Get user
            // =========================

            const userRef =
                db.collection("users").doc(uid);

            const userDoc =
                await userRef.get();


            if(!userDoc.exists){

                socket.emit(
                    "church_join_error",
                    {
                        message:
                            "❌ 无法获得用户"
                    }
                );

                return;

            }


            const user =
                userDoc.data();

            

            // =========================
            // Check current church
            // =========================

            if(user.churchId){

                socket.emit(
                    "church_join_error",
                    {
                        message:
                            "❌ 你已经在教会里了"
                    }
                );

                return;

            }


            // =========================
            // Get church
            // =========================

            const churchRef =
                db.collection("churches")
                .doc(churchId);

            const churchDoc =
                await churchRef.get();


            if(!churchDoc.exists){

                socket.emit(
                    "church_join_error",
                    {
                        message:
                            "❌ 教会不存在"
                    }
                );

                return;

            }


            const church =
                churchDoc.data();

            


            // =========================
            // Add member
            // =========================
            const currentMembers =
                Array.isArray(church.members)
                    ? church.members
                    : [];



            if(currentMembers.includes(uid)){

                socket.emit(
                    "church_join_error",
                    {
                        message:
                            "❌ 你已经是这个教会的一份子了"
                    }
                );

                return;

            }

            const updatedMembers = [
                ...currentMembers,
                uid
            ];

            const updatedChurch = {
                ...church,
                members: updatedMembers
            };

            const newMemberXP =
                await calculateChurchMemberXP(updatedChurch);

            const newAmount =
                (church.totalDonations || 0) + newMemberXP;

            const newLevel =
                getChurchLevel(newAmount);

            await churchRef.update({

                members: updatedMembers,

                memberXP: newMemberXP,

                level: newLevel

            });


            // =========================
            // Update user
            // =========================

            await userRef.update({

                churchId: churchId,

                churchRole: "member"

            });


            console.log(
                "User joined church:",
                uid,
                church.name
            );


            socket.emit(
                "church_joined",
                {

                    churchId:
                        churchId,

                    churchName:
                        church.name

                }
            );

            // Everyone sees
            const botMessage = {
                username:"FaithBot",
                uid:"FaithBot",
                room:data.room,
                text:`⛪ ${user.username} 加入 ${church.name}!

            👥 恭喜他们成为一份子r.`,
                createdAt:Date.now()
            };

            await saveChatMessage(data.room, botMessage);

            io.to(data.room).emit(
                "receive_message",
                botMessage
            );


        }
        catch(error){

            console.error(
                "Join church error:",
                error
            );


            socket.emit(
                "church_join_error",
                {

                    message:
                        "❌ 加入教会失败"

                }
            );

        }

    });

    socket.on("leave_church", async(data)=>{

        try{

            const uid = socket.uid;

            if(!uid){

                socket.emit(
                    "church_leave_error",
                    {
                        message:"❌ 无法获得用户"
                    }
                );

                return;

            }


            // Get user
            const userRef =
                db.collection("users").doc(uid);

            const userDoc =
                await userRef.get();


            if(!userDoc.exists){

                socket.emit(
                    "church_leave_error",
                    {
                        message:"❌ 用户账号无法识别"
                    }
                );

                return;

            }


            const user =
                userDoc.data();

            
            // Check if user is in church
            if(!user.churchId){

                socket.emit(
                    "church_leave_error",
                    {
                        message:"❌ 你不在教会里"
                    }
                );

                return;

            }


            // Get church
            const churchRef =
                db.collection("churches")
                .doc(user.churchId);

            const churchDoc =
                await churchRef.get();


            if(!churchDoc.exists){

                // Church somehow doesn't exist anymore
                await userRef.update({

                    churchId:null,
                    churchRole:null

                });

                socket.emit(
                    "church_leave_error",
                    {
                        message:"❌ 教会不存在"
                    }
                );

                return;

            }


            const church =
                churchDoc.data();

            const memberXP =
                user.xp || 0;

            
            // =========================
            // OWNER
            // =========================

            if(user.churchRole === "owner"){

                const members =
                    church.members || [];


                // Owner is the only member
                if(members.length === 1){

                    await churchRef.delete();

                    await userRef.update({
                        churchId:null,
                        churchRole:null
                    });

                    const botMessage = {
                        username:"FaithBot",
                        uid:"FaithBot",
                        room:data.room,
                        text:`⛪ ${user.username} 离开 ${church.name}.

                🏛️ 教会关闭`,
                        createdAt:Date.now()
                    };

                    await saveChatMessage(
                        data.room,
                        botMessage
                    );

                    io.to(data.room).emit(
                        "receive_message",
                        botMessage
                    );

                    socket.emit(
                        "church_left"
                    );

                    return;
                }

                // Owner has other members
                socket.emit(
                    "church_leave_error",
                    {
                        message:
                            "❌ 你是教会领袖，有成员的情况下无法离开"
                    }
                );


                return;

            }


            // =========================
            // NORMAL MEMBER
            // =========================

            await churchRef.update({

                members:
                    FieldValue.arrayRemove(uid)

            });

            const updatedMembers =
                (church.members || [])
                .filter(memberId => memberId !== uid);

            const updatedChurch = {
                ...church,
                members: updatedMembers
            };

            const newMemberXP =
                await calculateChurchMemberXP(updatedChurch);

            const newAmount =
                (church.totalDonations || 0) + newMemberXP;

            const newLevel =
                getChurchLevel(newAmount);

            await churchRef.update({

                members: updatedMembers,

                memberXP: newMemberXP,

                level: newLevel

            });

            await userRef.update({
                churchId: null,
                churchRole: null
            });


            const botMessage = {
                username:"FaithBot",
                uid:"FaithBot",
                room:data.room,
                text:`⛪ ${user.username} 离开 ${church.name}.`,
                createdAt:Date.now()
            };

            await saveChatMessage(data.room, botMessage);

            io.to(data.room).emit(
                "receive_message",
                botMessage
            );

            socket.emit("church_left");
                        


            console.log(
                "User left church:",
                uid,
                church.name
            );


        }
        catch(error){

            console.error(
                "Leave church error:",
                error
            );


            socket.emit(
                "church_leave_error",
                {
                    message:
                        "❌ 无法离开教会."
                }
            );

        }

    });

    socket.on("get_shop", async () => {

        try {

            const shop =
                await getShopData();

            console.log(
                "Sending shop data:",
                shop
            );

            socket.emit(
                "shop_data",
                shop
            );

        }
        catch(error) {

            console.error(
                "Shop error:",
                error
            );

            socket.emit(
                "shop_error",
                {
                    message:
                        "❌ 无法打开商店"
                }
            );

        }

    });

    socket.on("buy_shop_items", async (data) => {

        try {

            const uid = data.uid;
            const purchases = data.purchases;


            if (!uid) {

                socket.emit(
                    "shop_purchase_result",
                    {
                        success: false,
                        message:
                            "❌ 用户不存在"
                    }
                );

                return;

            }


            if (
                !Array.isArray(purchases) ||
                purchases.length === 0
            ) {

                socket.emit(
                    "shop_purchase_result",
                    {
                        success: false,
                        message:
                            "❌ 没有选项"
                    }
                );

                return;

            }


            // =====================================
            // LOAD CURRENT SHOP
            // =====================================

            const shop =
                await getShopData();


            const products = {};


            // Today's food

            shop.foods.forEach(food => {

                products[food.id] = {
                    ...food,
                    type: "food"
                };

            });


            // Normal items

            shop.items.forEach(item => {

                products[item.id] = {
                    ...item,
                    type: "item"
                };

            });


            // Blind Box

            products[shop.blindBox.id] = {

                ...shop.blindBox,

                type: "item"

            };


            // =====================================
            // VALIDATE + CALCULATE TOTAL
            // =====================================

            let totalCost = 0;

            const cleanPurchases = [];


            for (const purchase of purchases) {

                const product =
                    products[purchase.id];


                if (!product) {

                    socket.emit(
                        "shop_purchase_result",
                        {
                            success: false,
                            message:
                                `❌ ${purchase.id} 暂时不在商店支持.`
                        }
                    );

                    return;

                }


                const quantity =
                    Number(purchase.quantity);


                if (
                    !Number.isInteger(quantity) ||
                    quantity < 1 ||
                    quantity > 99
                ) {

                    socket.emit(
                        "shop_purchase_result",
                        {
                            success: false,
                            message:
                                "❌ 数量错误"
                        }
                    );

                    return;

                }


                totalCost +=
                    product.price * quantity;


                cleanPurchases.push({

                    id:
                        product.id,

                    name:
                        product.name,

                    emoji:
                        product.emoji,

                    type:
                        product.type,

                    price:
                        product.price,

                    quantity:
                        quantity

                });

            }


            // =====================================
            // FIRESTORE TRANSACTION
            // =====================================

            const userRef =
                db.collection("users")
                .doc(uid);


            const result =
                await db.runTransaction(
                    async (transaction) => {

                        const userDoc =
                            await transaction.get(
                                userRef
                            );


                        if (!userDoc.exists) {

                            throw new Error(
                                "USER_NOT_FOUND"
                            );

                        }


                        const user =
                            userDoc.data();


                        const currentPoints =
                            user.points || 0;


                        if (
                            currentPoints <
                            totalCost
                        ) {

                            throw new Error(
                                "NOT_ENOUGH_POINTS"
                            );

                        }


                        // =================================
                        // EXISTING INVENTORY
                        // =================================

                        const inventory =
                            user.inventory || {};


                        const foods = {

                            ...(inventory.foods || {})

                        };


                        const items = {

                            ...(inventory.items || {})

                        };


                        // =================================
                        // ADD PURCHASES
                        // =================================

                        cleanPurchases.forEach(
                            purchase => {

                                if (
                                    purchase.type ===
                                    "food"
                                ) {

                                    foods[
                                        purchase.id
                                    ] =
                                        (
                                            foods[
                                                purchase.id
                                            ] || 0
                                        ) +
                                        purchase.quantity;

                                }
                                else {

                                    items[
                                        purchase.id
                                    ] =
                                        (
                                            items[
                                                purchase.id
                                            ] || 0
                                        ) +
                                        purchase.quantity;

                                }

                            }
                        );


                        const remainingPoints =
                            currentPoints -
                            totalCost;


                        // =================================
                        // UPDATE USER
                        // =================================

                        transaction.update(
                            userRef,
                            {

                                points:
                                    remainingPoints,

                                "inventory.foods":
                                    foods,

                                "inventory.items":
                                    items

                            }
                        );


                        return {

                            remainingPoints:
                                remainingPoints

                        };

                    }
                );


            // =====================================
            // SUCCESS
            // =====================================

            socket.emit(
                "shop_purchase_result",
                {

                    success: true,

                    message:
                        "✅ 购买成功!",

                    totalCost:
                        totalCost,

                    remainingPoints:
                        result.remainingPoints,

                    purchases:
                        cleanPurchases

                }
            );


            // Update profile

            sendProfile(
                socket,
                uid
            );


        }
        catch(error) {

            console.error(
                "SHOP PURCHASE ERROR:",
                error
            );


            // =====================================
            // ERROR: NOT ENOUGH POINTS
            // =====================================

            if (
                error.message ===
                "NOT_ENOUGH_POINTS"
            ) {

                socket.emit(
                    "shop_purchase_result",
                    {

                        success: false,

                        message:
                            "❌ Points不足!"

                    }
                );

                return;

            }


            // =====================================
            // ERROR: USER NOT FOUND
            // =====================================

            if (
                error.message ===
                "USER_NOT_FOUND"
            ) {

                socket.emit(
                    "shop_purchase_result",
                    {

                        success: false,

                        message:
                            "❌ 用户无法识别"

                    }
                );

                return;

            }


            socket.emit(
                "shop_purchase_result",
                {

                    success: false,

                    message:
                        "❌ 购买失败 请重试"

                }
            );

        }

    });

    socket.on("get_bag",async (data) => {

        try {

            const uid =
                data.uid;


            if (!uid) {

                socket.emit(
                    "bag_error",
                    {
                        message:
                            "❌ 用户无法识别"
                    }
                );

                return;

            }


            // =========================
            // USER
            // =========================

            const userRef =
                db.collection("users")
                .doc(uid);


            const userDoc =
                await userRef.get();


            if (!userDoc.exists) {

                socket.emit(
                    "bag_error",
                    {
                        message:
                            "❌ 用户无法识别"
                    }
                );

                return;

            }


            const user =
                userDoc.data();


            const inventory =
                user.inventory || {};


            // =========================
            // LOAD FOOD JSON
            // =========================

            const foods =
                loadFoods();


            const foodMap = {};


            foods.forEach(
                food => {

                    foodMap[
                        food.id
                    ] = food;

                }
            );


            // =========================
            // LOAD ITEM JSON
            // =========================

            const items =
                loadItems();


            const itemMap = {};


            items.forEach(
                item => {

                    itemMap[
                        item.id
                    ] = item;

                }
            );


            // =========================
            // BUILD FOOD BAG
            // =========================

            const bagFoods = {};


            const userFoods =
                inventory.foods || {};


            Object.entries(
                userFoods
            ).forEach(
                ([id, quantity]) => {

                    const food =
                        foodMap[id];


                    if (!food) {
                        return;
                    }


                    if (
                        quantity <= 0
                    ) {
                        return;
                    }


                    bagFoods[id] = {

                        name:
                            food.name,

                        emoji:
                            food.emoji,

                        quantity:
                            quantity,

                        price:
                            food.price

                    };

                }
            );


            // =========================
            // BUILD ITEM BAG
            // =========================

            const bagItems = {};


            const userItems =
                inventory.items || {};


            Object.entries(
                userItems
            ).forEach(
                ([id, quantity]) => {

                    if (
                        quantity <= 0
                    ) {
                        return;
                    }


                    // =========================
                    // BLIND BOX
                    // =========================

                    if (
                        id === "blind_box"
                    ) {

                        bagItems[id] = {

                            name:
                                "盲盒",

                            emoji:
                                "🎁",

                            quantity:
                                quantity

                        };

                        return;

                    }


                    // =========================
                    // NORMAL ITEM
                    // =========================

                    const item =
                        itemMap[id];


                    if (!item) {
                        return;
                    }


                    bagItems[id] = {

                        name:
                            item.name,

                        emoji:
                            item.emoji,

                        quantity:
                            quantity,

                        price:
                            item.price

                    };

                }
            );


            // =========================
            // BUILD FISH BAG
            // =========================

            const bagFish = {};

            const userFish =
                inventory.fish || {};

            const fishList =
                loadFish();


            const fishMap = {};

            fishList.forEach(
                fish => {

                    fishMap[fish.id] =
                        fish;

                }
            );


            Object.entries(
                userFish
            ).forEach(
                ([id, quantity]) => {

                    if (quantity <= 0) {
                        return;
                    }


                    const fish =
                        fishMap[id];


                    if (!fish) {
                        return;
                    }


                    // Trash should never appear
                    // in the bag
                    if (
                        fish.rarity === "trash"
                    ) {
                        return;
                    }


                    bagFish[id] = {

                        name:
                            fish.name,

                        emoji:
                            fish.emoji,

                        rarity:
                            fish.rarity,

                        quantity:
                            quantity

                    };

                }
            );


            // =========================
            // SEND BAG
            // =========================

            socket.emit(
                "bag_data",
                {

                    foods:
                        bagFoods,

                    items:
                        bagItems,

                    fish:
                        bagFish,

                    birds:
                        inventory.bird?.collection ||
                        {},

                    diamonds:
                        inventory.diamonds ||
                        0

                }
            );


        }
        catch(error) {

            console.error(
                "BAG ERROR:",
                error
            );


            socket.emit(
                "bag_error",
                {

                    message:
                        "❌ 打开背包失败"

                }

            );

        }

    });

    socket.on("open_blind_box",async (data) => {

        try {

            const uid =
                data.uid;


            if (!uid) {

                socket.emit(
                    "blind_box_result",
                    {
                        success: false,
                        message:
                            "❌ 用户无法识别"
                    }
                );

                return;

            }


            const userRef =
                db.collection("users")
                .doc(uid);


            const result =
                await db.runTransaction(
                    async (
                        transaction
                    ) => {

                        const userDoc =
                            await transaction.get(
                                userRef
                            );


                        if (
                            !userDoc.exists
                        ) {

                            throw new Error(
                                "USER_NOT_FOUND"
                            );

                        }


                        const user =
                            userDoc.data();


                        const inventory =
                            user.inventory ||
                            {};


                        const items = {

                            ...(inventory.items || {})

                        };


                        const foods = {

                            ...(inventory.foods || {})

                        };


                        const blindBoxes =
                            items.blind_box || 0;


                        if (
                            blindBoxes < 1
                        ) {

                            throw new Error(
                                "NO_BLIND_BOX"
                            );

                        }


                        // Remove 1 blind box

                        items.blind_box =
                            blindBoxes - 1;


                        const reward =
                            randomBlindBoxReward();


                        // =====================
                        // FOOD
                        // =====================

                        if (
                            reward.type ===
                            "food"
                        ) {

                            foods[
                                reward.id
                            ] =
                                (
                                    foods[
                                        reward.id
                                    ] || 0
                                ) + 1;

                        }


                        // =====================
                        // ITEM
                        // =====================

                        else if (
                            reward.type ===
                            "item"
                        ) {

                            items[
                                reward.itemId
                            ] =
                                (
                                    items[
                                        reward.itemId
                                    ] || 0
                                ) + 1;

                        }


                        // =====================
                        // POINTS
                        // =====================

                        else if (
                            reward.type ===
                            "points"
                        ) {

                            const currentPoints =
                                user.points || 0;


                            transaction.update(
                                userRef,
                                {

                                    points:
                                        currentPoints +
                                        reward.amount

                                }
                            );

                        }


                        // =====================
                        // DIAMOND
                        // =====================

                        else if (
                            reward.type ===
                            "diamond"
                        ) {

                            const diamonds =
                                inventory.diamonds ||
                                0;


                            transaction.update(
                                userRef,
                                {

                                    "inventory.diamonds":
                                        diamonds +
                                        reward.amount

                                }
                            );

                        }


                        transaction.update(
                            userRef,
                            {

                                "inventory.items":
                                    items,

                                "inventory.foods":
                                    foods

                            }
                        );


                        return reward;

                    }
                );


            // =========================
            // GET DISPLAY INFO
            // =========================

            let rewardName =
                "Unknown";


            let rewardEmoji =
                "🎁";


            if (
                result.type ===
                "food"
            ) {

                rewardName =
                    result.name;

                rewardEmoji =
                    result.emoji;

            }
            else if (
                result.type ===
                "item"
            ) {

                const items =
                    loadItems();


                const item =
                    items.find(
                        i =>
                            i.id ===
                            result.itemId
                    );


                if (item) {

                    rewardName =
                        item.name;

                    rewardEmoji =
                        item.emoji;

                }

            }
            else if (
                result.type ===
                "points"
            ) {

                rewardName =
                    `${result.amount} Points`;

                rewardEmoji =
                    "🏆";

            }
            else if (
                result.type ===
                "diamond"
            ) {

                rewardName =
                    `${result.amount} Diamond`;

                rewardEmoji =
                    "💎";

            }


            socket.emit(
                "blind_box_result",
                {

                    success: true,

                    reward: {

                        type:
                            result.type,

                        name:
                            rewardName,

                        emoji:
                            rewardEmoji

                    }

                }
            );


            sendProfile(
                socket,
                uid
            );

        }
        catch(error) {

            console.error(
                "BLIND BOX ERROR:",
                error
            );


            if (
                error.message ===
                "NO_BLIND_BOX"
            ) {

                socket.emit(
                    "blind_box_result",
                    {

                        success: false,

                        message:
                            "❌ 你没有盲盒"

                    }
                );

                return;

            }


            socket.emit(
                "blind_box_result",
                {

                    success: false,

                    message:
                        "❌ 无法打开盲盒"

                }
            );

        }

    });

    socket.on("sell_bag_item", async (data) => {

        try {

            const uid =
                data.uid;

            const itemId =
                data.id;

            const quantity =
                Number(data.quantity);


            if (
                !uid ||
                !itemId ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                throw new Error(
                    "INVALID_REQUEST"
                );

            }


            const userRef =
                db.collection("users")
                .doc(uid);


            const result =
                await db.runTransaction(
                    async (transaction) => {

                        const userDoc =
                            await transaction.get(
                                userRef
                            );


                        if (!userDoc.exists) {

                            throw new Error(
                                "USER_NOT_FOUND"
                            );

                        }


                        const user =
                            userDoc.data();


                        const inventory =
                            user.inventory || {};


                        let category = null;

                        let sellPrice = null;


                        // =========================
                        // FOOD
                        // =========================

                        const foods =
                            loadFoods();


                        const food =
                            foods.find(
                                food =>
                                    food.id ===
                                    itemId
                            );


                        if (food) {

                            category =
                                "foods";


                            sellPrice =
                                Math.floor(
                                    food.price / 2
                                );

                        }


                        // =========================
                        // NORMAL ITEM
                        // =========================

                        if (
                            sellPrice === null
                        ) {

                            const items =
                                loadItems();


                            const item =
                                items.find(
                                    item =>
                                        item.id ===
                                        itemId
                                );


                            if (item) {

                                category =
                                    "items";


                                sellPrice =
                                    Math.floor(
                                        item.price / 2
                                    );

                            }

                        }


                        // =========================
                        // BLIND BOX
                        // =========================

                        if (
                            itemId ===
                            "blind_box"
                        ) {

                            throw new Error(
                                "NOT_SELLABLE"
                            );

                        }


                        // =========================
                        // FISH
                        // =========================

                        if (
                            sellPrice === null
                        ) {

                            const fishList =
                                loadFish();


                            const caughtFish =
                                fishList.find(
                                    fish =>
                                        fish.id ===
                                        itemId
                                );


                            if (caughtFish) {

                                category =
                                    "fish";


                                // Pearl cannot be sold
                                if (
                                    caughtFish.rarity ===
                                    "pearl"
                                ) {

                                    throw new Error(
                                        "NOT_SELLABLE"
                                    );

                                }


                                // Trash cannot be sold
                                if (
                                    caughtFish.rarity ===
                                    "trash"
                                ) {

                                    throw new Error(
                                        "NOT_SELLABLE"
                                    );

                                }


                                // =========================
                                // FISH SELL PRICE
                                // =========================

                                const fishSellPrices = {

                                    normal:
                                        20,

                                    rare:
                                        50,

                                    super_rare:
                                        200

                                };


                                sellPrice =
                                    fishSellPrices[
                                        caughtFish.rarity
                                    ];


                                if (
                                    !sellPrice
                                ) {

                                    throw new Error(
                                        "NOT_SELLABLE"
                                    );

                                }

                            }

                        }

                        // =========================
                        // BIRDS
                        // =========================

                        if (
                            sellPrice === null
                        ) {

                            const birdList =
                                loadBirds();


                            const bird =
                                birdList.find(
                                    bird =>
                                        bird.id ===
                                        itemId
                                );


                            if (bird) {

                                category =
                                    "birds";


                                const birdSellPrices = {

                                    normal:
                                        50,

                                    rare:
                                        150,

                                    super_rare:
                                        500

                                };


                                sellPrice =
                                    birdSellPrices[
                                        bird.rarity
                                    ];


                                if (
                                    !sellPrice
                                ) {

                                    throw new Error(
                                        "NOT_SELLABLE"
                                    );

                                }

                            }

                        }

                        // =========================
                        // FINAL VALIDATION
                        // =========================

                        if (
                            category === null ||
                            sellPrice === null ||
                            sellPrice <= 0
                        ) {

                            throw new Error(
                                "NOT_SELLABLE"
                            );

                        }


                        // =========================
                        // CHECK INVENTORY
                        // =========================

                        const owned =
                            inventory[
                                category
                            ]?.[
                                itemId
                            ] || 0;


                        if (
                            owned <
                            quantity
                        ) {

                            throw new Error(
                                "NOT_ENOUGH"
                            );

                        }


                        // =========================
                        // TOTAL
                        // =========================

                        const total =
                            sellPrice *
                            quantity;


                        const newQuantity =
                            owned -
                            quantity;


                        const updateData = {

                            points:
                                (
                                    user.points ||
                                    0
                                ) + total

                        };


                        updateData[
                            `inventory.${category}.${itemId}`
                        ] =
                            newQuantity;


                        transaction.update(
                            userRef,
                            updateData
                        );


                        return {

                            quantity:
                                quantity,

                            sellPrice:
                                sellPrice,

                            total:
                                total

                        };

                    }
                );


            // =========================
            // SUCCESS
            // =========================

            socket.emit(
                "sell_result",
                {

                    success:
                        true,

                    message:
                        "✅ 成功卖出!",

                    quantity:
                        result.quantity,

                    sellPrice:
                        result.sellPrice,

                    total:
                        result.total

                }
            );


            socket.emit(
                "get_profile"
            );


            socket.emit(
                "get_bag",
                {
                    uid:
                        uid
                }
            );


        }
        catch (error) {

            console.error(
                "SELL ERROR:",
                error
            );


            let message =
                "❌ 无法卖出";


            if (
                error.message ===
                "NOT_ENOUGH"
            ) {

                message =
                    "❌ 数量不足";

            }


            if (
                error.message ===
                "NOT_SELLABLE"
            ) {

                message =
                    "❌ 该物品不能卖";

            }


            socket.emit(
                "sell_result",
                {

                    success:
                        false,

                    message:
                        message

                }
            );

        }

    });

    socket.on("get_dedicate_foods", async (data) => {

        try {

            
            const uid = data.uid;

            if (!uid) {
                throw new Error(
                    "Missing user UID."
                );
            }


            const userRef =
                db.collection("users").doc(uid);


            const userDoc =
                await userRef.get();


            if (!userDoc.exists) {

                throw new Error(
                    "User profile not found."
                );

            }


            const userData =
                userDoc.data();


            const foods =
                userData.inventory?.foods || {};


            const allFoods =
                loadFoods();


            const dedicateFoods = [];


            Object.entries(foods).forEach(
                ([foodId, quantity]) => {

                    console.log(
                        "CHECKING FOOD:",
                        foodId,
                        quantity
                    );


                    const food =
                        allFoods.find(
                            item =>
                                item.id === foodId
                        );


                    
                    if (!food) {
                        return;
                    }


                    const amount =
                        Number(quantity) || 0;


                    if (amount <= 0) {
                        return;
                    }


                    dedicateFoods.push({

                        id:
                            food.id,

                        name:
                            food.name,

                        emoji:
                            food.emoji,

                        price:
                            food.price,

                        blessChance:
                            food.blessChance || 0,

                        quantity:
                            amount

                    });

                }
            );


            socket.emit(
                "dedicate_foods",
                dedicateFoods
            );


        }
        catch(error) {

            console.error(
                "DEDICATE FOOD ERROR:",
                error
            );


            socket.emit(
                "dedicate_food_error",
                {
                    message:
                        error.message
                }
            );

        }

    });

    socket.on("dedicate_food", async (data) => {

        try {

            const uid =
                data.uid;

            const room =
                data.room || "global";

            const selectedFoods =
                data.foods;

            const userRef =
                db.collection("users")
                .doc(uid);

            const userDoc =
                await userRef.get();

            if (!userDoc.exists) {

                throw new Error(
                    "USER_NOT_FOUND"
                );

            }

            const userData =
                userDoc.data();


            // ========================================
            // CHECK WEEKLY DEDICATION
            // ========================================

            if (userData.lastDedicateAt) {

                throw new Error(
                    "DEDICATE_ALREADY_USED"
                );

            }


            console.log(
                "\n===== DEDICATION REQUEST ====="
            );

            console.log(
                "UID:",
                uid
            );

            console.log(
                "SELECTED FOODS:",
                selectedFoods
            );


            // ========================================
            // BASIC VALIDATION
            // ========================================

            if (!uid) {

                throw new Error(
                    "Missing user UID."
                );

            }


            if (
                !Array.isArray(selectedFoods) ||
                selectedFoods.length === 0
            ) {

                throw new Error(
                    "Please select at least one food."
                );

            }


            

            // ========================================
            // CALCULATE DEDICATION
            // ========================================

            const foodResult =
                calculateFoodDedication(
                    selectedFoods
                );


            const comboWeight =
                calculateComboBlessWeight(
                    selectedFoods
                );


            const totalBlessWeight =
                foodResult.foodWeight +
                comboWeight;


            const chances =
                calculateBlessRewardChances(
                    totalBlessWeight
                );


            console.log(
                "Food value:",
                foodResult.foodValue
            );

            console.log(
                "Food weight:",
                foodResult.foodWeight
            );

            console.log(
                "Combo weight:",
                comboWeight
            );

            console.log(
                "Total bless weight:",
                totalBlessWeight
            );

            console.log(
                "Bless chance:",
                chances.blessChance
            );

            console.log(
                "Star chance:",
                chances.starChance
            );


            // ========================================
            // DETERMINE REWARD
            // ========================================

            let rewardType;


            // ========================================
            // BELOW 100
            // ========================================

            if (!chances.blessed) {

                const blessed =
                    Math.random() * 100 <
                    chances.blessChance;

                if (blessed) {

                    rewardType =
                        rollBlessingReward(
                            chances
                        );

                }
                else {

                    rewardType =
                        "normal";

                }

            }


            // ========================================
            // 100+
            // ========================================

            else {

                rewardType =
                    rollBlessingReward(
                        chances
                    );

            }


            console.log(
                "Reward type:",
                rewardType
            );


            // ========================================
            // CALCULATE ACTUAL REWARD
            // ========================================

            const reward =
                calculateDedicationReward(
                    rewardType,
                    foodResult.foodValue
                );


            console.log(
                "Reward:",
                reward
            );


            // ========================================
            // FIRESTORE TRANSACTION
            // ========================================

            const result =
                await db.runTransaction(
                    async (transaction) => {

                        const userDoc =
                            await transaction.get(
                                userRef
                            );


                        if (!userDoc.exists) {

                            throw new Error(
                                "USER_NOT_FOUND"
                            );

                        }


                        const user =
                            userDoc.data();


                        const inventory =
                            user.inventory || {};


                        const currentFoods =
                            {
                                ...(inventory.foods || {})
                            };


                        // =================================
                        // CHECK OWNERSHIP AGAIN
                        // =================================

                        for (
                            const selected
                            of selectedFoods
                        ) {

                            const quantity =
                                Number(
                                    selected.quantity
                                );


                            if (
                                !Number.isInteger(quantity) ||
                                quantity <= 0
                            ) {

                                throw new Error(
                                    "INVALID_QUANTITY"
                                );

                            }


                            const owned =
                                Number(
                                    currentFoods[
                                        selected.id
                                    ] || 0
                                );


                            if (
                                owned < quantity
                            ) {

                                throw new Error(
                                    `NOT_ENOUGH_${selected.id}`
                                );

                            }

                        }


                        // =================================
                        // REMOVE FOOD
                        // =================================

                        selectedFoods.forEach(
                            selected => {

                                const quantity =
                                    Number(
                                        selected.quantity
                                    );


                                currentFoods[
                                    selected.id
                                ] =
                                    (
                                        Number(
                                            currentFoods[
                                                selected.id
                                            ] || 0
                                        )
                                    ) -
                                    quantity;


                                if (
                                    currentFoods[
                                        selected.id
                                    ] <= 0
                                ) {

                                    delete currentFoods[
                                        selected.id
                                    ];

                                }

                            }
                        );


                        // =================================
                        // CURRENT PLAYER VALUES
                        // =================================

                        const currentPoints =
                            Number(
                                user.points || 0
                            );


                        const currentStars =
                            Number(
                                user.stars || 0
                            );


                        const newPoints =
                            currentPoints +
                            reward.points;


                        const newStars =
                            currentStars +
                            reward.stars;


                        // =================================
                        // UPDATE PLAYER
                        // =================================

                        transaction.update(
                            userRef,
                            {

                                points:
                                    newPoints,

                                stars:
                                    newStars,

                                "inventory.foods":
                                    currentFoods,

                                lastDedicateAt:
                                    FieldValue.serverTimestamp()

                            }
                        );


                        return {

                            username:
                                user.username,

                            newPoints:
                                newPoints,

                            newStars:
                                newStars

                        };

                    }
                );

                // ========================================
                // CREATE DEDICATION CHAT MESSAGE
                // ========================================

                let dedicationMessage = "";

                if (rewardType === "normal") {

                    dedicationMessage =
                        `🙏 ${result.username} 献上并获得奖励! <br>

                🍽️ 食物总值: ${foodResult.foodValue} 🏆 <br>
                ✨ 祝福机会值: ${chances.blessChance}% <br>

                🎁 奖励: +${reward.points} Points <br>

                💰 Points 获得: +${reward.points} <br>
                💰 Points 总数: ${result.newPoints}`;

                }

                else if (rewardType === "star") {

                    dedicationMessage =
                        `🌟 ${result.username} 献上获得了星🌟! <br>

                🍽️ 食物总值: ${foodResult.foodValue} 🏆 <br>
                ✨ 祝福机会值: ${chances.blessChance}% <br>
                🌟 星获得几率: ${chances.starChance}% <br>

                🎁 奖励: +1 ⭐ 星 <br>

                💰 Points 总数: ${result.newPoints} <br>
                ⭐ 星总数: ${result.newStars}`;

                }

                else if (rewardType === "reward1") {

                    dedicationMessage =
                        `🙏 ${result.username} 献上成功! <br>

                🍽️ 食物总值: ${foodResult.foodValue} 🏆 <br>
                ✨ 祝福机会值: ${chances.blessChance}% <br>

                🎁 奖励 1: +${reward.points} Points <br>

                💰 Points 获得: +${reward.points} <br>
                💰 Points 总数: ${result.newPoints}`;

                }

                else if (rewardType === "reward2") {

                    dedicationMessage =
                        `🔥 ${result.username} 更大的献上给神! <br>

                🍽️ 食物总值: ${foodResult.foodValue} 🏆 <br>
                ✨ 祝福机会值: ${chances.blessChance}% <br>

                🎁 奖励 2: +${reward.points} Points <br>

                💰 Points 获得: +${reward.points} <br>
                💰 Points 总数: ${result.newPoints}`;

                }

                else if (rewardType === "reward3") {

                    dedicationMessage =
                        `🔥🔥 ${result.username} 给出了最大值的献上! <br>

                🍽️ 食物总值: ${foodResult.foodValue} 🏆 <br>
                ✨ 祝福机会值: ${chances.blessChance}% <br>

                🎁 奖励 3: +${reward.points} Points <br>

                💰 Points 获得: +${reward.points} <br>
                💰 Points 总数: ${result.newPoints}`; 

                }


                // ========================================
                // SAVE TO CHAT HISTORY
                // ========================================

                const botMessage = {

                    username: "FaithBot",

                    uid: "FaithBot",

                    room: room,

                    text: dedicationMessage,

                    createdAt: Date.now()

                };


                await saveChatMessage(
                    room,
                    botMessage
                );

                // ========================================
                // SHOW TO EVERYONE IN CHAT
                // ========================================

                io.to(data.room).emit(
                    "receive_message",
                    botMessage
                );
            // ========================================
            // SEND RESULT
            // ========================================

            socket.emit(
                "dedicate_result",
                {

                    success:
                        true,

                    rewardType:
                        rewardType,

                    reward:
                        reward,

                    foodValue:
                        foodResult.foodValue,

                    foodWeight:
                        foodResult.foodWeight,

                    comboWeight:
                        comboWeight,

                    totalBlessWeight:
                        totalBlessWeight,

                    blessed:
                        rewardType !== "normal",

                    star:
                        rewardType === "star",

                    blessChance:
                        chances.blessChance,

                    starChance:
                        chances.starChance,

                    reward1Chance:
                        chances.reward1Chance,

                    reward2Chance:
                        chances.reward2Chance,

                    reward3Chance:
                        chances.reward3Chance,

                    newPoints:
                        result.newPoints,

                    newStars:
                        result.newStars

                }
            );


            // ========================================
            // UPDATE PROFILE
            // ========================================

            await sendProfile(
                socket,
                uid
            );


            console.log(
                "===== DEDICATION COMPLETE =====\n"
            );

        }
        catch (error) {

            console.error(
                "DEDICATION ERROR:",
                error
            );


            let message =
                "❌ 献上失败";


            if (
                error.message ===
                "USER_NOT_FOUND"
            ) {

                message =
                    "❌ 用户无法识别";

            }


            else if (
                error.message ===
                "INVALID_QUANTITY"
            ) {

                message =
                    "❌ 数量不足";

            }


            else if (
                error.message.startsWith(
                    "NOT_ENOUGH_"
                )
            ) {

                const foodId =
                    error.message.replace(
                        "NOT_ENOUGH_",
                        ""
                    );


                message =
                    `❌ 你没有足够 ${foodId}.`;

            }

            else if (
                error.message ===
                "DEDICATE_ALREADY_USED"
            ) {

                message =
                    "⏳ 这个礼拜已经献上了，请等至下个礼拜";

            }


            else if (
                error.message
            ) {

                message =
                    `❌ ${error.message}`;

            }


            socket.emit(
                "dedicate_result",
                {

                    success:
                        false,

                    message:
                        message

                }
            );

        }

    });

    socket.on("start_adventure", async (data) => {

        try {

            const {
                startAdventure
            } = require("./game/adventureManager");


            // =========================
            // GET DATA
            // =========================

            const uid =
                data.uid;

            const configId =
                data.configId;

            const locationId =
                data.locationId;

            const useAdventureLens =
                data.useAdventureLens === true;


            // =========================
            // VALIDATE
            // =========================

            if (!uid) {

                throw new Error(
                    "USER_NOT_FOUND"
                );

            }


            if (!configId) {

                throw new Error(
                    "INVALID_DURATION"
                );

            }


            if (!locationId) {

                throw new Error(
                    "INVALID_LOCATION"
                );

            }


            // =========================
            // START ADVENTURE
            // =========================

            const adventure =
                await startAdventure(
                    uid,
                    configId,
                    locationId,
                    useAdventureLens
                );

            console.log(
                "ADVENTURE CREATED:",
                adventure
            );


            // =========================
            // CREATE CHAT MESSAGE
            // =========================

            const durationMinutes =
                Math.floor(
                    Number(adventure.duration) / 60
                );

            const lensMessage =
                adventure.adventureLens
                    ? `🔍 放大镜已使用，奖励概率 +5%！\n\n <br>`
                    : "";

            const message =
                `🗺️ 冒险开始！\n\n <br>` +
                `📍 ${adventure.locationName}\n\n` +
                `⏳ 冒险时间：${durationMinutes} 分钟\n\n <br>` +
                `🗺️ 地图已使用。\n\n <br>` +
                lensMessage +
                `完成后回来领取你的冒险奖励！`;


            // =========================
            // SAVE TO FIRESTORE
            // =========================

            await saveChatMessage(
                data.room,
                {
                    username:
                        "FaithBot",

                    uid:
                        "system",

                    text:
                        message
                }
            );


            // =========================
            // SEND TO CLIENT
            // =========================

            socket.emit(
                "adventure_started",
                {
                    adventure:
                        adventure,

                    message:
                        message
                }
            );


        }
        catch (error) {

            console.error(
                "ADVENTURE START ERROR:",
                error
            );


            let message =
                "❌ 无法开始冒险。";


            if (
                error.message ===
                "USER_NOT_FOUND"
            ) {

                message =
                    "❌ 找不到玩家资料。";

            }


            if (
                error.message ===
                "NO_MAP"
            ) {

                message =
                    "❌ 你没有地图！";

            }


            if (
                error.message ===
                "ADVENTURE_ALREADY_ACTIVE"
            ) {

                message =
                    "❌ 你已经在冒险中了！";

            }


            if (
                error.message ===
                "INVALID_DURATION"
            ) {

                message =
                    "❌ 冒险时间无效。";

            }


            if (
                error.message ===
                "INVALID_LOCATION"
            ) {

                message =
                    "❌ 冒险地点无效。";

            }


            socket.emit(
                "adventure_error",
                {

                    success:
                        false,

                    message:
                        message

                }
            );

        }

    });

    socket.on("finish_adventure",async (data) => {

        try {

            const {
                finishAdventure
            } = require(
                "./game/adventureManager"
            );


            const uid =
                data.uid;


            if (!uid) {

                throw new Error(
                    "USER_NOT_FOUND"
                );

            }


            // =========================
            // FINISH
            // =========================

            const result =
                await finishAdventure(
                    uid
                );


            console.log(
                "ADVENTURE FINISHED:",
                result
            );


            // =========================
            // BUILD REWARD MESSAGE
            // =========================

            let message =
                `🎉 冒险完成！\n\n <br>`;


            result.rewards.forEach(
                reward => {

                    if (
                        reward.type ===
                        "nothing"
                    ) {

                        message +=
                            "▫️ 什么也没有发现\n <br>";

                    }

                    else if (
                        reward.type ===
                        "food"
                    ) {

                        message +=
                            `${reward.emoji} ${reward.name} ×${reward.quantity}\n <br>`;

                    }

                    else if (
                        reward.type ===
                        "collection"
                    ) {

                        message +=
                            `${reward.emoji} ${reward.name}\n <br>`;

                    }

                    else if (
                        reward.type ===
                        "hatch_egg"
                    ) {

                        message +=
                            `🥚 孵化蛋 ×${reward.quantity}\n <br>`;

                    }

                    else if (
                        reward.type ===
                        "treasure"
                    ) {

                        message +=
                            `🪎 宝藏 ×${reward.quantity}\n <br>`;

                    }

                }
            );


            // =========================
            // SAVE MESSAGE
            // =========================

            await saveChatMessage(
                data.room,
                {
                    username:
                        "FaithBot",

                    uid:
                        "system",

                    text:
                        message
                }
            );

            console.log(
                "✅ ADVENTURE FINISH MESSAGE SAVED TO ROOM:",
                data.room
            );

            // =========================
            // SEND RESULT
            // =========================

            console.log(
                "📢 SENDING adventure_finished TO CLIENT:",
                {
                    adventure: result.adventure,
                    rewards: result.rewards
                }
            );

            socket.emit(
                "adventure_finished",
                {
                    adventure:
                        result.adventure,

                    rewards:
                        result.rewards,

                    message:
                        message
                }
            );


        }
        catch (error) {

            console.error(
                "ADVENTURE FINISH ERROR:",
                error
            );


            let message =
                "❌ 无法领取冒险奖励。";


            if (
                error.message ===
                "NO_ACTIVE_ADVENTURE"
            ) {

                message =
                    "❌ 没有进行中的冒险。";

            }


            if (
                error.message ===
                "ADVENTURE_NOT_FINISHED"
            ) {

                message =
                    "❌ 冒险还没有完成。";

            }


            socket.emit(
                "adventure_finish_error",
                {
                    success:
                        false,

                    message:
                        message
                }
            );

        }

    });

    socket.on("claim_adventure",async (data) => {

        try {

            const {
                finishAdventure
            } =
                require(
                    "./game/adventureManager"
                );


            const result =
                await finishAdventure(
                    data.uid
                );


            console.log(
                "ADVENTURE FINISHED:",
                result
            );


            socket.emit(
                "adventure_finished",
                {
                    success:
                        true,

                    adventure:
                        result.adventure,

                    rewards:
                        result.rewards
                }
            );

        }
        catch (error) {

            console.error(
                "ADVENTURE FINISH ERROR:",
                error
            );


            let message =
                "❌ 无法领取冒险奖励。";


            if (
                error.message ===
                "ADVENTURE_NOT_FINISHED"
            ) {

                message =
                    "⏳ 冒险还没有完成。";

            }


            if (
                error.message ===
                "NO_ACTIVE_ADVENTURE"
            ) {

                message =
                    "❌ 没有正在进行的冒险。";

            }


            socket.emit(
                "adventure_finish_error",
                {
                    success:
                        false,

                    message:
                        message
                }
            );

        }

    });

    socket.on("get_my_adventure",async (data) => {

        try {

            const {
                loadActiveAdventure
            } =
                require(
                    "./game/adventureManager"
                );


            const adventure =
                await loadActiveAdventure(
                    data.uid
                );


            console.log(
                "ACTIVE ADVENTURE:",
                adventure
            );


            socket.emit(
                "my_adventure",
                {
                    adventure:
                        adventure
                }
            );

        }
        catch (error) {

            console.error(
                "GET ADVENTURE ERROR:",
                error
            );


            socket.emit(
                "my_adventure",
                {
                    adventure:
                        null
                }
            );

        }

    });

    socket.on("my_adventure",(data) => {

        console.log(
            "MY ADVENTURE:",
            data
        );

        if (!data.adventure) {

            return;

        }

        startAdventureTimer(
            data.adventure
        );

    });

    socket.on("remove_math_question",(data) => {

        removeMathQuestion(
            data.userId,
            data.gameType
        );

    });

    socket.on(
    "open_treasure",
    async (data) => {

        try {

            const result =
                await openTreasure(
                    data.uid
                );
            
            socket.emit(
                "treasure_opened",
                {
                    rewardPoints:
                        result.rewardPoints,

                    remainingTreasure:
                        result.remainingTreasure
                }
            );

            await sendBotMessage(
                data.room,
                `🧰 宝箱开启！

🎉 你获得了：

🏆 ${result.rewardPoints} Points`
            );


            sendProfile(
                socket,
                data.uid
            );

        }
        catch (error) {

            console.error(
                "OPEN TREASURE ERROR:",
                error
            );


            if (
                error.message ===
                "NO_TREASURE"
            ) {

                await sendBotMessage(
                    data.room,
                    "🧰 你没有宝箱可以开启。"
                );

            }

        }

    });
});

async function churchDonateCommand(socket,data,io){
    try{
        const uid=socket.uid;
        const amount=Number(data.text.trim().split(/\s+/)[2]);

        if(!uid){
            socket.emit("church_donate_error",{message:"❌ 用户无法识别."});
            return;
        }

        if(!Number.isInteger(amount)||amount<=0){
            socket.emit("church_donate_error",{message:"❌ 请输入正确的献上金额"});
            return;
        }

        const userRef=db.collection("users").doc(uid);
        const userDoc=await userRef.get();

        if(!userDoc.exists){
            socket.emit("church_donate_error",{message:"❌ 无法识别用户"});
            return;
        }

        const user=userDoc.data();
        

        if(!user.churchId){
            socket.emit("church_donate_error",{message:"❌ 你不在教会里"});
            return;
        }

        if((user.points||0)<amount){
            socket.emit("church_donate_error",{message:"❌ Points不足"});
            return;
        }

        const churchRef=db.collection("churches").doc(user.churchId);
        const churchDoc=await churchRef.get();

        if(!churchDoc.exists){
            socket.emit("church_donate_error",{message:"❌ 教会不存在"});
            return;
        }

        const church=churchDoc.data();

        await userRef.update({
            points:(user.points||0)-amount
        });

        const newTotal =
            (church.totalDonations || 0) + amount;

        const memberXP =
            church.memberXP || 0;

        const newAmount =
            newTotal + memberXP;

        const oldLevel =
            church.level || 1;

        const newLevel =
            getChurchLevel(newAmount);
        

        await churchRef.update({
            totalDonations:newTotal,
            level:newLevel
        });

        if(newLevel>oldLevel){

            const levelMessage={
                username:"FaithBot",
                uid:"FaithBot",
                room:data.room,
                text:`🎉 ${church.name} 教会达到 Lv.${newLevel}!`,
                createdAt:Date.now()
            };

            await saveChatMessage(
                data.room,
                levelMessage
            );

            io.to(data.room).emit(
                "receive_message",
                levelMessage
            );
        }

        const botMessage={
            username:"FaithBot",
            uid:"FaithBot",
            room:data.room,
            text:`⛪ ${user.username} 捐献 ${amount} Points 给 ${church.name}! <br>

🏛️ 教会总捐献: ${(church.totalDonations||0)+amount} Points`,
            createdAt:Date.now()
        };

        await saveChatMessage(data.room,botMessage);
        io.to(data.room).emit("receive_message",botMessage);

        socket.emit("church_donate_success", {

            amount: amount,

            totalDonations: newTotal,

            memberXP: memberXP,

            churchAmount: newAmount,

            churchLevel: newLevel

        });

    }catch(error){
        console.error("Church donate error:",error);
        socket.emit("church_donate_error",{message:"❌ 捐献失败"});
    }
}

async function churchInfoCommand(socket,data,io){
    try{
        const uid=socket.uid;

        const userDoc=await db.collection("users").doc(uid).get();

        if(!userDoc.exists){
            socket.emit("church_info_error",{message:"❌ 用户无法识别"});
            return;
        }

        const user=userDoc.data();

        if(!user.churchId){
            socket.emit("church_info_error",{message:"❌ 你不在教会里"});
            return;
        }

        const churchDoc=await db.collection("churches").doc(user.churchId).get();

        if(!churchDoc.exists){
            socket.emit("church_info_error",{message:"❌ 教会不存在"});
            return;
        }

        const church=churchDoc.data();
        const donations=church.totalDonations||0;
        const memberXP=church.memberXP||0;
        const amount=donations+memberXP;

        const message={
            username:"FaithBot",
            uid:"FaithBot",
            room:data.room,
            text:`⛪ ${church.name} <br>

🏛️ 教会等级: Lv.${church.level||1} <br>
💰 捐献: ${donations} Points <br>
⭐ 成员 XP: ${memberXP} XP <br>
📊 教会总值: ${amount} <br>
👥 成员: ${church.members?.length||0}`,
            createdAt:Date.now()
        };

        await saveChatMessage(data.room,message);
        io.to(data.room).emit("receive_message",message);

    }catch(error){
        console.error("Church info error:",error);
        socket.emit("church_info_error",{message:"❌ 无法获得教会信息"});
    }
}

function handleCommand(data,socket,io){


    console.log("HANDLE COMMAND RUN");
    console.log(data.text);

    const args = data.text
        .toLowerCase()
        .replace("c#", "")
        .trim()
        .split(/\s+/);

    const command = args[0];


    switch(command){


        case "help":
            helpCommand.execute(socket,io,data,saveChatMessage);

            break;

        case "profile":

            profileCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "quiz":

            quizCommand.execute(socket, data, io,saveChatMessage);

            break;

        case "leaderboard":

            leaderboardCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "wish":

            wishCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "daily":

            dailyCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;


        case "church": {

            const churchAction = args[1]?.toLowerCase();


            if (churchAction === "create") {

                socket.emit(
                    "open_church_create"
                );

            }

            else if (churchAction === "enter") {

                socket.emit(
                    "open_church_enter"
                );

            }

            else if (churchAction === "leave") {

                socket.emit(
                    "confirm_church_leave"
                );

            }

            else if (churchAction === "donate") {

                churchDonateCommand(
                    socket,
                    data,
                    io
                );

            }

            else if (churchAction === "info") {

                churchInfoCommand(
                    socket,
                    data,
                    io
                );

            }

            else {

                socket.emit(
                    "receive_message",
                    {
                        username: "FaithBot",

                        text:
                            `⛪ 不成立cmd: "${args[1] || ""}"\n\n <br>` +

                            `适用教会cmd:\n\n <br>` +

                            `🏛️ C#church create\n <br>` +

                            `🚪 C#church enter\n <br>` +

                            `🚶 C#church leave\n <br>` +

                            `💰 C#church donate <amount>\n <br>` +

                            `ℹ️ C#church info`,

                        room:
                            data.room,

                        createdAt:
                            Date.now()

                    }
                );

            }

            break;
        }

        case "work":

            workCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "shop":

            socket.emit("open_shop");

            break;

        case "bag":

            socket.emit(
                "open_bag"
            );

            break;

        case "dedicate":

            socket.emit(
                "open_dedicate"
            );

            break;

        case "give":

            giveCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "rob":

            robCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "fish":

            fishCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "adventure":

            adventureCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "bird":

            birdCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;
        case "math": {

            console.log("🔥 MATH CASE RUN");
            console.log("UID:", data.uid);
            console.log("ARGS:", args);

            // ============================================
            // CHECK MATH COOLDOWN
            // ============================================

            const lastMathTime =
                mathCooldowns.get(data.uid);

            if (lastMathTime) {

                const elapsed =
                    Date.now() - lastMathTime;

                if (elapsed < MATH_COOLDOWN) {

                    const remaining =
                        MATH_COOLDOWN - elapsed;

                    const minutes =
                        Math.floor(
                            remaining / 60000
                        );

                    const seconds =
                        Math.ceil(
                            (remaining % 60000) / 1000
                        );

                    const cooldownMessage = {

                        username:
                            "FaithBot",

                        uid:
                            "FaithBot",

                        text:
                            `⏳ 冷却中!\n\n` +
                            `请等 ${minutes}分钟 ` +
                            `${seconds}秒开始 ` +
                            `下一场游戏`,

                        room:
                            data.room,

                        createdAt:
                            Date.now()

                    };


                    saveChatMessage(
                        data.room,
                        cooldownMessage
                    )
                    .then(() => {

                        io.to(
                            data.room
                        ).emit(
                            "receive_message",
                            cooldownMessage
                        );

                    })
                    .catch(error => {

                        console.error(
                            "❌ Failed to save math cooldown:",
                            error
                        );

                    });


                    break;
                }
            }


            // ============================================
            // START MATH
            // ============================================

            const result = mathCommand(
                data.uid,
                args.slice(1)
            );

            console.log("🔥 MATH RESULT:", result);


            // ============================================
            // NORMAL MESSAGE
            // ============================================

            if (result.type === "message") {

                socket.emit(
                    "receive_message",
                    {
                        username: "FaithBot",
                        text: result.message,
                        room: data.room,
                        createdAt: Date.now()
                    }
                );

            }


            // ============================================
            // MATH GAME
            // ============================================

            else if (result.type === "math_game") {

                mathCooldowns.set(
                    data.uid,
                    Date.now()
                );
                
                const mathMessage = {

                    username: "FaithBot",

                    uid: "FaithBot",

                    text: result.message,

                    room: data.room,

                    createdAt: Date.now(),

                    isMathGame: true,

                    mathGameType: result.gameType,

                    mathGameOwner: data.uid,

                    messageId:
                        `math_${data.uid}_${Date.now()}`
                };


                // ========================================
                // SAVE QUESTION
                // ========================================

                saveChatMessage(
                    data.room,
                    mathMessage
                )
                .then(() => {

                    console.log(
                        "✅ Math question saved"
                    );

                })
                .catch(error => {

                    console.error(
                        "❌ Failed to save math question:",
                        error
                    );

                });


                // ========================================
                // SHOW QUESTION
                // ========================================

                io.to(data.room).emit(
                    "receive_message",
                    mathMessage
                );


                // ========================================
                // CALCULATE
                // ========================================

                if (result.gameType === "calculate") {

                    const timer = setTimeout(() => {

                        const timeoutResult =
                            handleMathTimeout(
                                data.uid
                            );


                        if (!timeoutResult) {
                            return;
                        }


                        const timeoutMessage = {

                            username: "FaithBot",

                            uid: data.uid,

                            text:
                                formatMathResult(
                                    timeoutResult
                                ),

                            room: data.room,

                            createdAt: Date.now(),

                            isMathTimeout: true,

                            mathGameType:
                                result.gameType,

                            mathGameOwner:
                                data.uid
                        };


                        // ====================================
                        // SAVE TIMEOUT
                        // ====================================

                        saveChatMessage(
                            data.room,
                            timeoutMessage
                        )
                        .then(() => {

                            console.log(
                                "✅ Math timeout saved"
                            );

                            // Show only after saved
                            io.to(data.room).emit(
                                "receive_message",
                                timeoutMessage
                            );

                        })
                        .catch(error => {

                            console.error(
                                "❌ Failed to save math timeout:",
                                error
                            );

                        });

                    }, 5000);


                    // ========================================
                    // STORE TIMER
                    // ========================================

                    const game =
                        getMathGame(data.uid);

                    if (game) {

                        game.timer = timer;

                    }

                }


                // ========================================
                // MEMORIZE
                // ========================================

                if (result.gameType === "memorize") {

                    // ----------------------------------------
                    // HIDE QUESTION
                    // ----------------------------------------

                    setTimeout(() => {

                        io.to(data.room).emit(
                            "hide_math_question",
                            {
                                messageId:
                                    mathMessage.messageId
                            }
                        );

                    }, result.game.showTime);


                    // ----------------------------------------
                    // TIMEOUT
                    // ----------------------------------------

                    const timer = setTimeout(() => {

                        const timeoutResult =
                            handleMathTimeout(
                                data.uid
                            );


                        if (!timeoutResult) {
                            return;
                        }


                        const timeoutMessage = {

                            username: "FaithBot",

                            uid: data.uid,

                            text:
                                formatMathResult(
                                    timeoutResult
                                ),

                            room: data.room,

                            createdAt: Date.now(),

                            isMathTimeout: true,

                            mathGameType:
                                result.gameType,

                            mathGameOwner:
                                data.uid
                        };


                        // ====================================
                        // SAVE TIMEOUT
                        // ====================================

                        saveChatMessage(
                            data.room,
                            timeoutMessage
                        )
                        .then(() => {

                            console.log(
                                "✅ Math memorize timeout saved"
                            );

                            io.to(data.room).emit(
                                "receive_message",
                                timeoutMessage
                            );

                        })
                        .catch(error => {

                            console.error(
                                "❌ Failed to save math timeout:",
                                error
                            );

                        });

                    }, result.game.showTime + 10000);


                    // ========================================
                    // STORE TIMER
                    // ========================================

                    const game =
                        getMathGame(data.uid);

                    if (game) {

                        game.timer = timer;

                    }

                }

                // ============================================
                // MATH QUIZ
                // ============================================

                if (result.gameType === "quiz") {

                    


                    // ========================================
                    // 12 SECOND TIMEOUT
                    // ========================================

                    const timer = setTimeout(() => {

                        const timeoutResult =
                            handleMathTimeout(
                                data.uid
                            );


                        if (!timeoutResult) {
                            return;
                        }


                        const timeoutMessage = {

                            username: "FaithBot",

                            uid: data.uid,

                            text:
                                formatMathResult(
                                    timeoutResult
                                ),

                            room: data.room,

                            createdAt: Date.now(),

                            isMathTimeout: true,

                            mathGameType: "quiz",

                            mathGameOwner: data.uid

                        };


                        // ====================================
                        // SAVE TIMEOUT
                        // ====================================

                        saveChatMessage(
                            data.room,
                            timeoutMessage
                        )
                        .then(() => {

                            console.log(
                                "✅ Math quiz timeout saved"
                            );

                            io.to(data.room).emit(
                                "receive_message",
                                timeoutMessage
                            );

                        })
                        .catch(error => {

                            console.error(
                                "❌ Failed to save math quiz timeout:",
                                error
                            );

                        });

                    }, 12000);


                    // ========================================
                    // STORE TIMER
                    // ========================================

                    const game =
                        getMathGame(data.uid);

                    if (game) {

                        game.timer = timer;

                    }

                }

            }

            break;
        }

        case "collection":

            collectionCommand.execute(
                socket,
                data,
                io,
                saveChatMessage
            );

            break;

        case "trivia":
            triviaCommand.execute(
                socket,
                data,
                io,
                saveChatMessage,
                args
            );
            break;

        default:

            io.to(data.room).emit(
                "receive_message",
                {
                    username:"FaithBot",
                    text:
                    "❓ 未知cmd 可试C#help",room:data.room,
                    room:data.room
                }
            );

    }
}

startWeeklyReset();

startWeeklyDedicateReset();

server.listen(3000,()=>{
    console.log("Server running on http://localhost:3000");
});

