import express from 'express';
import userController from '../Controllers/UserController.js';
import companyController from '../Controllers/CompanyController.js';
import categoryController from '../Controllers/CategoryController.js';
import jobDataController from '../Controllers/JobDataController.js';
import siteController from '../Controllers/SiteController.js';
import scrapeController from '../Controllers/ScrapeController.js';
import viewController from "../Controllers/ViewController.js";
import cityController from '../Controllers/CityController.js';

import validator from '../Validators/Main.js'
import visitorLogger from "../Middlewares/Visitors.js";
const router = express.Router();

//Load Views
router.get('/', viewController.home);
router.get('/auth', viewController.auth);
router.get('/sales', viewController.sales);
// router.get('/sales', visitorLogger, viewController.sales);
router.get('/about-us', visitorLogger, viewController.aboutUs);
router.get('/contact', visitorLogger, viewController.contactUs);
router.get('/add-job', visitorLogger, viewController.addJob);
router.get('/faq', visitorLogger, viewController.faq);
router.get('/statistics', viewController.statistics)
//Enums
router.get('/education', viewController.education);
router.get('/experience', viewController.experience);

//Change language
router.post('/set-lang', (req, res) => {
    const { language } = req.body;
    if (i18n.getLocales().includes(language)) {
        res.cookie('lang', language);  // Set language in cookie
        res.send({ message: 'Language updated successfully' });
    } else {
        res.status(400).send({ error: 'Invalid language' });
    }
});

//Admin Panel 

router.get('/admin', viewController.adminIndex);
router.get('/admin/categories', viewController.adminCategoryView);

//Send Mail
router.post('/send-mail', viewController.sendMail);         // CREATE


router.use((req, res) => {
    res.render('Partials/Error.ejs');
    // res.status(404).render('error', { message: 'Page Not Found' });
});

router.use((err, req, res, next) => {
    res.render('Partials/Error.ejs');
});

export default router;
