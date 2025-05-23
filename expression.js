/*
Fōrmulæ arithmetic package. Module for expression definition & visualization.
Copyright (C) 2015-2025 Laurence R. Ugalde

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

export class ArithmeticPackage extends Formulae.ExpressionPackage {};

const TAG_NUMBER = "Math.Number";

const Number = class extends Expression.NullaryExpression {
	getTag() { return TAG_NUMBER; }
	getName() { return ArithmeticPackage.messages.nameNumber; }
	
	//clone() {
	//	let cloned = super.clone();
	//	cloned.number = new Decimal(this.number);
	//	return cloned;
	//}
	
	format(str) {
		let localeInfo = Formulae.locales[Formulae.locale];
		let numeral = localeInfo[3];
		let spec = localeInfo[4];
		let dot = str.indexOf(".");
		
		if (dot < 0) { // integer
			return this.createGroups(this.translate(str, numeral), spec[0]);
		}
		else { // decimal
			return this.createGroups(this.translate(str.substr(0, dot), numeral), spec[0]) + spec[1] + this.translate(str.substr(dot + 1), numeral);
		}
	}
	
	createGroups(str, groupSeparator) {
		let groups = Math.floor((str.length - 1) / 3);
		let rest = ((str.length - 1) % 3) + 1;
		let output = str.substr(0, rest);
		
		for (let i = 0; i < groups; ++i) {
			output += groupSeparator + str.substr(3 * i + rest, 3);
		}
		
		return output;
	}
	
	translate(str, numeral) {
		if (numeral != "latn") {
			let arr = Array.from(str);
			for (let i = 0; i < arr.length; ++i) {
				arr[i] = arr[i].charCodeAt(0) + Formulae.numerals[numeral];
			}
			str = String.fromCharCode.apply(null, arr);
		}
		
		return str;
	}
	
	set(name, value) {
		if (name === "Value") {
			this.number = value;
			if (this.visualizationNumber !== undefined) {
				this.visualizationNumber = undefined;
			}
			return;
		}
			
		super.set(name, value);
	}
	
	get(name) {
		if (name === "Value") {
			return this.number;
		}
		
		return super.get(name);
	}
	
	getSerializationNames() {
		return [ "Value" ];
	}
	
	async getSerializationStrings() {
		//if (typeof this.number === "bigint") {
		if (this.number.constructor === BigInt) {
			return [ this.number.toString() ];
		}
		else { // Decimal
			if (this.number.isInteger()) {
				return [ this.number.toFixed() + "." ];
			}
			else {
				return [ this.number.toFixed() ];
			}
		}
	}
	
	setSerializationStrings(strings, promises) {
		if (!/^\d+(\.\d*)?$/.test(strings[0])) {
			throw "Invalid number";
		}
		
		if (strings[0].includes(".")) {
			this.set("Value", new Decimal(strings[0]));
		}
		else {
			this.set("Value", BigInt(strings[0]));
		}
	}
	
	restart() {
		delete this.visualizationNumber;
	}
	
	prepareDisplay(context) {
		if (this.visualizationNumber === undefined) {
			let s;
			
			//if (typeof this.number === "bigint") {
			if (this.number.constructor === BigInt) {
				s = this.number.toString();
			}
			else { // Decimal
				if (this.number.isInteger()) {
					s = this.number.toFixed() + ".0";
				}
				else {
					s = this.number.toFixed();
				}
			}
			
			this.visualizationNumber = this.format(s);
		}
		
		this.width = Math.ceil(context.measureText(this.visualizationNumber).width);
		this.height = context.fontInfo.size;
		this.vertBaseline = Math.round(this.width / 2);
		this.horzBaseline = Math.round(this.height / 2);
	}
	
	display(context, x, y) {
		super.drawText(context, this.visualizationNumber, x, y + this.height);
	}
	
	evaluate() {
		//return ( typeof this.number === "bigint" ) ? Number(this.number) : this.number.toNumber();
		return (this.number.constructor === BigInt) ? Number(this.number) : this.number.toNumber();
	}
}

const InternalNumber = class extends Expression.NullaryExpression {
	getTag() { return "Math.InternalNumber"; }
	getName() { return "Internal number"; }
	isInternalNumber() { return true; }
	//isReduced() { return this.reduced; }
	isReduced() { return true; }
	
	set(name, value) {
		if (name === "Value") {
			this.number = value;
			return;
		}
		
		super.set(name, value);
	}
	
	get(name) {
		if (name === "Value") {
			return this.number;
		}
		
		return super.get(name);
	}
	
	getSerializationNames() {
		throw "Internal number";
	}
	
	async getSerializationStrings() {
		throw "Internal number";
	}
	
	setSerializationStrings(strings, promises) {
		throw "Internal number";
	}
	
	prepareDisplay(context) {
		this.s = this.number.toInternalText();
		
		//if (this.number instanceof Arithmetic.Integer) {
		//	this.s = this.number.integer.toString()
		//}
		//else if (this.number instanceof Arithmetic.Decimal) {
		//	this.s = this.number.decimal.toFixed() + "."
		//}
		//else {
		//	this.s = this.number.numerator.toString() + "/" + this.number.denominator.toString(); 
		//}
		
		this.width = Math.ceil(context.measureText(this.s).width);
		this.height = context.fontInfo.size;
		this.vertBaseline = Math.round(this.width / 2);
		this.horzBaseline = Math.round(this.height / 2);
	}
	
	display(context, x, y) {
		context.strokeRect(x, y, this.width, this.height);
		super.drawText(context, this.s, x, y + this.height);
	}
	
	evaluate() {
		return this.number.toNative();
	}
}

const Negative = class extends Expression.UnaryExpression {
	getTag() { return "Math.Arithmetic.Negative"; }
	getName() { return ArithmeticPackage.messages.nameNegative; }
	parenthesesWhenSuperSubscripted() { return true; }
	
	prepareDisplay(context) {
		let child = this.children[0];
		child.prepareDisplay(context);
		
		this.width = Math.ceil(context.measureText("-").width) + Negative.SPACE;
		
		if (child.parenthesesAsOperator()) {
			this.width += 4;
			child.x = this.width;
			this.width += child.width + 4;
		}
		else {
			child.x = this.width;
			this.width += child.width;
		}
		
		child.y = 0;
		
		this.height = child.height;
		this.horzBaseline = child.horzBaseline;
		this.vertBaseline = child.x + child.vertBaseline;
	}
	
	display(context, x, y) {
		let child = this.children[0];
		
		super.drawText(context, "-", x, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
		
		if (child.parenthesesAsOperator()) {
			child.drawParenthesesAround(context, x + child.x, y + child.y);
		}
		
		child.display(context, x + child.x, y + child.y);
	}
	
	evaluate() {
		return -this.children[0].evaluate();
	}
}

Negative.SPACE = 2;

const Addition = class extends Expression.OperatorExpression {
	constructor() {
		super();
		
		this.plusWidth = 0;
		this.minusWidth = 0;
	}
	
	getTag() { return "Math.Arithmetic.Addition"; }
	getName() { return ArithmeticPackage.messages.nameAddition; }
	getChildName(index) { return ArithmeticPackage.messages.childAddition; }
	parenthesesAsOperator() { return true; }
	parenthesesWhenSuperSubscripted() { return true; }
	
	prepareDisplay(context) {
		this.horzBaseline = 0;
		this.width = 0;
		
		this.plusWidth = Math.round(context.measureText("+").width);
		this.minusWidth = Math.round(context.measureText("-").width);
		
		let maxSemiHeight = 0;
		
		let i, child;
		for (i = 0; i < this.children.length; ++i) {
			child = this.children[i];
			
			if (i > 0 && child.getTag() == "Math.Arithmetic.Negative") {
				let grandChild = child.children[0];
				
				grandChild.prepareDisplay(context);
				
				grandChild.x = this.minusWidth + 5;
				grandChild.y = 0;
				
				child.width = grandChild.x + grandChild.width;
				child.height = grandChild.height;
				child.horzBaseline = grandChild.horzBaseline;
				child.vertBaseline = grandChild.x + grandChild.vertBaseline;
				
				if (grandChild.parenthesesAsOperator()) {
					grandChild.x += 4;
					child.vertBaseline += 4;
					child.width += 4;
				}
				
				this.width += 5;
				child.x = this.width;
				this.width += child.width;
				
				if (grandChild.parenthesesAsOperator()) {
					this.width += 4;
				}					
			}
			else {
				if (child.parenthesesAsOperator()) {
					this.width += 4;
				}
				
				child.prepareDisplay(context);
				
				if (i > 0) {
					this.width += 5 + this.plusWidth + 5;
				}
				
				child.x = this.width;
				this.width += child.width;
				
				if (child.parenthesesAsOperator()) {
					this.width += 4;
				}
			}
			
			if (child.horzBaseline > this.horzBaseline) this.horzBaseline = child.horzBaseline;
			if (child.height - child.horzBaseline > maxSemiHeight) maxSemiHeight = child.height - child.horzBaseline;
		}
		
		for (i = 0; i < this.children.length; ++i) {
			child = this.children[i];
			child.y = this.horzBaseline - child.horzBaseline;
		}
		
		this.height = this.horzBaseline + maxSemiHeight;
		this.vertBaseline = Math.round(this.width / 2);
	}
	
	display(context, x, y) {
		let i, child, pos;
		
		for (i = 0; i < this.children.length; ++i) {
			child = this.children[i];
			if (i > 0 && child.getTag() == "Math.Arithmetic.Negative") {
				let grandChild = child.children[0];
				
				grandChild.display(context, x + child.x + grandChild.x, y + child.y);
				
				if (grandChild.parenthesesAsOperator()) {
					grandChild.drawParenthesesAround(context, x + child.x + grandChild.x, y + child.y + grandChild.y);
				}
				
				super.drawText(context, "-", x + child.x, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
			}
			else {
				pos = x + child.x;
				
				child.display(context, pos, y + child.y);
				
				if (child.parenthesesAsOperator()) {
					child.drawParenthesesAround(context, pos, y + child.y);
					pos -= 4;
				}
				
				if (i > 0) {
					super.drawText(context, "+", pos - 5 - this.plusWidth, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
				}
			}
		}
	}
	
	evaluate() {
		let value = 0;
		this.children.forEach(child => value += child.evaluate());
		return value;
	}
}

const Multiplication = class extends Expression.OperatorExpression {
	constructor() {
		super();
		this.symbolWidth = 0;
	}
	
	getTag() { return "Math.Arithmetic.Multiplication"; }
	getName() { return ArithmeticPackage.messages.nameMultiplication }
	getChildName(index) { return ArithmeticPackage.messages.childMultiplication; }
	parenthesesWhenSuperSubscripted() { return true; }
	
	prepareDisplay(context) {
		this.horzBaseline = 0;
		this.width = 0;
		
		this.symbolWidth = Math.round(context.measureText("×").width);
		
		let maxSemiHeight = 0;
		let isNumber, wasNumber = false;
		
		let i, child, parentheses;
		for (i = 0; i < this.children.length; ++i) {
			child = this.children[i];
			isNumber = child.getTag() === "Math.Number";
			
			parentheses =
				child.parenthesesAsOperator() ||
				child.getTag() == "Math.Arithmetic.Multiplication" ||
				child.getTag() == "Math.Arithmetic.Negative"
			;
			
			if (parentheses) {
				this.width += 4;
			}
			
			child.prepareDisplay(context);
			
			if (i > 0) {
				if (isNumber && wasNumber) {
					this.width += 5 + this.symbolWidth + 5;
				}
				else {
					this.width += 5;
				}
			}
			
			child.x = this.width;
			this.width += child.width;
			
			if (parentheses) {
				this.width += 4;
			}
			
			if (child.horzBaseline > this.horzBaseline) this.horzBaseline = child.horzBaseline;
			if (child.height - child.horzBaseline > maxSemiHeight) maxSemiHeight = child.height - child.horzBaseline;
			
			wasNumber = isNumber;
		}
		
		for (i = 0; i < this.children.length; ++i) {
			child = this.children[i];
			child.y = this.horzBaseline - child.horzBaseline;
		}
		
		this.height = this.horzBaseline + maxSemiHeight;
		this.vertBaseline = Math.round(this.width / 2);
	}
	
	display(context, x, y) {
		let i, child, pos, parentheses;
		let isNumber, wasNumber = false;
		
		for (i = 0; i < this.children.length; ++i) {
			child = this.children[i];
			isNumber = child.getTag() == "Math.Number";
			
			parentheses =
				child.parenthesesAsOperator() ||
				child.getTag() == "Math.Arithmetic.Multiplication" ||
				child.getTag() == "Math.Arithmetic.Negative"
			;
			
			pos = x + child.x;
			child.display(context, pos, y + child.y);
			
			if (parentheses) {
				child.drawParenthesesAround(context, pos, y + child.y);
				pos -= 4;
			}
			
			if (i > 0 && isNumber && wasNumber) {
				super.drawText(context, "×", pos - 5 - this.symbolWidth, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
			}
			
			wasNumber = isNumber;
		}
	}
	
	evaluate() {
		let value = 1;
		this.children.forEach(child => value *= child.evaluate());
		return value;
	}
}

const Division = class extends Expression.BinaryExpression {
	getTag() { return "Math.Arithmetic.Division"; }
	getName() { return ArithmeticPackage.messages.nameDivision; }
	getChildName(index) { return ArithmeticPackage.messages.childrenDivision[index]; }
	parenthesesWhenSuperSubscripted() { return true; }
	
	moveAcross(i, direction) {
		if (direction == Expression.UP) {
			if (i == 1) {
				return this.children[0].moveTo(Expression.UP);
			}
		}
		else if (direction == Expression.DOWN) {
			if (i == 0) {
				return this.children[1].moveTo(Expression.DOWN);
			}
		}
		
		return this.moveOut(direction);
	}
	
	moveTo(direction) {
		return this.children[direction == Expression.UP ? 1 : 0].moveTo(direction);
	}
	
	prepareDisplay(context) {
		let ch1 = this.children[0];
		let ch2 = this.children[1];
		
		ch1.prepareDisplay(context);
		ch2.prepareDisplay(context);
		
		this.width = 3 + Math.max(ch1.width, ch2.width) + 3;
		this.height = ch1.height + 3 + ch2.height;
		
		this.vertBaseline = Math.round(this.width / 2);
		this.horzBaseline = ch1.height + 2;
		
		ch1.x = this.vertBaseline - Math.round((ch1.width / 2));
		ch1.y = 0;
		
		ch2.x = this.vertBaseline - Math.round((ch2.width / 2));
		ch2.y = ch1.height + 3;
	}
	
	display(context, x, y) {
		let ch1 = this.children[0];
		let ch2 = this.children[1];
		
		ch1.display(context, x + ch1.x, y + ch1.y);
		ch2.display(context, x + ch2.x, y + ch2.y);
		
		context.beginPath();
		context.moveTo(x, y - 0.5 + this.horzBaseline);
		context.lineTo(x + this.width, y - 0.5 + this.horzBaseline);
		context.stroke();
	}
	
	evaluate() {
		return this.children[0].evaluate() / this.children[1].evaluate();
	}
}

const SquareRoot = class extends Expression.UnaryExpression {
	getTag() { return "Math.Arithmetic.SquareRoot"; }
	getName() { return ArithmeticPackage.messages.nameSquareRoot; }
	
	prepareDisplay(context) {
		let child = this.children[0];
		
		child.prepareDisplay(context);
		
		this.height = 3 + child.height;
		this.width = Math.ceil((this.height * 106 / 192) + 3 + child.width);
		
		child.x = this.width - child.width;
		child.y = 3;
		
		this.horzBaseline = child.y + child.horzBaseline;
		this.vertBaseline = this.width / 2;
	}
	
	display(context, x, y) {
		let child = this.children[0];
		
		let h = 3 + child.height;
		let w = h * 106 / 192;
		
		x += child.x - w - 3;
		y += child.y - 3;
		
		context.beginPath();
		context.moveTo (x,                       y + (h * 108 / 192)); // preventing obfuscation
		context.lineTo (x + (w * 29 / 106),      y + (h * 94  / 192)); // preventing obfuscation
		context.lineTo (x + (w * 76 / 106),      y + h              ); // preventing obfuscation
		context.lineTo (x + w,                   y                  ); // preventing obfuscation
		context.lineTo (x + w + 3 + child.width, y                  ); // preventing obfuscation
		context.stroke();
		
		child.display(context, Math.floor(x + child.x), Math.floor(y + child.y));
	}
	
	evaluate() {
		return Math.sqrt(this.children[0].evaluate());
	}
}

const AbsFloorCeiling = class extends Expression {
	getTag() {
		switch (this.type) {
			case 0: return "Math.Arithmetic.AbsoluteValue";
			case 1: return "Math.Arithmetic.Floor";
			case 2: return "Math.Arithmetic.Ceiling";
		}
	}
	
	getName() {
		switch (this.type) {
			case 0: return ArithmeticPackage.messages.nameAbsoluteValue;
			case 1: return ArithmeticPackage.messages.nameFloor;
			case 2: return ArithmeticPackage.messages.nameCeiling;
		}
	}
	
	getChildName(index) { return ArithmeticPackage.messages.childrenRoundingTruncation[index]; }
	
	canHaveChildren(count)  { return count == 1 || (this.type != 0 && count == 2); }
	
	prepareDisplay(context) {
		if (this.children.length > 1) {
			this.children[0].prepareDisplay(context);
			this.children[1].prepareDisplay(context);
			
			this.getMnemonic = this.type == 1 ? () => ArithmeticPackage.messages.mnemonicFloor : () => ArithmeticPackage.messages.mnemonicCeiling;
			this.prepareDisplayAsFunction(context);
			
			return;
		}
		
		let child = this.children[0];
		child.prepareDisplay(context);
		
		child.x = 3;
		child.y = 3;
		
		this.width = 3 + child.width + 3;
		this.height = 3 + child.height + 3;
		this.horzBaseline = child.horzBaseline + 3;
		this.vertBaseline = child.vertBaseline + 3;
	}
	
	display(context, x, y) {
		let child;
		
		if (this.children.length > 1) {
			child = this.children[0]; child.display(context, x + child.x, y + child.y);
			child = this.children[1]; child.display(context, x + child.x, y + child.y);
			this.displayAsFunction(context, x, y);
			return;
		}
		
		child = this.children[0];
		child.display(context, x + child.x, y + child.y);
		
		context.beginPath();
		
		if (this.type == 2) {
			context.moveTo (x + 3, y); // preventing obfuscation
			context.lineTo (x, y);     // preventing obfuscation
		}
		else {
			context.moveTo (x, y); // preventing obfuscation
		}
		context.lineTo(x, y + this.height);
		if (this.type == 1) context.lineTo(x + 3, y + this.height);
		
		if (this.type == 2) {
			context.moveTo (x + this.width - 3, y); // preventing obfuscation
			context.lineTo (x + this.width, y);     // preventing obfuscation
		}
		else {
			context.moveTo (x + this.width, y); // preventing obfuscation
		}
		context.lineTo(x + this.width, y + this.height);
		if (this.type == 1) context.lineTo(x + this.width - 3, y + this.height);
		
		context.stroke();
	}
}

const Factorial = class extends Expression.UnaryExpression {
	getTag() { return "Math.Arithmetic.Factorial"; }
	getName() { return ArithmeticPackage.messages.nameFactorial; }
	
	prepareDisplay(context) {
		let child = this.children[0];
		child.prepareDisplay(context);
		let parentheses = child.parenthesesAsOperator();
		this.exclamationWidth = Math.round(context.measureText("!").width);
		this.width = 0;
		if (parentheses) this.width += 4;
		child.x = this.width;
		this.vertBaseline = this.width;
		child.y = 0;
		this.width += child.width;
		this.vertBaseline += child.vertBaseline;
		if (parentheses) this.width += 4;
		this.width += 2 + this.exclamationWidth;
		this.height = child.height;
		this.horzBaseline = child.horzBaseline;
	}
	
	display(context, x, y) {
		let child = this.children[0];
		child.display(context, x + child.x, y);
		if (child.parenthesesAsOperator()) child.drawParenthesesAround(context, x + child.x, y + child.y);
		super.drawText(context, "!", x + this.width - this.exclamationWidth, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
	}
}

const Summation = class extends Expression.SummationLikeSymbol {
	constructor() {
		super();
		this.symbol = "Σ";
	}
	
	getTag() { return "Math.Arithmetic.Summation"; }
	getName() { return ArithmeticPackage.messages.nameSummation; }
	
	getChildName(index) {
		switch (index) {
			case 0: return ArithmeticPackage.messages.childSummation0;
			case 1: return ArithmeticPackage.messages.childSummationProduct1;
			case 2: return this.children.length == 3 ? ArithmeticPackage.messages.childSummationProduct23 : ArithmeticPackage.messages.childSummationProduct2X;
			case 3: return ArithmeticPackage.messages.childSummationProduct3;
			case 4: return ArithmeticPackage.messages.childSummationProduct4;
		}
	}
}

const Product = class extends Expression.SummationLikeSymbol {
	constructor() {
		super();
		this.symbol = "Π";
	}
	
	getTag() { return "Math.Arithmetic.Product"; }
	getName() { return ArithmeticPackage.messages.nameProduct; }
	
	getChildName(index) {
		switch (index) {
			case 0: return ArithmeticPackage.messages.childProduct0;
			case 1: return ArithmeticPackage.messages.childSummationProduct1;
			case 2: return this.children.length == 3 ? ArithmeticPackage.messages.childSummationProduct23 : ArithmeticPackage.messages.childSummationProduct2X;
			case 3: return ArithmeticPackage.messages.childSummationProduct3;
			case 4: return ArithmeticPackage.messages.childSummationProduct4;
		}
	}
}

const Piecewise = class extends Expression {
	getTag() { return "Math.Arithmetic.Piecewise"; }
	getName() { return "Piecewise"; }
	canHaveChildren(count) { return count >= 2; }
	
	prepareDisplay(context) {
		let child;
		let indent = 0;
		let child1, child2;
		
		this.width = 0;
		this.height = 0;
		
		let otherwise = null;
		
		if ((this.children.length % 2) != 0) {
			(otherwise = this.children[this.children.length - 1]).prepareDisplay(context);
			indent = otherwise.width;
		}
		
		// cases
		
		let cases = Math.floor(this.children.length / 2);
		
		for (let c = 0; c < cases; ++c) {
			(child1 = this.children[2 * c    ]).prepareDisplay(context);
			(child2 = this.children[2 * c + 1]).prepareDisplay(context);
			
			child1.x = 14;
			
			if (c > 0) this.height += 10;
			this.height += Math.max(child1.horzBaseline, child2.horzBaseline);
			child1.y = this.height - child1.horzBaseline;
			child2.y = this.height - child2.horzBaseline;
			this.height += Math.max(child1.height - child1.horzBaseline, child2.height - child2.horzBaseline);
			
			if (child1.width > indent) indent = child1.width;
		}
		
		indent = 14 + indent + 10 + Math.round(context.measureText("if").width) + 10;
		
		for (let c = 0; c < cases; ++c) {
			child2 = this.children[2 * c + 1];
			
			child2.x = indent;
			if (child2.x + child2.width > this.width) this.width = child2.x + child2.width;
		}
		
		// otherwise (if any)
		
		if (otherwise != null) {
			otherwise.x = 14;
			
			this.height += 10;
			otherwise.y = this.height;
			this.height += otherwise.height;
			
			let i = this.children[1].x - 10 - Math.round(context.measureText("if").width);
			let w = Math.round(context.measureText("otherwise").width);
			if (i + w > this.width) this.width = i + w;
		}
		
		// end
		
		this.horzBaseline = Math.round(this.height / 2);
		this.vertBaseline = Math.round(this.width / 2);
	}
	
	display(context, x, y) {
		// cases
		
		let child;
		let cases = Math.floor(this.children.length / 2);
		
		let indent = this.children[1].x - 10 - context.measureText("if").width;
		
		for (let c = 0; c < cases; ++c) {
			child = this.children[2 * c + 1];
			super.drawText(context, "if", x + indent, y + child.y + child.horzBaseline + context.fontInfo.semiHeight);
		}
		
		// otherwise (if any)
		
		if ((this.children.length % 2) != 0) {
			child = this.children[this.children.length - 1];
			super.drawText(context, "otherwise", x + indent, y + child.y + child.horzBaseline + context.fontInfo.semiHeight);
		}
		
		// subexpressions
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			child = this.children[i];
			child.display(context, x + child.x, y + child.y);
		}
		
		context.beginPath();
		context.moveTo(x + 4, y               );          //    .
		context.lineTo(x + 2, y + 2           );          //   /
		context.lineTo(x + 2, y + this.horzBaseline - 2); //   |
		context.lineTo(x,     y + this.horzBaseline    ); //  /
		context.lineTo(x + 2, y + this.horzBaseline + 2); //  \.
		context.lineTo(x + 2, y + this.height - 2  );     //   |
		context.lineTo(x + 4, y + this.height      );     //   \
		context.stroke();
	}
};

ArithmeticPackage.setExpressions = function(module) {
	Formulae.setExpression(module, "Math.Number",         Number);
	Formulae.setExpression(module, "Math.InternalNumber", InternalNumber);
	
	Formulae.setExpression(module, "Math.Arithmetic.Negative",       Negative);
	Formulae.setExpression(module, "Math.Arithmetic.Addition",       Addition);
	Formulae.setExpression(module, "Math.Arithmetic.Multiplication", Multiplication);
	Formulae.setExpression(module, "Math.Arithmetic.Division",       Division);
	Formulae.setExpression(module, "Math.Arithmetic.SquareRoot",     SquareRoot);
	Formulae.setExpression(module, "Math.Arithmetic.Factorial",      Factorial);
	Formulae.setExpression(module, "Math.Arithmetic.Summation",      Summation);
	Formulae.setExpression(module, "Math.Arithmetic.Product",        Product);
	Formulae.setExpression(module, "Math.Arithmetic.Piecewise",      Piecewise);
	
	// rounding operations
	
	Formulae.setExpression(module, "Math.Arithmetic.RoundToInteger", {
		clazz:        Expression.Function,
		getTag:       () => "Math.Arithmetic.RoundToInteger",
		getMnemonic:  () => ArithmeticPackage.messages.mnemonicRoundToInteger,
		getName:      () => ArithmeticPackage.messages.nameRoundToInteger,
		getChildName: index => ArithmeticPackage.messages.childrenRoundToInteger[index],
		max:          2
	});
	
	[ "RoundToPrecision", "RoundToDecimalPlaces", "RoundToMultiple"].forEach(tag =>
		Formulae.setExpression(module, "Math.Arithmetic." + tag, {
			clazz:        Expression.Function,
			getTag:       () => "Math.Arithmetic." + tag,
			getMnemonic:  () => ArithmeticPackage.messages["mnemonic" + tag],
			getName:      () => ArithmeticPackage.messages["name" + tag],
			getChildName: index => ArithmeticPackage.messages["children" + tag][index],
			min: 2, max: 3
		}
	));
	
	// rounding modes
	
	[
		            "TowardsZero",             "AwayFromZero",             "TowardsMinusInfinity",             "TowardsInfinity",
		"Nearest.HalfTowardsZero", "Nearest.HalfAwayFromZero", "Nearest.HalfTowardsMinusInfinity", "Nearest.HalfTowardsInfinity",
		"Nearest.HalfEven"
	].forEach(
		tag => Formulae.setExpression(module, "Math.Arithmetic.RoundingMode." + tag, {
			clazz   : Expression.LabelExpression,
			getTag  : () => "Math.Arithmetic.RoundingMode." + tag,
			getLabel: () => ArithmeticPackage.messages["labelRoundingMode" + tag],
			getName : () => "Rounding mode " + ArithmeticPackage.messages["labelRoundingMode" + tag]
		}
	));
	
	// absolute value, floor, ceiling
	
	[ "AbsoluteValue", "Floor", "Ceiling" ].forEach((tag, type) =>
		Formulae.setExpression(module, "Math.Arithmetic." + tag, {
			clazz: AbsFloorCeiling,
			type:  type
		}
	));
	
	// numeric
	Formulae.setExpression(module, "Math.Numeric", {
		clazz:        Expression.Function,
		getTag:       () => "Math.Numeric",
		getMnemonic:  () => ArithmeticPackage.messages.mnemonicNumeric,
		getName:      () => ArithmeticPackage.messages.nameNumeric,
		getChildName: index => ArithmeticPackage.messages.childrenNumeric[index],
		max:          2
	});
	
	Formulae.setExpression(module, "Math.N", {
		clazz:        Expression.Function,
		getTag:       () => "Math.N",
		getMnemonic:  () => ArithmeticPackage.messages.mnemonicN,
		getName:      () => ArithmeticPackage.messages.nameN,
		getChildName: index => ArithmeticPackage.messages.childrenN[index],
		max:          2
	});
	
	// numeric mode
	Formulae.setExpression(module, "Math.SetNumericMode", {
		clazz:       Expression.Function,
		getTag:      () => "Math.SetNumericMode",
		getMnemonic: () => ArithmeticPackage.messages.mnemonicSetNumericMode,
		getName:     () => ArithmeticPackage.messages.nameSetNumericMode,
		min: 0, max: 0
	});
	
	// with precision
	Formulae.setExpression(module, "Math.Arithmetic.WithPrecision", {
		clazz:        Expression.Function,
		getTag:       () => "Math.Arithmetic.WithPrecision",
		getMnemonic:  () => ArithmeticPackage.messages.mnemonicWithPrecision,
		getName:      () => ArithmeticPackage.messages.nameWithPrecision,
		getChildName: index => ArithmeticPackage.messages.childrenWithPrecision[index],
		min: 2, max: 2
	});
	
	// exponentiation
	Formulae.setExpression(module, "Math.Arithmetic.Exponentiation", {
		clazz:        Expression.Exponentiation,
		getTag:       () => "Math.Arithmetic.Exponentiation",
		getName:      () => ArithmeticPackage.messages.nameExponentiation,
		getChildName: index => ArithmeticPackage.messages.childrenExponentiation[index]
	});
	
	[ // literals
		[ "Math", "Infinity",  "∞" ],
	].forEach(row =>
		Formulae.setExpression(module, row[0] + "." + row[1], {
			clazz:      Expression.Literal,
			getTag:     () => row[0] + "." + row[1],
			getLiteral: () => row[2],
			getName:    () => ArithmeticPackage.messages["name" + row[1]],
		}
	));
	
	[ // constants
		[ "Math.Constant", "Pi",    "π" ],
		[ "Math.Constant", "Euler", "e" ],
	].forEach(row =>
		Formulae.setExpression(module, row[0] + "." + row[1], {
			clazz:      Expression.Literal,
			getTag:     () => row[0] + "." + row[1],
			getLiteral: () => row[2],
			getName:    () => ArithmeticPackage.messages["name" + row[1]],
			isReduced   () { return this.reduced; }
		}
	));
	
	// 0-parameter function
	[ "GetPrecision", "GetRoundingMode", "GetEuclideanDivisionMode" /*, "Random" */  ].forEach(tag => Formulae.setExpression(module, "Math.Arithmetic." + tag, {
		clazz:       Expression.Function,
		getTag:      () => "Math.Arithmetic." + tag,
		getMnemonic: () => ArithmeticPackage.messages["mnemonic" + tag],
		getName:     () => ArithmeticPackage.messages["name" + tag],
		min: 0, max: 0
	}));
	
	[ // 1-parameter function, no child name
		"SignificantDigits",    "SetPrecision", "SetRoundingMode", "SetEuclideanDivisionMode",
		"IntegerPart",  "FractionalPart", "DecimalPlaces",
		"Sign",         "Factors", "FactorsWithExponents", "Divisors", "ProperDivisors",
		"IsRealNumber", "IsRationalNumber", "IsNumeric", "IsIntegerValue", "IsInteger", "IsDecimal", "IsPositiveNumber", "IsNegativeNumber", "IsNumberZero",
		"IsEven",       "IsOdd",            "IsPrime",
		"ToInteger",    "ToIfInteger",
	].forEach(tag => Formulae.setExpression(module, "Math.Arithmetic." + tag, {
		clazz:       Expression.Function,
		getTag:      () => "Math.Arithmetic." + tag,
		getMnemonic: () => ArithmeticPackage.messages["mnemonic" + tag],
		getName:     () => ArithmeticPackage.messages["name" + tag]
	}));
	
	Formulae.setExpression(module, "Math.Arithmetic.ToDecimal", {
		clazz:        Expression.Function,
		getTag:       () => "Math.Arithmetic.ToDecimal",
		getMnemonic:  () => ArithmeticPackage.messages.mnemonicToDecimal,
		getName:      () => ArithmeticPackage.messages.nameToDecimal,
		getChildName: index => ArithmeticPackage.messages.childrenToDecimal[index],
		max:          2
	});
	
	// truncationg & rounding
	[ "Truncate", "Round" ].forEach(tag => Formulae.setExpression(module, "Math.Arithmetic." + tag, {
		clazz:        Expression.Function,
		getTag:       () => "Math.Arithmetic." + tag,
		getMnemonic:  () => ArithmeticPackage.messages["mnemonic" + tag],
		getName:      () => ArithmeticPackage.messages["name" + tag],
		getChildName: index => ArithmeticPackage.messages.childrenRoundingTruncation[index],
		max: 2
	}));
	
	[ // functions
		[ "Rationalize",                  1, 2 ],
		[ "Digits",                       1, 3 ],
		[ "Random",                       0, 1 ],
		[ "RandomInRange",                2, 2 ],
		[ "ToNumber",                     1, 2 ],
		[ "ModularExponentiation",        3, 3 ],
		[ "ModularMultiplicativeInverse", 2, 2 ],
	].forEach(row => Formulae.setExpression(module, "Math.Arithmetic." + row[0], {
		clazz:        Expression.Function,
		getTag:       () => "Math.Arithmetic." + row[0],
		getMnemonic:  () => ArithmeticPackage.messages["mnemonic" + row[0]],
		getName:      () => ArithmeticPackage.messages["name" + row[0]],
		getChildName: index => ArithmeticPackage.messages["children" + row[0]][index],
		min:          row[1],
		max:          row[2]
	}));
	
	[ // divisibility
		[ "Divides",       "∣" ],
		[ "DoesNotDivide", "∤" ]
	].forEach(row => Formulae.setExpression(module,"Math.Arithmetic." + row[0], {
		clazz:        Expression.Infix,
		getTag:       () => "Math.Arithmetic." + row[0],
		getOperator:  () => row[1],
		getName:      () => ArithmeticPackage.messages["name" + row[0]],
		getChildName: index => ArithmeticPackage.messages.childrenDivision[1 - index],
		min: 2, max: 2
	}));
	
	// euclidean division
	[ "Div", "Mod", "DivMod" ].forEach(tag => Formulae.setExpression(module, "Math.Arithmetic." + tag, {
		clazz:        Expression.Infix,
		getTag:       () => "Math.Arithmetic." + tag,
		getOperator:  () => ArithmeticPackage.messages["operator" + tag],
		getName:      () => ArithmeticPackage.messages["name" + tag],
		getChildName: index => ArithmeticPackage.messages.childrenDivisions[index],
		min: 2, max: 2
	}));
	
	Formulae.setExpression(module, "Math.Arithmetic.EuclideanMode", {
		clazz   : Expression.LabelExpression,
		getTag  : () => "Math.Arithmetic.EuclideanMode",
		getLabel: () => ArithmeticPackage.messages["labelEuclideanMode"],
		getName : () => ArithmeticPackage.messages["labelEuclideanMode"]
	});
	
	// GCD, LCM
	[ "GreatestCommonDivisor", "LeastCommonMultiple" ].forEach(tag => Formulae.setExpression(module, "Math.Arithmetic." + tag, {
		clazz:      Expression.PrefixedLiteral,
		getTag:     () => "Math.Arithmetic." + tag,
		getLiteral: () => ArithmeticPackage.messages["literal" + tag],
		getName:    () => ArithmeticPackage.messages["name" + tag]
	}));
	
	// transcendental functions
	[ "DecimalLogarithm", "NaturalLogarithm", "BinaryLogarithm" ].forEach(tag => Formulae.setExpression(module, "Math.Transcendental." + tag, {
		clazz:        Expression.Function,
		getTag:       () => "Math.Transcendental." + tag,
		getMnemonic:  () => ArithmeticPackage.messages["mnemonic" + tag],
		getName:      () => ArithmeticPackage.messages["name" + tag]
	}));
	
	// general logarithm
	Formulae.setExpression(module, "Math.Transcendental.Logarithm", {
		clazz:        Expression.Function,
		getTag:       () => "Math.Transcendental.Logarithm",
		getMnemonic:  () => ArithmeticPackage.messages.mnemonicLogarithm,
		getName:      () => ArithmeticPackage.messages.nameLogarithm,
		getChildName: index => ArithmeticPackage.messages.childrenLogarithm[index],
		min: 2, max: 2
	});
	
	// trigonometric & hyperbolic functions
	[ "Trigonometric", "Hyperbolic" ].forEach(type => {
		[
			"Sine",    "Cosine",    "Tangent",    "Cotangent",    "Secant",    "Cosecant",
			"ArcSine", "ArcCosine", "ArcTangent", "ArcCotangent", "ArcSecant", "ArcCosecant"
		].forEach(fun => Formulae.setExpression(module, "Math." + type + "." + fun, {
			clazz:       Expression.Function,
			getTag:      () => "Math." + type + "." + fun,
			getMnemonic: () => ArithmeticPackage.messages["mnemonic" + type.charAt(0) + fun],
			getName:     () => ArithmeticPackage.messages["name" + type.charAt(0) + fun]
		}))
	});
	
	// atan2
	Formulae.setExpression(module, "Math.Trigonometric.ArcTangent2", {
		clazz:        Expression.Function,
		getTag:       () => "Math.Trigonometric.ArcTangent2",
		getMnemonic:  () => ArithmeticPackage.messages.mnemonicArcTangent2,
		getName:      () => ArithmeticPackage.messages.nameArcTangent2,
		getChildName: index => ArithmeticPackage.messages.childrenArcTangent2[index],
		min:          2,
		max:          2
	});
};

