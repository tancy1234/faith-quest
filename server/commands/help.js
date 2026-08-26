module.exports = {

    name:"help",

    async execute(socket,io, data, saveChatMessage){

        const message = {

            username:"FaithBot",
            uid:"FaithBot",
            text:
`
📖 适用cmd:

C#help
C#profile
C#quiz
C#wish
`,

            room:data.room,
            timestamp:Date.now()

        };

        console.log("SAVING BOT MESSAGE");

        await saveChatMessage(
            data.room,
            message
        );
        console.log("SENDING BOT MESSAGE");

        io.to(data.room).emit(
            "receive_message",
            message
        );

    }

};