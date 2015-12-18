var someObj = {
  someMethod1: function () {},
  someMethod2: function () {},
  someMethod3: function () {},
  someMethod4: function () {}
};

describe('Scope', function () {

  describe('Subscope 1', function () {

    beforeEach(function () {
      sinon.stub(someObj, 'someMethod1');
      sinon.spy(someObj, 'someMethod2');
    });

    afterEach(function () {
      someObj.someMethod1.restore();
      someObj.someMethod2.restore();
    });

    // `it` with empty title
    it('', function () {
      expect(true).to.be.ok;
    });

    it('normat it', function () {
      expect(1).to.be.equal(1);
    });

    it('stub in the `it`', function () {
      sinon.stub(someObj, 'someMethod3');
    });

    it('restore in the `it`', function () {
      someObj.someMethod3.restore();
    });

    it('spy in the `it`', function () {
      someObj.someMethod4.restore();
    });

    // mixing empty title and `stub` usage
    it('', function () {
      sinon.stub(someObj, 'someMethod3');
    });

  });

  describe('Subscope 2', function () {

    it('two many expects in the `it`', function () {
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
      expect(1).to.be.equal(1);
    });

  });

  describe('Subscope 3', function () {
    it('normal it', function () {
      expect(1).to.be.equal(1);
    });
  });

});


describe('Scope 2',function () {

  it('normal `it`', function () {
    expect(1).to.be.equal(1);
  });

});