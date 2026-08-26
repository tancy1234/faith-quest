const db = require("../config/firebase");


module.exports = {

    name:"wish",


    async execute(socket,data,io,saveChatMessage){


        const sendBotMessage = async(text)=>{


            const message = {

                username:"FaithBot",

                uid:"FaithBot",

                room:data.room,

                text:text,

                createdAt:Date.now()

            };


            await saveChatMessage(
                data.room,
                message
            );


            io.to(data.room).emit(
                "receive_message",
                message
            );

        };



        const args = data.text
            .toLowerCase()
            .replace("c#wish","")
            .trim();



        const amount = Number(args);



        if(!amount || amount <= 0){

            await sendBotMessage(
`🙏 请输入合理数目的 Points <br>

比如:
C#wish 1000`
            );

            return;

        }



        if(amount < 100){

            await sendBotMessage(
`❌ 最低 100 Points.`
            );

            return;

        }



        if(amount > 5000){

            await sendBotMessage(
`❌ 最高只能 5000 Points.`
            );

            return;

        }



        const userRef =
            db.collection("users")
            .doc(data.uid);



        const userDoc =
            await userRef.get();



        if(!userDoc.exists){

            return;

        }



        const user = userDoc.data();



        if(user.points < amount){


            await sendBotMessage(
`❌ ${user.username} 你并没有足够的 Points.

目前 Points总数:
${user.points}`
            );


            return;

        }



        let newPoints =
            user.points - amount;



        let reward = 0;


        const random =
            Math.random() * 100;



        if(random < 1){

            reward = amount * 2;

        }
        else if(random < 3){

            reward = amount * 1.5;

        }
        else if(random < 11){

            reward = amount;

        }
        else{

            reward = 0;

        }



        newPoints += reward;



        await userRef.update({

            points:newPoints

        });



        let message;



        if(reward === 0){


            message =
`🙏 ${user.username} 许愿了! <br>

奉献:
${amount} Points <br>

没有回报 但慢慢得到了神的关注 <br>

目前 Points总数:
${newPoints}`;

        }
        else{


            message =
`✨ ${user.username} 得到了祝福! <br>

奉献:
${amount} Points <br>

获得:
+${reward} Points <br>

目前 Points总数:
${newPoints}`;

        }



        await sendBotMessage(message);


    }

};