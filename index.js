/* eslint-env node */
'use strict';
var path = require('path');

var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var fbTransform = require('fastboot-transform');


module.exports = {
  name: 'ember-cli-daterangepicker',

  included() {
    this._super.included.apply(this, arguments);

    this.import('vendor/daterangepicker/daterangepicker.js');
    this.import('vendor/daterangepicker/daterangepicker.css');
  },

  treeForVendor(vendorTree) {
    var trees = [];
    var daterangepickerPath = path.dirname(require.resolve('daterangepicker'));

    if (vendorTree) {
      trees.push(vendorTree);
    }

    //need to wrap with check if it's inside fastboot environment
    trees.push(fbTransform(new Funnel(daterangepickerPath, {
      destDir: 'daterangepicker',
      include: [new RegExp(/\.js$/)],
      exclude: [
        'moment',
        'moment.min',
        'package',
        'website'
      ].map(function(key) {
        return new RegExp(key + '\\.js$');
      })
    })));
    trees.push(new Funnel(daterangepickerPath, {
      destDir: 'daterangepicker',
      include: [new RegExp(/\.css$/)]
    }));

    return mergeTrees(trees);
  }
};
