var util = exports

util.isObject = function(object) {
	return object && typeof object == 'object' && Object.getPrototypeOf(object) == Object.prototype
}

util.isArray = function(array) {
	return Array.isArray(array)
}

util.isExistent = function(value) {
	var undefined
	return value !== '' && value !== undefined && value !== null && !isNaN(value)
}

util.contains = function(list, value) {
	return list.indexOf(value) != -1
}

util.titleCase = function(str) {
	var out = str.replace(/^\s*/, '')
	out = out.replace(/^[a-z]|[^\s][A-Z]|_[a-z]/g, function(str, offset) {
		if(offset == 0) return(str.toUpperCase())
		return (str.substr(0,1) + ' ' + str.substr(1).toUpperCase())
	})
	return(out.replace(/_*/g, ''))
}

util.typeMatch = function(instance, constructor) {
	return instance.constructor == constructor || (util.isArray(constructor) && util.contains(constructor, instance.constructor))
}

util.isValidType = function(type) {
	return type instanceof Function || (util.isArray(type) && type.every(function(type) {
		return type instanceof Function
	}))
}