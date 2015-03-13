'use strict'

var clone = require('clone')
  , log = false

module.exports = function createMerger(options) {
	options = options || {}
	options.inPlace = options.inPlace !== undefined ? options.inPlace : true
	options.deep = options.deep !== undefined ? options.deep : true
	options.array = options.array !== undefined ? options.array : 'replace'
	options.priority = options.priority !== undefined ? options.priority : 'right'
	options.circular = options.circular !== undefined ? options.circular : false

	return function merger(/*a, b, c, d, ...*/) {
		try{ log = arguments[0].required[0] == 'name' &&  arguments[1].required[0] == 'age' }
		catch(e) { log = false }
		
		if(arguments.length == 1) 
			return arguments[0]

		var value = options.inPlace ? arguments[0] : clone(arguments[0])

		for(var i = 1, len = arguments.length; i < len; i++) {
			merge(value, arguments[i], 0)
		}

		return value
	}

	function merge(a, b, level) {
		if(a === undefined) return b
		if(b === undefined) return a

		if(level == 0 || (isObject(a) && isObject(b) && options.deep)) {
			Object.keys(b).forEach(function(key) {
				a[key] = merge(a[key], b[key], ++level) 
			})
			return a
		}

		if(isArray(a) && isArray(b)) {
			if(options.array == 'merge') {
				for(var i = 0, len = Math.max(a.length, b.length); i < len; i++) {
					a[i] = merge(a[i], b[i], ++level)
				}
				return a
			}
			if(options.array == 'concat') {
				b.forEach(function(val) {
					a.push(val)
				})
				return a
			}
			//options.array == 'replace'
		}

		if(options.priority == 'left') return a
		else return b //options.priority == 'right'
	}

	function isObject(value) {
		return value && value.constructor === Object
	}

	function isArray(value) {
		return Array.isArray(value)
	}
}