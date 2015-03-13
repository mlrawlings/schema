var merger = require('../lib/merger')

describe('merger', function() {
	describe('default', function() {
		var merge = merger() 
		it('should merge objects', function() {
			merge({ a:1 }, { b:2 }, { c:3 }).should.eql({ a:1, b:2, c:3 })
		})
	})
	describe('deep:true', function() {
		var merge = merger({ deep:true })
		it('should merge deeply', function() {
			merge({ a:{ b:{ c:1 } } }, { a:{ b:{ d:2 } } }).should.eql({ a:{ b:{ c:1, d:2 } } })
		})
	})
	describe('deep:false', function() {
		var merge = merger({ deep:false })
		it('should merge shallowly', function() {
			merge({ a:{ b:{ c:1 } } }, { a:{ b:{ d:2 } } }).should.eql({ a:{ b:{ d:2 } } })
		})
	})
	describe('array:concat', function() {
		var merge = merger({ array:'concat' })
		it('should concat arrays', function() {
			merge({ a:[1,2,3] }, { a:[4,5,6] }).should.eql({ a:[1,2,3,4,5,6] })
		})
	})
	describe('array:replace', function() {
		var merge = merger({ array:'replace' })
		it('should replace arrays', function() {
			merge({ a:[1,2,3] }, { a:[4,5,6] }).should.eql({ a:[4,5,6] })
		})
	})
	describe('array:merge', function() {
		var merge = merger({ array:'merge' })
		it('should merge arrays', function() {
			merge({ a:[{ b:1 }, { b:2 }] }, { a:[{ c:3 }, { b:3 }] }).should.eql({ a:[{ b:1, c:3 }, { b:3 }] })
		})
	})
	describe('priority:right', function() {
		var merge = merger({ priority:'right' })
		it('should give priority to the right-most object', function() {
			merge({ a:1 }, { a:2 }).should.eql({ a:2 })
		})
	})
	describe('priority:left', function() {
		var merge = merger({ priority:'left' })
		it('should give priority to the left-most object', function() {
			merge({ a:1 }, { a:2 }).should.eql({ a:1 })
		})
	})
	describe('inPlace:true', function() {
		var merge = merger({ inPlace:true })
		it('should modify the object in place', function() {
			var a = { a:1 }, b = { b:1 }
			merge(a, b).should.equal(a)
		})
	})
	describe('inPlace:false', function() {
		var merge = merger({ inPlace:false })
		it('should merge into a new object', function() {
			var a = { a:1 }, b = { b:1 }
			merge(a, b).should.not.equal(a)
			a.should.eql({ a:1 })
		})
	})
})