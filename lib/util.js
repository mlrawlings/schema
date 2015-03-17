var util = exports

util.isNull = function(value) {
	return value == null
}

util.isNaN = function(value) {
	return isNaN(value) && (value.constructor == Number || value.constructor == Date)
}

util.isUndefined = function(value) {
	var undefined
	return value === undefined
}

util.isMatchConstr = function(value, Constructor) {
	return value.constructor == Constructor
}

util.isEmptyStr = function(value) {
	return value === ''
}

util.is = function(value, Constructor) {
	return (util.isNull(value) || util.isNaN(value) || util.isUndefined(value) || !util.isMatchConstr(value, Constructor)) ? false : true

	// return value !== undefined && value !== null && value.constructor == Constructor
}

util.isAny = function(value, constructors) {
	var is = false
	constructors.forEach(function(constructor) {
		is = is || util.is(value, constructor)
	})
	return is
}

util.isObject = function(object) {
	return util.is(object, Object)
}

util.isFunction = function(func) {
	return util.is(func, Function)
}

util.isArray = function(array) {
	return util.is(array, Array)
}

util.isExistent = function(value) {
	return !util.isNull(value) && !util.isNaN(value) && !util.isUndefined(value) && !util.isEmptyStr(value)
	// return value !== '' && value !== undefined && value !== null && (!isNaN(value) || (value.constructor != Number && value.constructor != Date))
}

util.typeMatch = function(value, constructor) {
	return util.isArray(constructor) ? util.isAny(value, constructor) : util.is(value, constructor)
}

util.traverse = function(fn, value, key) {
	if(value.constructor == Object) {
		var result = fn(value, key)
		if(result == value) {
			result = {}
			Object.keys(value).forEach(function(key) {
				result[key] = util.traverse(fn, value[key], key)
			})
		}
		return result 
	} else if(value.constructor == Array) {
		return value.map(function(val) {
			return util.traverse(fn, val)
		})
	}
	return fn(value, key)
}