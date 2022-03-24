const MongoClient = require('mongodb').MongoClient

const state = {
    db:null
}

module.exports.connection = (done) => {
    const url = 'mongodb://localhost:27017'
    const dbName = 'shopping2'

    MongoClient.connect(url, (err, client) => {
        if (err) return done(err)
        state.db = client.db(dbName)
        done()
    })
}

module.exports.get=()=>{
    return state.db
}