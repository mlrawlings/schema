var should = require('should')
  , sinon = require('sinon')
  , util = require('../lib/util')

describe('util', function() {
	describe('.isExistent()', function() {
		it('should return true for existent values', function() {
			util.isExistent('abc').should.be.true
			util.isExistent(/./).should.be.true
			util.isExistent([]).should.be.true
			util.isExistent({}).should.be.true
			util.isExistent(0).should.be.true
			util.isExistent(false).should.be.true
			util.isExistent(new Date()).should.be.true
		})
		it('should return false for non-existent values', function() {
			util.isExistent().should.be.false
			util.isExistent('').should.be.false
			util.isExistent(NaN).should.be.false
			util.isExistent(null).should.be.false
			util.isExistent(new Date('sdfg')).should.be.false
			util.isExistent(new Number('dsfgs')).should.be.false
		})
	})
})