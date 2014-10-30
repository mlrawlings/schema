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
var person = new Schema({
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

These two syntaxes may be mixed within the same schema definition.  The expanded syntax is required to specify additional [properties](#Properties) (instead of just types, array items, and object schemas) for a field.

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

## <a name="Properties"></a> Field Properties

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

**key** `String` *read-only*  
The key of the field. (eg. in the example above, the key for the person's first name would be `first`). 

**path** `String` *read-only*  
The path to the field. (eg. in the example above, the path for the person's first name would be `name.first`). 

**name** `String`  
The pretty/human-readable name of the field.  
Will be generated in Title Case automatically from the key if this property is not specified

**use** `Function`  
Field level plugins.  The plugin must match the function signature `function(field)` where field is the expanded field definition.  The plugin can then define additional field properties.  Plugins can "inherit" from another plugin by redefining field.use to another plugin function.

**type** `Function|Array`  
The constructor function for the type of the value.  May use javascript types or other constructor functions (`String`, `Number`, `Date`, `bson.ObjectID`, `Schema`, etc.) or an Array of constructor functions. May use the predefined type `Schema.Types.Any` which disables typechecking on the field. 

**default** `Schema.Types.Any`  
The default value for a field if no value is specfied.
The type of the default value must match the above **type**.

**required** `Boolean|Function`  
A Boolean or a Function that returns a Boolean indicating whether a value is required for this field.

**schema** `Schema`  
Required if **type** is Object.  Enforces the schema on the subkeys of this field.

**items** `Object`  
Required if **type** is Array.  Enforces the schema on all elements of the Array.

**validators** `Array`  
Array of custom validators. Validators must be functions matching the signature `function(value, field)`. A validator should `throw` if it fails, otherwise return.

### Custom Properties
The schema for a field is `dynamic`, meaning you can put any other properties into the field that are not defined above.  These properties can then be used by plugins and custom types.

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

### Constructor

### Static Properties

### Static Methods

### Instance Properties

### Instance Methods

#### use(plugin:Function[, options:Object])
#### add(plugin:Function[, options:Object])
#### discriminate(query:Object, definition:Object])
`schema.discriminate()` allows you to modify the schema based on the values of the object that you are validating.  For example, we can require a credit card number and cvv, but only if the purchase is being made by credit card.
```javascript
var purchase = new Schema({ amount:Number, payment:String })
purchase.descriminate({ payment:'credit' }, { 
    card:{ 
        number: { type:Number, required:true },
        cvv: { type:Number, required:true }
    }
})
purchase.descriminate({ payment:'check' }, { 
    check:{ 
        account: { type:Number, required:true },
        routing: { type:Number, required:true }
    }
})

purchase.validate({ amount:10.00, payment:'credit' })
// errors because card.number and card.cvv are required

purchase.validate({ amount:10.00, payment:'cash', card: { number:4716740357239704 })
// errors because card.number is not present in the base schema

purchase.validate({ amount:10.00, payment:'check', check:{ account:9900000003, routing:321174851 })
// looks good

```
##### Perhaps support [MongoDB Query Operators](http://docs.mongodb.org/manual/reference/operator/query/)?

discriminate on type:
```javascript
var schema = new Schema({ result:[Boolean|Function] })
schema.descriminate({ result:{ $type:Boolean } }, {
    additional:Number
})
```
discriminate on existance:
```javascript
var schema = new Schema({ result:String })
schema.descriminate({ result:{ $exists:true } }, {
    additional:Number
})
```

##### Allow discrimnated field modification?
```javascript
var person = new Schema({ 
    name: { 
        first:String, 
        middle:String, 
        last: { type:String, required:true } 
    }
})

person.descriminate({ 'name.middle': { $exists:false } }), {
    'name.first': { required:true }
})
```