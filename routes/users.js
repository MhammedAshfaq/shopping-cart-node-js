var express = require('express');
const async = require('hbs/lib/async');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var userHelper = require('../helpers/user-helper')

//loging status middleware
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login')
  }
}

/* GET users listing. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartProductCount = null;

  if (req.session.user) {
    cartProductCount = await userHelper.getCartCount(req.session.user._id)
  }

  productHelper.getAllProducts().then((products) => {
    res.render('user/view-products', { products, user, cartProductCount });
  })
});

//GET Login
router.get('/login', (req, res) => {

  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    console.log(req.session.loginErr);
    res.render('user/login', { loginErr: req.session.loginErr })
    req.session.loginErr = ""
  }
})

//GET signup
router.get('/signup', (req, res) => {
  res.render('user/signup')
})

//POST Signup
router.post('/signup', (req, res) => {
  userHelper.goSignup(req.body).then((responce) => {
    req.session.loggedIn = true;
    req.session.user = responce
    res.redirect('/')
  })
})

///POST login
router.post('/login', (req, res, next) => {
  userHelper.doLogin(req.body).then((responce) => {
    if (responce.status) {
      req.session.loggedIn = true;
      req.session.user = responce.user
      res.redirect('/')
    } else {
      req.session.loginErr = responce.message
      // 'Invalid email or password !'
      res.redirect('/login')
    }
  })
})

//GET logout
router.get('/logout', (req, res) => {
  req.session.destroy();  //destroy is clearing session and cockkies connection
  res.redirect('/login')
})


//GET add to cart
router.get('/add-to-cart/:id', (req, res) => {
  let userId = req.session.user._id
  let productId = req.params.id
  userHelper.addToCart(userId, productId).then((responce) => {
    res.json({ status: true })
  })
})


//GET cart page 
router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelper.getCartProducts(req.session.user._id);
  let total = 0;
  if (products.length > 0) {
    total = await userHelper.getTotalAmount(req.session.user._id)
  }

  res.render('user/cart', { user: req.session.user, products, total })
})

//POST change-product-quantity
router.post('/change-product-quantity', (req, res, next) => {
  // console.log(req.body);
  userHelper.changeProductQuantity(req.body).then(async (responce) => {
    responce.total = await userHelper.getTotalAmount(req.body.user)
    res.json(responce)
  })

})


//POST remove-cart-item
router.post('/remove-cart-item', (req, res) => {
  userHelper.removeCartItem(req.body).then((responce) => {
    res.json(responce)
  })
})

//GET place order
router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/place-order', { user: req.session.user, total })
})

//POST place order
router.post('/place-order', async (req, res) => {
  let products = await userHelper.getProductsList(req.body.userId)
  let total = await userHelper.getTotalAmount(req.body.userId)

  userHelper.placeOrder(req.body, products.products, total).then((orderId) => {
    if (req.body['payment-method'] == 'COD') {
      res.json({ codSuccess: true })
    } else {
      userHelper.genarateRazorpay(orderId, total).then((responce) => {
        res.json(responce)
      })
    }
  })
})

//GET order success
router.get('/order-result', (req, res) => {
  res.render('user/order-status', { user: req.session.user })
})


//GET order
router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelper.getUserOrders(req.session.user._id)
  // console.log(orders);
  res.render('user/view-orders-details', { user: req.session.user, orders })
})

//GET view order products
router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  let orderId = req.params.id
  let products = await userHelper.getOrderProducts(orderId)
  // console.log(products);
  res.render('user/view-order-products', { user: req.session.user, products })
})

//POST verifiy payment
router.post('/verify-payment', (req, res) => {
  // console.log(req.body);
  userHelper.verifyPayment(req.body).then(() => {
    userHelper.changePaymentStatus(req.body['order[receipt]']).then((responce) => {
      console.log('Payment Successed');
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err);
    res.json({ status: false, errMsg: 'Payment Failed' })
  })
})

//GET /cancel-order

router.get('/cancel-order/:id', (req, res) => {
  let orderId = req.params.id;
  userHelper.orderCancel(orderId).then((responce) => {
    res.redirect('/orders')
  })
})


module.exports = router;
