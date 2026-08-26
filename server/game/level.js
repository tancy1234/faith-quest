const levels = [
    {
        level:1,
        minXP:0,
        maxXP:49
    },
    {
        level:2,
        minXP:50,
        maxXP:149
    },
    {
        level:3,
        minXP:150,
        maxXP:349
    },
    {
        level:4,
        minXP:350,
        maxXP:649
    },
    {
        level:5,
        minXP:650,
        maxXP:999
    },
    {
        level:6,
        minXP:1000,
        maxXP:1499
    },
    {
        level:7,
        minXP:1500,
        maxXP:2099
    },
    {
        level:8,
        minXP:2100,
        maxXP:2999
    },
    {
        level:9,
        minXP:3000,
        maxXP:4499
    },
    {
        level:10,
        minXP:4500,
        maxXP:9999999
    }
];


function getLevel(xp){

    for(let i = levels.length - 1; i >= 0; i--){

        if(xp >= levels[i].minXP){

            return levels[i].level;

        }

    }

    return 1;

}


function getLevelProgress(xp){

    const level =
        getLevel(xp);


    const current =
        levels.find(
            l=>l.level === level
        );


    const next =
        levels.find(
            l=>l.level === level + 1
        );


    if(!next){

        return {

            currentXP: xp - current.minXP,

            neededXP: current.maxXP - current.minXP,

            percentage:100

        };

    }


    const currentXP =
        xp - current.minXP;


    const neededXP =
        next.minXP - current.minXP;


    return {

        currentXP,

        neededXP,

        percentage:
            Math.floor(
                currentXP / neededXP * 100
            )

    };

}


module.exports = {
    getLevel,
    getLevelProgress
};