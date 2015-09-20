var express = require('express');
var router = express.Router();

/*jslint sloppy: true*/
/*jslint nomen: true*/

function checkAdmin(req, res, next) {

    if (req.session.isAdmin != true) {
        req.flash('info', 'Please log in');
        res.redirect('/users/login');
    } else {
        next();
    }
}

router.get('/', checkAdmin, function (req, res, next) {

    var db = req.db,
        userCol = db.get('users'),
        adCol = db.get('ads');

    userCol.findById(req.session.user_id, function (err, doc) {
        if (err) { return next(err); }

        adCol.count({}, function (err, allCount) {
            if (err) { return next(err); }
            req.session.allCount = allCount;

            adCol.count({ status: 'inactive' }, function (err, inactiveCount) {
                if (err) { return next(err); }
                req.session.inactiveCount = inactiveCount;

                adCol.count({ status: 'rejected' }, function (err, rejectedCount) {
                    if (err) { return next(err); }
                    req.session.rejectedCount = rejectedCount;

                    adCol.count({ improvement: 'main' }, function (err, improvedCount) {
                        if (err) { return next(err); }
                        req.session.improvedCount = improvedCount;

                        res.render('admin/admin_info', {
                            info: doc
                        });
                    });
                });
            });
        });
    });
});


router.get('/ads', checkAdmin, function (req, res, next) {

    var db = req.db,
        adCol = db.get('ads'),
        perPage = 10,
        queryCriteria = eval('({' + req.query.db + '})'),
        page = req.query.page || 0,
        link = '/admin/ads?db=' + req.query.db + '&page=';

    adCol.find(queryCriteria, {
        skip: perPage * page,
        limit: perPage
    }, function (err, ads) {
        if (err) { return next(err); }
        adCol.count(queryCriteria, function (err, count) {
            if (err) { return next(err); }
            var pages = req.pagination(perPage, count, link);

            res.render('admin/ads_admin', {
                pages: pages,
                pageIndex: page,
                ads: ads,
                message : req.flash('info'),
                first: pages.slice(0, 1),
                firstPart: pages.slice(0, 6),
                middle: pages.slice(parseInt(page, 10) - 1, parseInt(page, 10)  + 3),
                lastPart: pages.slice(-6),
                last: pages.slice(-1)
            });
        });
    });
});

router.get('/activate', checkAdmin, function (req, res) {

    req.db.get('ads').findAndModify({ _id: req.query.id },
        { $set:  { status: 'active' }, $unset: { reason: '' }});
    res.redirect('/admin/ads?db=status: "inactive"');
});


router.post('/reject', checkAdmin, function (req, res) {
    console.log(req.body.id);
    console.log(req.body.reason);

    req.db.get('ads').findAndModify({ _id: req.body.id },
        { $set:  { status: 'rejected', reason: req.body.reason }});
    res.redirect('/admin/ads?db=status: "rejected"');
});

router.get('/main', checkAdmin, function (req, res, next) {

    var action = req.query.action === 'on'
        ? { $set:  { improvement: 'main'  }}
        : { $unset:  { improvement: 'main'  }},
        adCol = req.db.get('ads');

    adCol.findById(req.query.id, function (err, doc) {
        if (err) { return next(err); }

        if (doc.status == 'inactive') {
            req.flash('info', 'At first you must activate the ad');
            res.redirect('/admin/ads?db=improvement%3A%27main%27');
            return;
        }

        adCol.findAndModify({ _id: doc._id }, action);
        res.redirect('/admin/ads?db=improvement%3A%27main%27');
    });
});

module.exports = router;