var request = require('request');
var aschJS = require('asch-js');

let bignum = require('bignumber')

async function getArticlesByScore(options) {
    let latestArticles = await app.model.Article.findAll({
        condition: {
            reports: {$lt: 3}
        },
        limit: 300,
        sort: {timestamp: -1}
    })
    let popularArticles = await app.model.Article.findAll({
        limit: 300,
        sort: {votes: -1}
    })
    let allArticles = []
    let uniqueIds = new Set
    latestArticles.forEach((a) => {
        if (!uniqueIds.has(a.id)) {
            uniqueIds.add(a.id)
            allArticles.push(a)
        }
    })
    popularArticles.forEach((a) => {
        if (!uniqueIds.has(a.id)) {
            uniqueIds.add(a.id)
            popularArticles.push(a)
        }
    })
    allArticles.forEach((a) => {
        a.score = calcScore(a)
    })
    allArticles.sort((l, r) => {
        return r.score - l.score
    })
    return {articles: allArticles.slice(0, options.limit || 50)}
}


app.route.get('/articles', async (req) => {
    let query = req.query
    if (!query.sortBy) {
        query.sortBy = 'score'
    }
    let key = ['articles', query.sortBy, query.limit, query.offset].join('_')
    if (app.custom.cache.has(key)) {
        return app.custom.cache.get(key)
    }
    let res = null
    if (query.sortBy === 'timestamp') {
        res = await getArticlesByTime(query)
    } else if (query.sortBy === 'score') {
        res = await getArticlesByScore(query)
    } else {
        throw new Error('Sort field not supported')
    }
    let addresses = res.articles.map((a) => a.authorId)
    let accounts = await app.model.Account.findAll({
        condition: {
            address: {$in: addresses}
        },
        fields: ['str1', 'address']
    })
    let accountMap = new Map
    for (let account of accounts) {
        accountMap.set(account.address, account)
    }
    for (let article of res.articles) {
        let account = accountMap.get(article.authorId)
        if (account) {
            article.nickname = account.str1
        }
    }
    app.custom.cache.set(key, res)
    return res
})


app.route.get('/orders/:address/:number', async (req) => {
    let address = req.params.address
    let number = req.params.number
    let status = 1

    app.sdb.create('order', {
        id: app.autoID.increment('article_max_id'),
        address: address,
        number: number,
        status: status
    });

    app.balances.decrease(address, 'ZMC', 1 * 100000000);
    return "success";
});

app.route.get('/change/:address', async (req) => {
    let address = req.params.address
    res = await app.model.Order.findAll({address: address});
    var c = 0
    for (var i = 0; i < res.length; i++) {
        var json = res[i];
        if (json.address === address && json.status === 1 && json.number === "3") {
            await app.balances.increase(address, 'ZMC', '300000000');
            c = c + 1;
        }
    }

    await app.sdb.update('Order', {status: 2}, {status: 1, address: address, number: 3});
    await app.sdb.update('Order', {status: 3}, {status: 1, address: address});
    //var res = app.balances.get(address, 'XAS');
    if (c != 0) {
        return "恭喜中奖！" + c * 3
    }
    else {
        return "未中奖。再接再厉！"
    }
});

app.route.get('/incr/:address', async (req) => {
    let address = req.params.address
    app.sdb.update('Order', {number: '300000000'}, {status: 1, address: address});
    return "success";
});

app.route.get('/getAll/:address', async (req) => {
    let address = req.params.address
    var r = []

    res = await app.model.Order.findAll({address: address});
    for (var i = 0; i < res.length; i++) {
        var json = res[i];
        if (json.address === address)
            r.push(json)
    }
    return r;
});


app.route.get('/getgames/', async (req) => {
    let status = 1
    var r=[]
    res = await app.model.Game.findAll({status:status});
    for (var i = 0; i < res.length; i++) {
        var json = res[i];
        if(json.status===status){
            r.push(json)
        }
    }
    return r;
});

app.route.get('/getgame/:id', async (req) => {
    let id = req.params.id
    var r=[]
    res = await app.model.Game.findAll({id:id});
    for (var i = 0; i < res.length; i++) {
        var json = res[i];
        if(json.id===id)
            r.push(json)
    }
    return r[0];
});

app.route.get('/newgame/:address/:leftp/:midp/:rightp/:startc', async (req) => {
    let address = req.params.address
    let leftp = req.params.leftp
    let minp = req.params.midp
    let rightp = req.params.rightp
    let startc = req.params.startc
    let status=1
app.logger.info("liu"+minp)
    app.sdb.create('game', {
        id: app.autoID.increment('article_max_id'),
        address: address,
        leftp:leftp,
        midp:minp,
        rightp:rightp,
        startc:startc,
        totalc:startc,
        status: status
    });
    app.balances.decrease(address, 'ZMC', startc*100000000);
    return "success";
});




app.route.get('/newplay/:address/:gameid/:choice', async (req) => {
    let address = req.params.address
    let gameid = req.params.gameid
    let choice = req.params.choice

    app.sdb.create('play', {
        id: app.autoID.increment('article_max_id'),
        address: address,
        gameid:gameid,
        choice:choice,
    });
    app.balances.decrease(address, 'ZMC', 1*100000000);

    var r=[]
    var tt=1;
    app.logger.info("liu"+gameid)
    res = await app.model.Game.findAll({id:gameid});
    for (var i = 0; i < res.length; i++) {
        var json = res[i];
        if(json.id===gameid){
            app.logger.info("liu"+JSON.stringify(json))
            tt=json.totalc+1;
            break;
        }
    }

    app.logger.info("liu"+tt)
    await app.sdb.update('Game', {totalc: tt}, {id: gameid});

    return "success";
});




app.route.get('/open/', async (req) => {
    resi = await app.model.Game.findAll({id: 1});
    for (var i = 0; i < resi.length; i++) {
        var jsoni = resi[i];
        if(jsoni.status!=1)continue;
        var totalc=jsoni.totalc;
        app.logger.info("liu"+totalc);
        resj = await app.model.Play.findAll({gameid: jsoni.id});
        for(var j=0; j<resj.length;j++){
            var jsonj = resj[j];
            if (jsonj.choice === 3 && jsoni.status === 1) {
                await app.balances.increase(jsonj.address, 'ZMC', jsoni.leftp*100000000);
                totalc=totalc-jsoni.rightp;
            }
        }
        app.logger.info("liu"+totalc);
        await app.balances.increase(jsoni.address, 'ZMC', totalc*100000000);
        await app.sdb.update('Game', {status: 2}, {id: jsoni.id});
    }
        return "已经派奖！"

});



// app.route.get('/withdraw/:address', async (req) => {
//     let address = req.params.address;
// var fee = String(0.1 * 100000000);
// var type = 2;
// var options = {fee: fee, type: type, args: '["XAS", "100000000"]'};
// var secret = "topple crouch public rebel heart poet silent umbrella alert tower flower volcano";
// var transaction = aschJS.dapp.createInnerTransaction(options, secret);
// var body = '{"transaction":' + JSON.stringify(transaction) + '}';
//
// request({
//     url: 'http://localhost:4096/api/dapps/9ec5d6c4d9850744b2b5fc6c2edc7447ed741868c0abcbc4f967cc187150bf08/transactions/signed',
//     method: "PUT",
//     json: true,
//     headers: {
//         "content-type": "application/json",
//         "version": "",
//         "magic": "594fe0f3",
//     },
//     body: JSON.parse(body)
// }, function (error, response, body) {
//         app.balances.decrease(address, 'ZMC', 1*100000000);
//         app.logger.info("liu"+JSON.stringify(body))
//     return body;
// });
app.route.get('/withdraw/:address', async (req) => {
    // let secret = req.params.secret;
    var secret = "topple crouch public rebel heart poet silent umbrella alert tower flower volcano";
    let address = req.params.address;
    var fee = String(0.1 * 100000000);
    var type = 3;
    var options = {fee: fee, type: type, args: '["XAS", "100000000", "' + address + '"]'};
    var transaction = aschJS.dapp.createInnerTransaction(options, secret);
    var body = '{"transaction":' + JSON.stringify(transaction) + '}';
    console.log(body);

    request({
        url: 'http://localhost:4096/api/dapps/9ec5d6c4d9850744b2b5fc6c2edc7447ed741868c0abcbc4f967cc187150bf08/transactions/signed',
        method: "PUT",
        json: true,
        headers: {
            "content-type": "application/json",
            "version": "",
            "magic": "594fe0f3",
        },
        body: JSON.parse(body)
    }, function (error, response, body) {
        app.balances.decrease(address, 'ZMC', '100000000');
        return body;
    });
    /**
     * 提现接口
     **/
});


app.route.get('/charge/:secret/:address', async (req) => {
    let secret = req.params.secret;
    let address = req.params.address;
    var fee = String(0.1 * 100000000);
    var type = 3;
    var options = {fee: fee, type: type, args: '["XAS", "100000000", "A4iffGG6mWNJQVg5qZ8VXsup5irFDcVsRX"]'};
    var transaction = aschJS.dapp.createInnerTransaction(options, secret);
    var body = '{"transaction":' + JSON.stringify(transaction) + '}';
    console.log(body);


    request({
        url: 'http://localhost:4096/api/dapps/9ec5d6c4d9850744b2b5fc6c2edc7447ed741868c0abcbc4f967cc187150bf08/transactions/signed',
        method: "PUT",
        json: true,
        headers: {
            "content-type": "application/json",
            "version": "",
            "magic": "594fe0f3",
        },
        body: JSON.parse(body)
    }, function (error, response, body) {
        app.balances.increase(address, 'ZMC', '100000000');
        return body;
    });

    /**
     * 内部转账接口,可以转账任意支持的币种，可用于充值
     **/

});


app.route.get('/articles/:id/comments', async (req) => {
    let id = req.params.id
    let sort = {
        timestamp: 1
    }
    if (req.query && req.query.sortBy) {
        let sortInfo = req.query.sortBy.split(':')
        if (sortInfo.length !== 2 ||
            ['timestamp'].indexOf(sortInfo[0]) === -1 ||
            ['asc', 'desc'].indexOf(sortInfo[1]) === -1) {
            throw new Error('Invalid sort params')
        }
        sort = {}
        sort[sortInfo[0]] = sortInfo[1] === 'asc' ? 1 : -1
    }
    let key = ['comments', id, req.query.sortBy, req.query.limit, req.query.offset].join('_')
    if (app.custom.cache.has(key)) {
        return app.custom.cache.get(key)
    }
    let count = await app.model.Comment.count({aid: id, reports: {$lt: 3}})
    let comments = await app.model.Comment.findAll({
        condition: [
            {aid: id},
            {reports: {$lt: 3}},
        ],
        limit: req.query.limit || 50,
        offset: req.query.offset || 0,
        sort: sort
    })
    let replyIds = []
    for (let c of comments) {
        if (c.pid) replyIds.push(c.pid)
    }
    let replyComments = await app.model.Comment.findAll({
        condition: {
            id: {$in: replyIds}
        },
        fields: ['authorId', 'id']
    })
    let replyAuthorMap = new Map
    for (let rc of replyComments) {
        replyAuthorMap.set(rc.id, rc.authorId)
    }
    let addresses = comments.map((c) => c.authorId).concat(replyComments.map((rc) => rc.authorId))
    let accounts = await app.model.Account.findAll({
        condition: {
            address: {$in: addresses}
        },
        fields: ['str1', 'address']
    })
    let accountMap = new Map
    for (let account of accounts) {
        accountMap.set(account.address, account)
    }
    for (let c of comments) {
        let account = accountMap.get(c.authorId)
        if (account) {
            c.nickname = account.str1
        }
        let replyAuthorId = replyAuthorMap.get(c.pid)
        if (replyAuthorId) {
            c.replyAuthorId = replyAuthorId
            let replyAccount = accountMap.get(replyAuthorId)
            if (replyAccount) c.replyAuthorName = replyAccount.str1
        }
    }
    let result = {comments: comments, count: count}
    app.custom.cache.set(key, result)
    return result
})