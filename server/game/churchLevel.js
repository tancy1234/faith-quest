function getChurchLevel(amount){
    if(amount>=10000) return 10;
    if(amount>=7500) return 9;
    if(amount>=5000) return 8;
    if(amount>=3500) return 7;
    if(amount>=2000) return 6;
    if(amount>=1000) return 5;
    if(amount>=600) return 4;
    if(amount>=300) return 3;
    if(amount>=100) return 2;
    return 1;
}

module.exports={getChurchLevel};

module.exports={
    getChurchLevel
};