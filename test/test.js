var chai = require('chai');
var expect = chai.expect;
var fs = require('fs');
var utils = require('../utils.js');
var esprima = require('esprima');
var _ = require('underscore');

function getGroupedByType(collection, type) {
  var grouped = _.groupBy(collection, function (item) {
    return item.name.type;
  });
  return grouped[type] ? grouped[type].length : 0;
}

describe('utils', function () {

  before(function () {
    this.content = fs.readFileSync('test/data.js');
    this.parsedTree = utils.parseDescribes(esprima.parse(this.content).body);
  });

  describe('#parseDescribes', function () {

    before(function () {
      this.describes = this.parsedTree[0].describes;
    });

    it('Top-level `describe` is only one (`describe` without issues is skipped)', function () {
      expect(this.parsedTree.length).to.be.equal(1);
      expect(this.parsedTree[0].name).to.be.equal('Scope');
    });

    it('Sub-`describe` without issues is skipped', function () {
      expect(this.describes.length).to.be.equal(2);
      expect(this.describes[0].name).to.be.equal('Subscope 1');
      expect(this.describes[1].name).to.be.equal('Subscope 2');
    });

    it('First sub-`describe` has 6 issues', function () {
      expect(this.describes[0].its.length).to.be.equal(6);
    });

    it('First sub-`describe` has 4 errors', function () {
      expect(getGroupedByType(this.describes[0].its, 'error')).to.be.equal(4);
    });

    it('First sub-`describe` has 2 warnings', function () {
      expect(getGroupedByType(this.describes[0].its, 'warning')).to.be.equal(2);
    });

    it('Second sub-`describe` has 1 issue', function () {
      expect(this.describes[1].its.length).to.be.equal(1);
    });

    it('First sub-`describe` has 0 errors', function () {
      expect(getGroupedByType(this.describes[1].its, 'error')).to.be.equal(0);
    });

    it('First sub-`describe` has 1 waring', function () {
      expect(getGroupedByType(this.parsedTree[0].describes[1].its, 'warning')).to.be.equal(1);
    });

  });

  describe('#getTreeSummary', function () {

    before(function () {
      this.summary = utils.getTreeSummary(this.parsedTree, {});
    });

    it('contains only errors and warnings', function () {
      expect(Object.keys(this.summary).sort()).to.be.eql(['error', 'warning']);
    });

    it('contains 4 errors', function () {
      expect(this.summary.error).to.be.equal(4);
    });

    it('contains 3 warnings', function () {
      expect(this.summary.warning).to.be.equal(3);
    });

  });

});