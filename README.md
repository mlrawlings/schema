# Schema.js

## Defining a Schema

*Condensed Syntax*

```javascript
var schema = new Schema({
	name:String,
    age:Number,
    phones:[{ number:String, mobile:Boolean }]
})
```

*Explicit Syntax*

```javascript
var schema = new Schema({
	name:{ type:String },
    age: { type:Number },
    phones:{ 
    	type:Array, 
        items: { 
        	type:Object, 
            schema:new Schema({ number:String, mobile:Boolean }) //note: subschema is in condensed syntax
        }
    }
})
```

These two syntaxes may be mixed within the same schema definition.  The expanded syntax is required to specify additional [properties](#Properties) (instead of just types, array items, and object schemas) for a key.

## Validating an Object

```javascript
var schema = new Schema({ name:String, age:Number })

schema.validate({ name:'John Doe', age:27 })
//returns { result:true }

schema.validate({ name:'John Doe', age:'old' })
//returns { result:false, errors:[new Error('Age is invalid. "old" is not a Number')] }

schema.validateField({ name:'Jane Doe', age:'young' }, 'name')
//returns { result:true }

schema.validateField({ name:'Jane Doe', age:'young' }, 'age')
//returns { result:false, error:new Error('Age is invalid. "young" is not a Number') }
```

## <a name="Properties"></a>Properties

### Example

```javascript
new Schema({
	name: {
    	first: { type:String, name:'First Name', required:true },
        last: { type:String, name:'Last Name', required:true }
    },
    age: { type:Number, default:18 }
})
```

### Built-in Properties

**name** `String`  
The pretty/human-readable name of the key.  
Will be generated in Title Case automatically from the key if this property is not specified

**type** `Function|Array`  
The constructor function for the type of the value.  May use javascript types or custom constructor functions (`String`, `Number`, `Date`, `bson.ObjectID`, `Schema`, etc.). May use `Schema.AnyType` to disable typechecking on the key. 

**default** `Schema.AnyType`  
The default value for a key if no value is specfied.
The type of the default value must match the above **type**.

**required** `Boolean|Function`  
The default value for a key if no value is specfied.
The type of the default value must match the above **type**.

**schema** `Schema`  
The default value for a key if no value is specfied.
The type of the default value must match the above **type**.

**items** `Object`  
The default value for a key if no value is specfied.
The type of the default value must match the above **type**.

**validators** `Array`  
Custom functions to validate the key. Read more in the section entitled **[Validators](#Validators)**.

### Custom Properties


## <a name="Validators"></a>Validators
Must match the function signature `function(value, object, key, name)`.

## Coercers

Types are automatically coerced into their defined types when possible.  This is done by passing the given value to the constructor for the defined type.  By default, only string values are passed.

```javascript
var data = { count:'10', when:'2014-01-01' }
  , schema = new Schema({ count:Number, when:Date })
  
schema.validate(data)
console.log(data)
//output: { count:10, when:2014-01-01T00:00:00.000Z }
```

You may also specify custom coercion functions on `Schema.coercers`.  This is an object in which each key is a construtor function, and each value is a coercion function matching the function signature `function(value)`.  The coercion function returns the coerced value or throws an error if it cannot coerce the value. 

## API
