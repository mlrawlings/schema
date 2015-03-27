# schema-js

`npm install schema-js`

## <a name="define"></a> Defining a Schema

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
    type: Object,
    properties: {
        name: { type:String },
        age: { type:Number },
        phones: { 
            type: Array, 
            items: { 
                type: Object, 
                properties: { 
                    number: { type:String }, 
                    mobile: { type:Boolean }
                })
            }
        }
    }
})
```

These two syntaxes may be mixed within the same schema definition.  The expanded syntax is required to specify additional [options](#options) (instead of just types, array items, and object properties) for a field.

## <a name="options"></a> Field Options

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

### List of Options  

**type** `Function|Array<Function>`  
The constructor function for the type of the value.  May use javascript types or other constructor functions (`String`, `Number`, `Date`, `bson.ObjectID`, `Schema`, etc.) or an Array of constructor functions. 

**default**   
The default value for a field if no value is specfied.
The type of the default value must match the above **type**.

**required** `Boolean|Object`  
If **type** is Object, an Array listing required properties.
If **type** is not Object, a Boolean indicating whether a value is required for this field. 

**properties** `Object`  
Required if **type** is Object.  Enforces the schema on the subkeys of this field.

**items** `Object`  
Required if **type** is Array.  Enforces the schema on all elements of the Array.

**validators** `Array<Function>`  
Array of custom validator functions matching the signature `function(value)`. A validator should `throw` if it fails, otherwise return.

## <a name="validate"></a> Validating an Object

```javascript
var schema = new Schema({ name:String, age:Number })

schema.validate({ name:'John Doe', age:27 })
//returns true

schema.validate({ name:'John Doe', age:'old' })
//errors because age is invalid. "old" is not a Number
```

## API

### `new Schema(definition)`

**definition**  
An object defining fields to be added to the schema.  See [Defining a Schema](#define) and [Field Options](#options).

### `schema.validate(value)`

**value**  
An value to check against the schema.  See [Validating an Object](#validate).

### `Schema.applyDefaults(value)`

**value**  
A value to which the defaults for the schema will be applied.

### `schema.extend(definition)`

**definition**  
An object defining fields to be added to the schema.  See [Defining a Schema](#define) and [Field Options](#options).

### `schema.extendWhen(query, definition)`

**query**  
An object defining a [MongoDB-like query](http://docs.mongodb.org/manual/reference/operator/query/).  Powered by [sift](https://github.com/crcn/sift.js). Supports the following operators: $in, $nin, $exists, $gte, $gt, $lte, $lt, $eq, $neq, $mod, $all, $and, $or, $nor, $not, $size, $type, $regex.  

**definition**  
An object defining fields to be added to the schema.  See [Defining a Schema](#define) and [Field Options](#options).

#### Example

`schema.extendWhen()` allows you to modify the schema based on the values of the object that you are validating.  For example, we can require a credit card number and cvv, but only if the purchase is being made by credit card.

```javascript
var purchase = new Schema({ amount:Number, payment:String })
purchase.extendWhen({ payment:'credit' }, { 
    card: { 
        number: { type:Number, required:true },
        cvv: { type:Number, required:true }
    }
})
purchase.extendWhen({ payment:'check' }, { 
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
// returns true

```

type:
```javascript
var schema = new Schema({ result:[Boolean|Function] })
schema.extendWhen({ result:{ $type:Boolean } }, {
    additional:Number
})
```
comparisons:
```javascript
var purchase = new Schema({ amount:Number })
purchase.extendWhen({ amount:{ $gt:0 } }, {
    payment: { type:String, required:true }
})
```

##### nested field modification
```javascript
var person = new Schema({ 
    name: { 
        first:String, 
        middle:String, 
        last: { type:String, required:true } 
    }
})

person.extendWhen({ 'name.middle': { $exists:false } }), {
    name: { 
        first:{ type:String, required:true }
    }
})
```