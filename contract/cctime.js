let bignum = require('bignumber')

const VOTE_UNIT = 100000
const VOTE_CURRENCY = 'XAS'
const COMMENT_REWARD_UNIT = 100000
const COMMENT_REWARD_CURRENCY = 'XAS'

module.exports = {
  postArticle: async (url, text, tags) => {
    if (!url && !text) {
      return 'Should provide url or text'
    }
    if (url && text) {
      return 'Both url and text are not supported'
    }
    if (!tags) {
      return 'Should provide tags'
    }
    if (url && url.length > 256) {
      return 'Url too long'
    }
    if (text && text.length > 4096) {
      return 'Text too long'
    }
    //TODO validate url format

    app.sdb.lock('postArticle@' + url)
    let exists = await app.model.Article.exists({ url: url })
    if (exists) {
      return 'Url already exists'
    }

    app.sdb.create('Article', {
      url: url || '',
      text: text || '',
      tags: tags,
      id: app.autoID.increment('article_max_id'),
      votes: 0,
      tid: this.trs.id,
      authorId: this.trs.senderId,
      timestamp: this.trs.timestamp
    })
  },

  postComment: async (aid, pid, content) => {
    if (!aid) {
      return 'Invalid article id'
    }
    if (!content) {
      return 'Invalid content'
    }
    if (pid) {
      let exists = app.model.Comment.exists({ id: pid })
      if (!exists) {
        return 'Reply comment not exists'
      }
    }
    app.sdb.create('Comment', {
      id: app.autoID.increment('comment_max_id'),
      aid: aid,
      pid: pid,
      content: content,
      rewards: 0,
      tid: this.trs.id,
      authorId: this.trs.senderId
    })
  },

  voteArticle: async (aid, amount) => {
    if (!aid || !amount) return 'Invalid params'
    app.validate('amount', amount)

    let balance = app.balances.get(this.trs.senderId, VOTE_CURRENCY)
    if (balance.lt(amount)) return 'Insufficient balance'

    let article = await app.model.Article.findOne({
      condition: { id: aid }
    })
    if (!article) return 'Article not found'

    let bAmount = bignum(amount)
    if (bAmount.lt(VOTE_UNIT)) return 'Amount too small'
    let authorReward = bAmount.mul(0.5).floor().toString()
    let extraFee = bAmount.sub(authorReward).toString()

    app.balances.decrease(this.trs.senderId, VOTE_CURRENCY, amount)
    app.balances.increase(article.authorId, VOTE_CURRENCY, authorReward)
    app.feePool.add(VOTE_CURRENCY, extraFee)

    let increment = Number(bAmount.div(VOTE_UNIT).floor().toSting())
    app.sdb.increment('Article', { votes: increment }, { id: aid })
  },

  likeComment: async (cid, amount) => {
    if (!cid || !amount) return 'Invalid params'
    app.valudate('amount', amount)

    let balance = app.balances.get(this.trs.senderId, COMMENT_REWARD_CURRENCY)
    if (balance.lt(amount)) return 'Insufficient balance'

    let bAmount = bignum(amount)
    if (bAmount.lt(COMMENT_REWARD_UNIT)) return 'Amount too small'

    let comment = await app.model.Comment.findOne({
      condition: { id: cid }
    })
    if (!comment) return 'Comment not found'

    app.balances.transfer(this.trs.senderId, comment.authorId, COMMENT_REWARD_CURRENCY, amount)

    let increment = Number(bAmount.div(COMMENT_REWARD_UNIT).floor().toString())
    app.sdb.update('Comment', { rewards: increment }, { id: cid })
  },
}