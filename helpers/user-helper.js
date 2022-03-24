var db = require('../config/DB-connection')
var collection = require('../config/collection')
var bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectId
var Razorpay = require('razorpay')
const async = require('hbs/lib/async')


var instance = new Razorpay({
    key_id: 'rzp_test_VvFUWUrdjWkVuX',
    key_secret: '5EObFntytcqYCFYxQl1A0C50',
})

module.exports = {
    goSignup: (userDetails) => {
        return new Promise(async (resolve, reject) => {
            userDetails.Password = await bcrypt.hash(userDetails.Password, 10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userDetails).then((responce) => {
                db.get().collection(collection.USER_COLLECTION).findOne({ _id: responce.insertedId }).then((data) => {
                    resolve(data)
                })
            })
        })
    },
    doLogin: (userDetails) => {
        let responce = {
        }
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userDetails.Email });
            if (user) {
                bcrypt.compare(userDetails.Password, user.Password).then((status) => {
                    if (status) {
                        responce.user = user;
                        responce.status = true
                        resolve(responce)
                        console.log('User Logged');
                    } else {
                        resolve({ status: false, message: "Sorry, that password isn't right check your password " })

                    }
                })
            } else {
                resolve({ status: false, message: "Sorry, we could't find an account with that email" })
            }
        })
    },

    //Admin Side LOgin System
    adminSignup: (adminDeteils) => {
        return new Promise(async (resolve, reject) => {
            adminDeteils.Password = await bcrypt.hash(adminDeteils.Password, 10);
            adminDeteils.Id = await bcrypt.hash(adminDeteils.Id, 10);
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminDeteils).then((responce) => {
                db.get().collection(collection.ADMIN_COLLECTION).findOne({ _id: responce.insertedId }).then((data) => {
                    resolve(data)
                })
            })
        })
    },
    adminLogin: (adminDeteils) => {
        return new Promise(async (resolve, reject) => {
            let responce = {

            }
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Username: adminDeteils.Username });
            if (admin) {
                bcrypt.compare(adminDeteils.Id, admin.Id).then((result) => {
                    if (result) {
                        bcrypt.compare(adminDeteils.Password, admin.Password).then((status) => {
                            if (status) {
                                responce.status = true
                                responce.admin = admin
                                resolve(responce)
                                console.log("Admin Logged");
                            } else {
                                resolve({ status: false, message: "Sorry, that password isn't right check your password " })
                                console.log('Invalid password');
                            }
                        })
                    } else {
                        resolve({ status: false, message: "Sorry, we could't find an account with that id   " })
                    }
                })
            } else {
                resolve({ status: false, message: "Sorry, we could't find an account with that usename" })
                console.log("Admin Not Fount");
            }
        })
    },

    addToCart: (userId, ProductId) => {

        let prodObj = {
            item: objectId(ProductId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTIONS).findOne({ user: objectId(userId) })
            if (userCart) {
                //second time cart creating
                let productExist = userCart.products.findIndex((product) => product.item == ProductId)
                if (productExist != -1) {
                    db.get().collection(collection.CART_COLLECTIONS).updateOne({ user: objectId(userId), "products.item": objectId(ProductId) }, //this case userId use cheyyunath aa user nte cart aanu count cheyyendath enaghinanu
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTIONS).update({ user: objectId(userId) },
                        {
                            $push: { products: prodObj }
                        }).then(() => {
                            resolve()
                        })
                }
            } else {
                //Forst time cart create
                let cartObj = {
                    user: objectId(userId),
                    products: [prodObj]
                }
                db.get().collection(collection.CART_COLLECTIONS).insertOne(cartObj).then((responce) => {
                    resolve()
                })
            }
        })
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTIONS).aggregate([
                { $match: { user: objectId(userId) } },  // mongodb Matching
                {
                    $unwind: "$products"
                },
                {
                    $project: {
                        item: "$products.item",
                        quantity: "$products.quantity"
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }
                }

                //first 

                // {
                //     $lookup:
                //     {
                //         from: collection.PRODUCT_COLLECTION,
                //         let: { prodList: '$products' },
                //         pipeline: [
                //             {
                //                 $match: {
                //                     $expr: {
                //                         $in: ['$_id', "$$prodList"]
                //                     }

                //                 }
                //             }
                //         ],
                //         as: 'cartItems'
                //     }
                // }
            ]).toArray()

            // console.log(cartItems);
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartCount = 0
            let cart = await db.get().collection(collection.CART_COLLECTIONS).findOne({ user: objectId(userId) })  //checking  in the user cart

            if (cart) {
                cartCount = cart.products.length;
            }
            resolve(cartCount)
        })
    },
    changeProductQuantity: ({ cart, product, count, quantity }) => {
        count = parseInt(count)
        quantity = parseInt(quantity)
        return new Promise((resolve, reject) => {
            if (count == -1 && quantity == 1) {
                db.get().collection(collection.CART_COLLECTIONS).updateOne({ _id: objectId(cart) },
                    {
                        $pull: { products: { item: objectId(product) } }
                    }
                ).then((responce) => {
                    // console.log(responce);
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTIONS).updateOne({ _id: objectId(cart), "products.item": objectId(product) },
                    {
                        $inc: { 'products.$.quantity': count }   // array elememt incremat must have connecting $ symbol
                    }).then((responce) => {
                        // console.log(responce);
                        resolve({ status: true })
                    }).catch((err) => {
                        console.log(err);
                    })
            }
        })
        //this is my first udatin prosses

        // return new Promise((resolve, reject) => {
        //     db.get().collection(collection.CART_COLLECTIONS)
        //         .updateOne({ _id: objectId(cart), "products.item": objectId(product) },
        //             {
        //                 $inc: { 'products.$.quantity': count }
        //             }).then((responce) => {
        //                 // console.log(responce);
        //                 resolve(responce)
        //             })
        // })
    },
    removeCartItem: ({ cartId, itemId }) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTIONS).updateOne({ _id: objectId(cartId) },
                {
                    $pull: { products: { item: objectId(itemId) } }
                }
            ).then((responce) => {
                // console.log(responce);
                resolve({ removeProduct: true })
            })
        })

        //Thats wrong method

        // // console.log(cartId);
        // return new Promise((resolve, reject) => {
        //     db.get().collection(collection.CART_COLLECTIONS).findOne({ _id: objectId(cartId) }).then((responce) => {
        //         db.get().collection(collection.CART_COLLECTIONS)
        //             .updateOne({ _id: objectId(cartId) },
        //                 {
        //                     $pull: { "products.item": objectId(itemId) }
        //                 }).then((responce) => {
        //                     // console.log(responce);
        //                 }).catch((err) => {
        //                     console.log(err);
        //                 })

        //     })
        // })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTIONS).aggregate([
                { $match: { user: objectId(userId) } },
                {
                    $unwind: "$products"
                },
                {
                    $project: {
                        item: "$products.item",
                        quantity: "$products.quantity"
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.Price'] } }
                    }
                }
            ]).toArray()
            // console.log(total[0].total);
            resolve(total[0].total)
        })
    },
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            let date = new Date()
            let currendDate = date.toLocaleDateString(undefined, options);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode,
                    emailId: order.emailId,
                },
                date: currendDate,
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status
            }
            db.get().collection(collection.ORDER_COLLECTIONS).insertOne(orderObj).then((responce) => {
                db.get().collection(collection.CART_COLLECTIONS).deleteOne({ user: objectId(order.userId) })
                resolve(responce.insertedId)
                // console.log(responce.insertedId);
            })

        })
    },
    getProductsList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = db.get().collection(collection.CART_COLLECTIONS).findOne({ user: objectId(userId) })
            resolve(cart)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTIONS).find({ userId: objectId(userId) }).toArray()
            // console.log(orders);
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderProducts = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                { $match: { _id: objectId(orderId) } },
                {
                    $unwind: "$products"
                },
                {
                    $project: {
                        item: "$products.item",
                        quantity: "$products.quantity"
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        quantity: 1,
                        item: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },

            ]).toArray()
            // console.log(orderProducts);
            resolve(orderProducts)
        })
    },
    // must be looking razorpay document
    genarateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {  // in the  document
                amount: total * 100,
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, (err, order) => {
                if (err) {
                    console.log(err);
                } else {
                    // console.log('New Order :', order);
                    resolve(order)
                }
            })
        })
    },
    //payment result function  
    verifyPayment: (paymentDetails) => {  // ivide yanu payment exact nadakkunnath
        return new Promise((resolve, reject) => {
            var crypto = require("crypto");
            var hmac = crypto.createHmac('sha256', '5EObFntytcqYCFYxQl1A0C50');
            hmac.update(paymentDetails['payment[razorpay_order_id]'] + '|' + paymentDetails['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')  // thats converting  string
            if (hmac == paymentDetails['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    //order page status changer
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTIONS)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }
                ).then((responce) => {
                    resolve()
                })
        })
    },
    orderCancel: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTIONS).deleteOne({ _id: objectId(orderId) }).then((responce) => {
                resolve()
            })
        })
    },

    //get all users in admin panel
    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            // console.log(users)
            resolve(users)
        })
    },

    //delete user
    deleteUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTIONS).deleteOne({ userId: objectId(userId) }).then(() => {
                db.get().collection(collection.USER_COLLECTION).deleteOne({ _id: objectId(userId) }).then(() => {
                    resolve()
                })
            })
        })
    },
    //All orders getting
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let allOrders = await db.get().collection(collection.ORDER_COLLECTIONS).find().toArray();
            resolve(allOrders)
        })
    },
    changeOrderStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTIONS).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'shipped'
                    }
                }
            ).then((responce) => {
                resolve()
            })
        })
    }

}

