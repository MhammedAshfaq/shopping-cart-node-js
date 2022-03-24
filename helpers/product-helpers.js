var db = require('../config/DB-connection')
var collection = require('../config/collection')
var objectId = require('mongodb').ObjectID
const async = require('hbs/lib/async')

//this is callback methord function
module.exports = {
    addProduct: (productDetails, callback) => {
        productDetails.Price= parseInt(productDetails.Price)
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(productDetails).then((responce) => {
            callback(responce.insertedId)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(productId) }).then((responce) => {
                resolve(responce)
            })
        })
    },
    getProductDetails: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(productId) }).then((responce) => {
                resolve(responce)
            })
        })
    },
    updateProduct: (productDetails, productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION)
                .updateOne({ _id: objectId(productId) }, {
                    $set: {
                        Name: productDetails.Name,
                        Category: productDetails.Category,
                        Discription: productDetails.Discription,
                        Price: productDetails.Price
                    }
                }).then((responce) => {
                    resolve(responce)
                })
        })
    }
}