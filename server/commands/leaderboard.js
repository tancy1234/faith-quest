const db = require("../config/firebase");

module.exports = {

    name:"leaderboard",

    async execute(socket,data,io,saveChatMessage){


        const snapshot =
            await db.collection("users")
            .orderBy("points","desc")
            .limit(10)
            .get();



        let text = "🏆 星期排名\n\n <br>";

        let rank = 1;



        snapshot.forEach(doc=>{


            const user = doc.data();


            let medal = "";


            if(rank===1) medal="🥇";
            else if(rank===2) medal="🥈";
            else if(rank===3) medal="🥉";


            text +=
`${rank}. ${medal} ${user.username}

⭐ Lv.${user.level}

🏆 ${user.points} Points <br>


`;


            rank++;


        });



        const message = {

            username:"FaithBot",

            uid:"FaithBot",

            room:data.room,

            text:text,

            createdAt:Date.now()

        };



        // save message
        await saveChatMessage(
            data.room,
            message
        );



        // send only current room
        io.to(data.room).emit(
            "receive_message",
            message
        );


    }

};