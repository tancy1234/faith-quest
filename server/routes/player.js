const express=require("express");
const router=express.Router();

const db=require("../config/firebase");


router.post("/create",async(req,res)=>{

    const {
        uid,
        username,
        email,
        avatar
    }=req.body;


    const userRef=db.collection("users").doc(uid);

    const userDoc=await userRef.get();


    if(userDoc.exists){

        return res.json({
            message:"Player already exists",
            data:userDoc.data()
        });

    }


    const newPlayer={

        username:username,
        email:email,
        avatar:avatar,

        coins:100,
        xp:0,
        level:1,

        createdAt:new Date()

    };


    await userRef.set(newPlayer);


    res.json({

        message:"Player created",
        data:newPlayer

    });


});


module.exports=router;