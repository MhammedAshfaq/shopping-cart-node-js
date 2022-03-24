var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');
const userHelper = require('../helpers/user-helper');

const veriftAdmin = (req, res, next) => {
    if (req.session.admin) {
        next()
    } else {
        res.redirect('/admin/admin-login')
    }
}

/* GET home page. */
router.get('/', function (req, res, next) {

    productHelper.getAllProducts().then(async (products) => {
        let users = await userHelper.getAllUsers();
        let allOrders = await userHelper.getAllOrders();
        let length = allOrders.length;
        console.log(length);
        if (req.session.admin) {
            res.render('admin/view-products', { products, admin: true, user: req.session.admin, count: users.length, allOrders: length })
        } else {
            res.redirect('/admin/admin-login')
        }
    })
});

//GET Signup
router.get('/admin-signup', (req, res) => {
    res.render('admin/admin-signup', { admin: true })
})

//GET Login
router.get('/admin-login', (req, res) => {
    if (req.session.loggedIn) {
        res.redirect('/admin')
    }
    res.render('admin/admin-login', { admin: true, loginErr: req.session.loginErr })
    req.session.loginErr = "";
})

// POST signup
router.post('/admin-signup', (req, res) => {
    let adminDetails = req.body
    userHelper.adminSignup(adminDetails).then((responce) => {
        req.session.loggedIn = true;
        req.session.admin = responce;
        res.redirect('/admin')
    })
})

//POST Login
router.post('/admin-login', (req, res) => {
    let adminDetails = req.body
    userHelper.adminLogin(adminDetails).then((responce) => {
        if (responce.status) {
            req.session.loggedIn = true
            req.session.admin = responce.admin
            res.redirect('/admin')
        } else {
            req.session.loginErr = responce.message
            res.redirect('/admin/admin-login')
        }

    })
})

//GET Logout
router.get('/admin-logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/admin-login')

})


//Method GET /Add-product
router.get('/add-product', (req, res) => {
    if (req.session.admin) {
        res.render('admin/add-product', { admin: true, user: req.session.admin })
    }
    else {
        res.redirect('/admin/admin-login')
    }
})

//Method POST /Add-product
router.post('/add-product', (req, res, next) => {
    productHelper.addProduct(req.body, (id) => {
        let image = req.files.Image;
        image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
            if (!err) {
                res.render('admin/add-product', { admin: true })
            } else {
                console.log('Somthing err ' + err);
            }
        })
    })
})

//GET delete 
router.get('/delete-product/', (req, res) => {
    if (req.session.admin) {
        let productId = req.query.id
        productHelper.deleteProduct(productId).then((responce) => {
            res.redirect('/admin')
        })
    } else {
        res.redirect('/admin/admin-login')
    }

})

//GET Edit product
router.get('/edit-product/:id', async (req, res) => {
    if (req.session.admin) {
        let productId = req.params.id;
        let product = await productHelper.getProductDetails(productId)

        res.render('admin/edit-product', { product, admin: true })
    } else {
        res.redirect('/admin/admin-login')

    }

})

//POST edit product
router.post('/edit-product/:id', (req, res) => {
    let productId = req.params.id
    let productDetails = req.body

    productHelper.updateProduct(productDetails, productId).then((responce) => {
        res.redirect('/admin')
        if (req.files.Image) {
            let image = req.files.Image;
            image.mv('./public/product-images/' + productId + '.jpg', (err, data) => {
                if (err) {
                    alert('Somthing Error' + err)
                }
            })
        }
    })
})

//GET all users
router.get('/all-users', veriftAdmin, async (req, res) => {
    let users = await userHelper.getAllUsers()
    res.render('admin/all-users', { admin: true, user: req.session.admin, users })
})

//GET delete-user
router.get('/delete-user/:id', (req, res) => {
    let userId = req.params.id;
    console.log(userId);
    userHelper.deleteUser(userId).then((responce) => {
        res.redirect('/admin')
    })
})

//GET all orders
router.get('/all-orders', veriftAdmin, async (req, res) => {
    let orders = await userHelper.getAllOrders();
    res.render('admin/all-orders', { admin: true, user: req.session.admin, orders })
})

//GET status changer
router.get('/order-statusChange/:id', (req, res) => {
    let orderId = req.params.id;
    userHelper.changeOrderStatus(orderId).then((responce) => {
        res.redirect('/admin/all-orders')
    })
})




module.exports = router;
